var _ = require('lodash');
var ObjectId = require('mongodb').ObjectID;
var path = require('path');
var slugify = require('slugify');
import { URL } from 'url';
var util = require('util');

var LOG = require("../lib/services/Logger");
var parserFactory = require("../lib/services/ParserFactory");
var SessionFactory = require('../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();
var elastic = SessionFactory.getElasticsearchConnection();

elastic.ping({ // test
    requestTimeout: Infinity
}, function (err) {
    if (err) {
        console.trace('elasticsearch cluster is down!');
    } else {
        console.log('Connected');

        elastic.indices.exists({
                index: 'salestracker'
            })
            .then(function (exists) {
                if (!exists) {
                    LOG.info(util.format('[STATUS] [OK] Initializing indexes'));

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
                            "price": {
                                "type": "scaled_float",
                                "scaling_factor": 100
                            },
                            "origin_href": {
                                "type": "keyword",
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

                        // should not process pictures if development environment and switched off
                        var shouldProcessPictures = process.env.NODE_ENV !== 'development' || process.env.SHOULD_HARVEST_PICTURES !== 'false';
                        if (data.pictures && data.pictures.length > 0) {
                            var pictures: string[] = [];

                            _.each(data.pictures, function (picture) {
                                if (shouldProcessPictures) {
                                    worker.create('processImage', {
                                            'site': data.site,
                                            'offerHref': data.href,
                                            'href': picture
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

                                const offerHref = new URL(data.href);
                                picture = path.join(data.site + '/' + slugify(offerHref.pathname), path.basename(picture));

                                pictures.push(picture)
                            });

                            offer.pictures = pictures;
                        }

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
    }
});