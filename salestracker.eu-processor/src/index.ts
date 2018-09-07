var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var util = require('util');

var LOG = require("../lib/services/Logger");
var parserFactory = require("../lib/services/ParserFactory");
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

worker.process('processData', 10, function (job, done) {
    var offer = job.data;

    var parser = parserFactory.getParser(offer.site);

    SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(err);
        }

        if (!saved) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(new Error('DB save query failed'));
        }

        if (parser.config.languages[offer.language].main) {
            if (offer.pictures && offer.pictures.length > 0) {
                worker.create('processImage', {
                        'site': offer.site,
                        'offerHref': offer.href,
                        'href': offer.pictures[0]
                    })
                    .attempts(3).backoff({
                        delay: 60 * 1000,
                        type: 'exponential'
                    })
                    .removeOnComplete(true)
                    .save(function (err) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [FAILED] [%s] %s Image processing schedule failed', offer.site, offer.href, err));
                        }

                        LOG.debug(util.format('[STATUS] [OK] [%s] %s Image processing scheduled', offer.site, offer.href));
                    });
            }

            _.each(_.keys(parser.config.languages), function (language) {
                if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                    return;
                }

                worker.create('processOffer', {
                        'site': offer.site,
                        'language': language,
                        'href': parser.compileOfferHref(offer.href, language)
                    })
                    .attempts(3).backoff({
                        delay: 60 * 1000,
                        type: 'exponential'
                    })
                    .removeOnComplete(true)
                    .save(function (err) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', offer.site, offer.href, err));
                        }

                        LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', offer.site, offer.href));
                    });
            });
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Offer saved %s', offer.site, offer.href));

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

            LOG.info(util.format('[STATUS] [OK] [%s] Offer indexed %s', offer.site, offer.href));
            return done(null, resp);
        });
    });
});
