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
    var data = job.data;

    var parser = parserFactory.getParser(data.site);

    if (parser.config.languages[data.language].main) {
        var offer = parser.compileTranslations(data);

        SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
            if (err) {
                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', data.site, data.id, err));
                return done(err);
            }

            if (!saved) {
                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', data.site, data.id, err));
                return done(new Error('DB save query failed'));
            }

            LOG.info(util.format('[STATUS] [OK] [%s] Offer saved %s', data.site, data.href));

            delete data._id;
            delete data.pictures;

            elastic.index({
                index: 'salestracker',
                type: 'offers',
                body: data
            }, function (err, resp) {
                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Indexing offer failed', data.site, data.id, err));
                    return done(err);
                }

                LOG.info(util.format('[STATUS] [OK] [%s] Offer indexed %s', data.site, data.href));
                return done(null, resp);
            });
        });

        if (data.pictures && data.pictures.length > 0) {
            worker.create('processImage', {
                    'site': data.site,
                    'offerHref': data.href,
                    'href': data.pictures[0]
                })
                .attempts(3).backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[STATUS] [FAILED] [%s] %s Image processing schedule failed', data.site, data.href, err));
                    }

                    LOG.debug(util.format('[STATUS] [OK] [%s] %s Image processing scheduled', data.site, data.href));
                });
        }

        _.each(_.keys(parser.config.languages), function (language) {
            if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                return;
            }

            worker.create('processOffer', {
                    'site': data.site,
                    'language': language,
                    'href': parser.compileOfferHref(data.href, language)
                })
                .attempts(3).backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', data.site, data.href, err));
                    }

                    LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', data.site, data.href));
                });
        });
    }
});