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
                    LOG.info(util.format('[STATUS] [OK] [%s] Index missing. Initializing index.'));

                    return elastic.indices.create({
                        index: indexName
                    });
                }

                LOG.info(util.format('[STATUS] [OK] [%s] Index exists. Skip index creation.', indexName));
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
                    LOG.info(util.format('[STATUS] [OK] [%s] Index exists. Skip initialize mapping.', indexName));
                    return Promise.resolve();
                }

                LOG.info(util.format('[STATUS] [OK] [%s] Index missing. Initialize mapping.', indexName));
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

    indexOffer = (offer, done) => {
        var language = offer.language;

        delete offer._id;
        delete offer.pictures;
        delete offer.currency;
        delete offer.translations;
        delete offer.language;

        elastic.index({
            index: 'salestracker-' + language,
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
    }
}


export default new ElasticIndexer();