var _ = require('lodash');
var util = require('util');


var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

var elastic = SessionFactory.getElasticsearchConnection();

class ElasticIndexer {

    initializeIndexes = () => {
        return Promise.all([
            this._checkIndexExists('salestracker-est'),
            this._checkIndexExists('salestracker-eng'),
            this._checkIndexExists('salestracker-rus')
        ]);
    }

    private _checkIndexExists(indexName: string) {

        return elastic.indices.exists({
                index: indexName
            })
            .then(function (exists) {
                if (!exists) {
                    LOG.info(util.format('[OK] [%s] Index missing. Initializing index.', indexName));

                    return elastic.indices.create({
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
                return elastic.indices.putMapping({
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
                                    "discount": {
                                        "properties": {
                                            "amount": {
                                                "type": "float"
                                            },
                                            "percents": {
                                                "type": "float"
                                            }
                                        }
                                    },
                                    "original": {
                                        "type": "scaled_float",
                                        "scaling_factor": 100
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
                LOG.info(util.format('[OK] [%s] Offer content found %s. Proceed with parsing content.', options.site, options.origin_href));
                
                let offer = _.clone(foundOffer);
                let translations = offer.translations[options.language];

                delete translations.href;
                delete translations.content;

                offer = _.extend(offer, translations);

                delete offer._id;
                delete offer.pictures;
                delete offer.translations;
                delete offer.language;

                elastic.index({
                    index: 'salestracker-' + options.language,
                    type: 'offers',
                    body: offer
                }, function (err, resp) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] Indexing offer failed', offer.site, offer.id, err));
                        return callback(err);
                    }
        
                    LOG.info(util.format('[OK] [%s] Offer indexed %s', offer.site, offer.href));
                    return callback(null, resp);
                });
            }
            else {
                LOG.error(util.format('[ERROR] [%s] Offer not found. Parsing content failed.', options.site, options.origin_href));
                return callback(err);
            };
        });
    }
}


export default new ElasticIndexer();