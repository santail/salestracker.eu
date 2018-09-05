var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var url = require('url');
var util = require('util');

var LOG = require("../lib/services/Logger");
var SessionFactory = require('../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();

var elastic = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200',
    log: 'error'
});;

LOG.info(util.format('[STATUS] [OK] [%s] Initializing indexes'));

elastic.indices.create({
    index: 'salestracker'
}, function (err, resp, status) {
    if (err) {
        LOG.error(util.format('[STATUS] [Failure] Initializing indexes failed', err));
    } else {
        LOG.info(util.format('[STATUS] [OK] Initializing indexes succeeded', resp, status));
    }
});

var languages = {
    'est': {
        'exists': true,
        'main': true
    },
    'eng': {
        'exists': false
    },
    'rus': {
        'exists': true,
        'compiler': function (originalUrl) {
            var parsedUrl = url.parse(originalUrl);
            parsedUrl.pathname = parsedUrl.pathname.replace(/^\/ee\//gi, "/ru/");

            return url.format(parsedUrl);
        }
    }
};

worker.process('processData', 10, function (job, done) {
    var offer = job.data;

    SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(err);
        }

        if (!saved) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(new Error('DB save query failed'));
        }

        if (languages[offer.language].main) {
            if (offer.pictures && offer.pictures.length > 0) {
                worker.create('processImage', {
                        'site': offer.site,
                        'offerUrl': offer.url,
                        'url': offer.pictures[0]
                    })
                    .attempts(3).backoff({
                        delay: 60 * 1000,
                        type: 'exponential'
                    })
                    .removeOnComplete(true)
                    .save(function (err) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [FAILED] [%s] %s Image processing schedule failed', offer.site, offer.url, err));
                        }

                        LOG.debug(util.format('[STATUS] [OK] [%s] %s Image processing scheduled', offer.site, offer.url));
                    });
            }

            _.each(_.keys(languages), function (language) {
                if (languages[language].main || !languages[language].exists) {
                    return;
                }

                worker.create('processOffer', {
                        'site': offer.site,
                        'language': language,
                        'url': compileOfferUrl(language, offer.url)
                    })
                    .attempts(3).backoff({
                        delay: 60 * 1000,
                        type: 'exponential'
                    })
                    .removeOnComplete(true)
                    .save(function (err) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', offer.site, offer.url, err));
                        }

                        LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', offer.site, offer.url));
                    });
            });
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Offer saved %s', offer.site, offer.url));

        delete offer._id;
        delete offer.pictures;

        elastic.index({
            index: 'salestracker',
            type: 'offers',
            body: offer
        }, function (err, resp) {
            if (err) {
                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Indexing offer failed', offer.site, offer.id, err));
                return done(err);
            }

            LOG.info(util.format('[STATUS] [OK] [%s] Offer indexed %s', offer.site, offer.url));
            return done(null, resp);
        });
    });
});

var compileOfferUrl = function (language, url) {
    var compiler = languages[language].compiler;
    return compiler(url);
};