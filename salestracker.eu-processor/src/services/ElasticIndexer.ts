var _ = require('lodash');
var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');


class ElasticIndexer {

    initializeIndexes = () => {
        return Promise.all([
            this._checkIndexExists('salestracker-est'),
            this._checkIndexExists('salestracker-eng'),
            this._checkIndexExists('salestracker-rus')
        ]);
    }

    private _checkIndexExists(indexName: string) {
        return SessionFactory.getElasticsearchConnection().indices.exists({
                index: indexName
            })
            .then(function (exists) {
                if (!exists) {
                    LOG.info(util.format('[OK] [%s] Index missing. Initializing index.', indexName));

                    return SessionFactory.getElasticsearchConnection().indices.create({
                        index: indexName
                    });
                }

                LOG.info(util.format('[OK] [%s] Index exists. Skip index creation.', indexName));

                return Promise.resolve(false);
            })
            // .then(function () {
            //     return elastic.indices.putSettings({
            //         index: indexName,
            //         type: "offers",
            //         body: {
                // TODO: Add analyzer
            //         }
            //     });
            // })
            .then(function (nextStep) {
                if (!nextStep) {
                    LOG.info(util.format('[OK] [%s] Index exists. Skip initialize mapping.', indexName));
                    return Promise.resolve();
                }

                LOG.info(util.format('[OK] [%s] Index missing. Initialize mapping.', indexName));
                
                return SessionFactory.getElasticsearchConnection().indices.putMapping({
                    index: indexName,
                    type: "offers",
                    body: {
                        properties: {
                            "additional": {
                                "type": "text"
                            },
                            "description": {
                                "type": "text"
                            },
                            "details": {
                                "type": "text"
                            },
                            "title": {
                                "type": "text"
                            },
                            "price": {
                                "type": "nested",
                                "properties": {
                                    "current": {
                                        "type": "scaled_float",
                                        "scaling_factor": 100
                                    },
                                    "original": {
                                        "type": "scaled_float",
                                        "scaling_factor": 100
                                    },
                                    "discount": {
                                        "properties": {
                                            "amount": {
                                                "type": "float"
                                            },
                                            "percents": {
                                                "type": "float"
                                            }
                                        }
                                    }
                                }
                            },
                            "href": {
                                "type": "keyword"
                            },
                            "origin_href": {
                                "type": "keyword",
                            },
                            "client_card_required": {
                                "type": "boolean"
                            },
                            "expires": {
                                "type": "date"
                            },
                            "parsed": {
                                "type": "date"
                            },
                            "site": {
                                "type": "keyword"
                            },
                            "vendor": {
                                "type": "keyword"
                            }
                        }
                    }
                });
            })
    }

    indexOffer = (options, callback) => {
        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return callback(err);
            } 
            
            if (foundOffer) {
                LOG.info(util.format('[OK] [%s] Offer content found %s. Proceed with indexing.', options.site, options.origin_href));
                
                try {
                    this._processFoundOffer(options, foundOffer, callback);
                }
                catch (ex) {
                    callback(ex);
                }
            }
            else {
                LOG.error(util.format('[ERROR] [%s] Offer not found. Indexing failed.', options.site, options.origin_href));
                return callback();
            };
        });
    }

    private _processFoundOffer(options, offer, callback) {
        let translations = offer.translations[options.language];

        if (!translations) {
            return callback(new Error('No translation found for ' + options.language));
        }

        delete translations.content;
            
        offer = _.extend(offer, translations);

        delete offer._id;
        delete offer.pictures;
        delete offer.translations;
        delete offer.language;

        LOG.info(util.format('[OK] [%s] [%s] [%s] Remove existing indexed document.', offer.site, offer.origin_href, options.language));

        SessionFactory.getElasticsearchConnection().deleteByQuery({
            index: 'salestracker-' + options.language,
            type: 'offers',
            body: {
              query: {
                term: { origin_href: offer.origin_href }
              }
            }
          }, function (err, resp) {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] [%s] Removing indexed document failed', offer.site, offer.href), err);
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] [%s] [%s] Adding new document to index.', offer.site, offer.origin_href, options.language));

            SessionFactory.getElasticsearchConnection().index({
                index: 'salestracker-' + options.language,
                type: 'offers',
                body: offer
            }, function (err, resp) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Adding new document do index failed', offer.site, offer.href), err);
                    return callback(err);
                }
    
                LOG.info(util.format('[OK] [%s] [%s ] Adding new document succeeded', offer.site, offer.href));
                return callback();
            });
        });
    }
}


export default new ElasticIndexer();