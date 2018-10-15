var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var ObjectId = require('mongodb').ObjectID;
var util = require('util');

var LOG = require("../lib/services/Logger");
var parserFactory = require("../lib/services/ParserFactory");
var SessionFactory = require('../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();

// TODO Add check for elasticsearch server is running
var elastic = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200',
    log: 'error'
});;

LOG.info(util.format('[STATUS] [OK] Initializing indexes'));

elastic.indices.exists({
        index: 'salestracker'
    })
    .then(function (exists) {
        if (!exists) {
            return elastic.indices.create({
                index: 'salestracker'
            });
        }
    })
    .then(function () {
        return elastic.indices.putMapping({
            index: 'salestracker',
            type: "offers",
            body: {
              properties: {
                origin_href: {
                  type: "keyword",
                }
              }
            }
        });
    })
    .then(function () {
        LOG.info(util.format('[STATUS] [OK] Initializing indexes succeeded'));

        worker.process('processData', 10, function (job, done) {
            var data = job.data;

            var parser = parserFactory.getParser(data.site);
            var translations = parser.compileTranslations(data);

            if (!data.origin_href && parser.config.languages[data.language].main) {
                var offer = parser.compileOffer(data);
                offer.translations = translations;
                offer.origin_href = data.href;

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

                    _.each(_.keys(parser.config.languages), function (language) {
                        if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                            return;
                        }

                        worker.create('processOffer', {
                                'site': data.site,
                                'language': language,
                                'href': parser.compileOfferHref(data.href, language),
                                'origin_href': offer.origin_href
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

                    delete offer._id;
                    delete offer.pictures;

                    elastic.index({
                        index: 'salestracker',
                        type: 'offers',
                        body: offer
                    }, function (err, resp) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Indexing offer failed', data.site, data.id, err));
                            return done(err);
                        }

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

                        LOG.info(util.format('[STATUS] [OK] [%s] Offer indexed %s', data.site, data.href));
                        return done(null, resp);
                    });
                });
            } else if (data.origin_href) {
                SessionFactory.getDbConnection().offers.findOne({
                    origin_href: data.origin_href
                }, function (err, offer) {
                    if (err) {
                        LOG.error(util.format('[STATUS] [Failure] Checking offer failed', err));
                        return done(err);
                    }

                    if (!offer) {
                        // TODO Mark somehow failed offer and re-run harvesting
                        LOG.error(util.format('[STATUS] [Failure] Checking offer failed. Offer not found %', data.origin_href));
                        return done(new Error('Offer not found for update: ' + data.origin_href));
                    }

                    SessionFactory.getDbConnection().offers.update({
                        origin_href: data.origin_href
                    }, {
                        $set: {
                            translations: _.extend(offer.translations, translations)
                        }
                    }, function (err) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Updating offer failed', data.site, data.href, err));
                            return done(err);
                        }

                        elastic.deleteByQuery({
                            index: 'salestracker',
                            type: 'offers',
                            body: {
                                query: {
                                    term: {
                                        origin_href: data.origin_href
                                    }
                                }
                            }
                        }, function (err) {
                            if (err) {
                                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Deleting offer index failed', data.site, data.href, err));
                                return done(err);
                            }

                            offer.translations = _.extend(offer.translations, translations);

                            LOG.info(util.format('[STATUS] [OK] [%s] Offer index deleted %s', data.site, data.href));

                            delete offer._id;
                            delete offer.pictures;

                            elastic.index({
                                index: 'salestracker',
                                type: 'offers',
                                body: offer
                            }, function (err, resp) {
                                if (err) {
                                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Offer index update failed', data.site, data.id, err));
                                    return done(err);
                                }

                                LOG.info(util.format('[STATUS] [OK] [%s] Offer index updated %s', data.site, data.href));
                                return done(null, resp);
                            });
                        });
                    });
                });
            }
        });
    })
    .catch(function (err) {
        LOG.error(util.format('[STATUS] [Failure] Initializing indexes failed', err));
    });