const _ = require('lodash');
const util = require('util');

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';

const _indexes = {
    'est': {
        'filter': {
            "finnish_stop": {
                "type": "stop",
                "stopwords": "_finnish_"
            },
            "finnish_stemmer": {
                "type": "stemmer",
                "language": "finnish"
            }
        },
        'analyzer': {
            "rebuilt_estonian": {
                "tokenizer": "standard",
                "char_filter": [
                    "html_strip"
                ],
                "filter": [
                    "lowercase",
                    "finnish_stop",
                    "finnish_stemmer"
                ]
            }
        }
    },
    'eng': {
        'filter': {
            "english_stop": {
                "type": "stop",
                "stopwords": "_english_"
            },
            "english_stemmer": {
                "type": "stemmer",
                "language": "english"
            },
            "english_possessive_stemmer": {
                "type": "stemmer",
                "language": "possessive_english"
            }
        },
        'analyzer': {
            "rebuilt_english": {
                "tokenizer": "standard",
                "char_filter": [
                    "html_strip"
                ],
                "filter": [
                    "english_possessive_stemmer",
                    "lowercase",
                    "english_stop",
                    "english_stemmer"
                ]
            }
        }
    },
    'rus': {
        'filter': {
            "russian_stop": {
                "type": "stop",
                "stopwords": "_russian_"
            },
            "russian_stemmer": {
                "type": "stemmer",
                "language": "russian"
            }
        },
        'analyzer': {
            "rebuilt_russian": {
                "tokenizer": "standard",
                "char_filter": [
                    "html_strip"
                ],
                "filter": [
                    "lowercase",
                    "russian_stop",
                    "russian_stemmer"
                ]
            }
        }
    }
};

class ElasticIndexer {

    initializeIndexes = () => {
        const promises = _.map(_.keys(_indexes), language => {
            return this._checkIndexExists(language)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] Index created', language));
                })
                .catch(err => {
                    LOG.info(util.format('[OK] [%s] Index creation failed', language, err));
                });
        });

        return Promise.all(promises)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Indexes created'));
            })
            .catch(err => {
                LOG.info(util.format('[OK] [%s] Indexes creation failed', err));
            });
    };

    private _checkIndexExists(language: string) {
        const indexName = `salestracker-${language}`;

        return SessionFactory.getElasticsearchConnection().indices.exists({
            index: indexName
        })
            .then((exists) => {
                if (!exists) {
                    LOG.info(util.format('[OK] [%s] Index missing. Initializing index.', indexName));

                    return SessionFactory.getElasticsearchConnection().indices.create({
                        index: indexName
                    });
                }

                LOG.info(util.format('[OK] [%s] Index exists. Skip index creation.', indexName));
                return Promise.resolve(false);
            })
            .then( () => {
                LOG.info(util.format('[OK] [%s] Index created. Closing before updating settings.', indexName));

                return SessionFactory.getElasticsearchConnection().indices.close({
                    index: indexName
                });
            })
            .then(() => {
                LOG.info(util.format('[OK] [%s] Index closed. Updating settings.', indexName));

                return SessionFactory.getElasticsearchConnection().indices.putSettings({
                    index: indexName,
                    body: {
                        "analysis": {
                            "filter": _indexes[language].filter,
                            "analyzer": _indexes[language].analyzer
                        }
                    }
                });
            })
            .then(() => {
                LOG.info(util.format('[OK] [%s] Index closed. Updating mappings.', indexName));

                return SessionFactory.getElasticsearchConnection().indices.putMapping({
                    index: indexName,
                    type: "offers",
                    body: {
                        properties: {
                            "additional": {
                                "type": "text",
                                "analyzer": _.first(_.keys(_indexes[language].analyzer))
                            },
                            "description": {
                                "type": "text",
                                "analyzer": _.first(_.keys(_indexes[language].analyzer))
                            },
                            "details": {
                                "type": "text",
                                "analyzer": _.first(_.keys(_indexes[language].analyzer))
                            },
                            "title": {
                                "type": "text",
                                "analyzer": _.first(_.keys(_indexes[language].analyzer))                                
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
                                        "type": "nested",
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
            .then( () => {
                LOG.info(util.format('[OK] [%s] Mappings created. Restoring index.', indexName));

                return SessionFactory.getElasticsearchConnection().indices.open({
                    index: indexName
                });
            })
            .then( () => {
                setTimeout(() => {
                    LOG.info(util.format('[OK] [%s] Index created and opened.', indexName));
                    return Promise.resolve();
                }, 30 * 1000);
            })
    }

    indexOffer = (options) => {
        return new Promise((resolve, reject) => {
            SessionFactory.getDbConnection().offers.findOne({
                "origin_href": options.origin_href
            }, (err, foundOffer) => {
                if (err) {
                    // TODO reclaim event processing
                    LOG.error(util.format('[ERROR] Checking offer failed', err));
                    return reject(err);
                }

                if (foundOffer) {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content found. Proceed with indexing.', options.language, options.site, options.origin_href));

                    let promises: Promise<void | {}>[] = [];

                    if (!options.language) {
                        _.each(_.keys(foundOffer.translations), language => {
                            promises.push(this._indexFoundOffer(language, foundOffer));
                        })
                    } else {
                        promises.push(this._indexFoundOffer(options.language, foundOffer));
                    }

                    return Promise.all(promises)
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] Offer indexing succeeded.', options.language, foundOffer.site, foundOffer.origin_href));
                            return resolve();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer indexing failed', options.language, foundOffer.site, foundOffer.origin_href, err));
                            return reject(err);
                        });
                }
                else {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer not found. Indexing failed.', options.language, options.site, options.origin_href));
                    return resolve();
                }
            });
        });
    };

    private _indexFoundOffer(language, foundOffer) {
        LOG.info(util.format('[OK] [%s] [%s] [%s] Re-index offer content.', language, foundOffer.site, foundOffer.origin_href));

        return new Promise((resolve, reject) => {
            let data = _.cloneDeep(foundOffer);
            let translations = data.translations[language];
    
            if (!translations) {
                return reject(new Error('No translation found for ' + language));
            }
    
            delete translations.content;
    
            data = _.extend(data, translations);
    
            delete data._id;
            delete data.pictures;
            delete data.translations;
            delete data.language;
    
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Remove existing indexed document.', language, data.site, data.origin_href, data.href));
    
            SessionFactory.getElasticsearchConnection().deleteByQuery({
                index: 'salestracker-' + language,
                type: 'offers',
                body: {
                    query: {
                        term: { origin_href: data.origin_href }
                    }
                }
            }, err => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Removing indexed document failed', language, data.site, data.origin_href, data.href, err));
                    return reject(err);
                }

                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Adding new document to index.', language, data.site, data.origin_href, data.href));

                SessionFactory.getElasticsearchConnection().index({
                    index: 'salestracker-' + language,
                    type: 'offers',
                    body: data
                }, function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Adding new document do index failed', language, data.site, data.origin_href, data.href, err));
                        return reject(err);
                    }

                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s ] Adding new document succeeded', language, data.site, data.origin_href, data.href));
                    return resolve();
                });
            });
        });
    }
}


export default new ElasticIndexer();