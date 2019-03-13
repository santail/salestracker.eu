const _ = require('lodash');
const util = require("util");

import LOG from "../../lib/services/Logger";
import ParserFactory from '../../lib/services/ParserFactory';
import SessionFactory from '../../lib/services/SessionFactory';

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";


// Check if offer already exists in DB
//      If exists: 
//            if main offer
//                  extend expiration time both for db and index
//            if translation:
//                  if translation exists
//                      // update translation both for db and index
//                      just skip
//                  if no translation exists
//                      harvest offer translation content
//                      update offer with translation both for db and index
//                      schedule offer content processing                      
//      If does not exist
//            if main offer 
//                  harvest offer content
//                  calculate translation hrefs and merge to offer translations section
//                  store offer with content to db
//                  schedule offer content processing
//            if translation
//                  just skip

interface OfferHarvestOptions {
    href?: string;
    language: string;
    origin_href: string;
    site: string;
}

class OfferHarvester {
    public harvestOffer = (options: OfferHarvestOptions, callback) => {
        const runningTime = new Date();
        const parser = ParserFactory.getParser(options.site);

        const isMainOffer = parser.config.languages[options.language].main;

        if (isMainOffer) {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer harvesting requested', options.language, options.site, options.origin_href, options.href));
        } else {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation harvesting requested', options.language, options.site, options.origin_href, options.href));
        }

        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[OK] [%s] [%s] [%s] [%s] Offer not found in DB. Error occurred', options.language, options.site, options.origin_href, options.href, err));
                return callback(err);
            }

            if (foundOffer) {
                if (isMainOffer) {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer found in DB. Proceed with extending expiration time.', options.language, options.site, options.origin_href, options.href));

                    this._extendExpirationTime(options, new Date(runningTime + parser.config.ttl))
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer expiration time extended', options.language, options.site, options.origin_href, options.href));
                            return callback();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Main offer expiration time not extended', options.language, options.site, options.origin_href, options.href, err));
                            return callback(err);
                        });
                }
                else {
                    const hasTranslationContent = !_.isUndefined(foundOffer.translations[options.language].content);

                    if (hasTranslationContent) {
                        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer found in DB. Offer already translated with current content. Skipping.', options.language, options.site, options.origin_href, options.href));
                        callback();
                    }
                    else {
                        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer found in DB. Offer translation not found. Proceed with harvesting',
                            options.language, options.site, options.origin_href, options.href));

                        this._proceedWithTranslationHarvesting(options)
                            .then(() => {
                                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation harvested', options.language, options.site, options.origin_href, options.href));
                                return callback();
                            })
                            .catch(err => {
                                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer translation harvesting failed', options.language, options.site, options.origin_href, options.href, err));
                                return callback(err);
                            });
                    }
                }
            }
            else {
                if (isMainOffer) {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer not found in DB. Proceed with main offer harvesting', options.language, options.site, options.origin_href, options.href));

                    this._proceedWithMainOfferHarvesting(options)
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer harvested', options.language, options.site, options.origin_href, options.href));
                            return callback();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Main offer harvesting failed', options.language, options.site, options.origin_href, options.href, err));
                            return callback(err);
                        });
                }
                else {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer not found in DB. Skip offer translation processing', options.language, options.site, options.origin_href, options.href));
                    callback();
                }
            }
        });
    };

    //            if main offer 
    //                  harvest offer content
    //                  calculate tranlsation hrefs and merge to offer translations section
    //                  store offer with content to db
    //                  schedule offer content processing
    private _proceedWithMainOfferHarvesting(options: OfferHarvestOptions) {
        const parser = ParserFactory.getParser(options.site);

        return this._harvestOfferContent(options)
            .then(data => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Parsing main offer page content', options.language, options.site, options.origin_href, options.href));

                const translationHrefs = this._findTranslationHrefs(options, data);
                const content = parser.content(data);

                let translations = {};

                translations[options.language] = {
                    'content': content,
                    'href': options.href
                };

                return Promise.resolve(_.extend(translations, translationHrefs));
            })
            .then(translations => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Saving main offer page content', options.language, options.site, options.origin_href, options.href));

                return this._storeOfferContent(options, translations);
            })
            .then(offer => {
                LOG.debug(util.format('[OK] [%s] [%s] Main offer page content saved', options.site, options.href, offer));
                LOG.info(util.format('[OK] [%s] [%s] Scheduling main offer page content processing', options.site, options.href));

                return WorkerService.scheduleContentProcessing({
                    site: options.site,
                    language: options.language,
                    href: options.href,
                    origin_href: options.href
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Main offer page content processing scheduled', options.site, options.href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Main offer page content processing not scheduled', options.site, options.href, err));
                });
            });
    }

    private _findTranslationHrefs = (options, body): { [language: string]: string } => {
        const parser = ParserFactory.getParser(options.site);

        let translationHrefs = {};

        _.each(_.keys(parser.config.languages), language => {
            if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                return;
            }

            let href;

            if (parser.config.languages[language].findHref) {
                const link = parser.config.languages[language].findHref(body);
                href = parser.compileOfferHref(link)
            } else {
                href = parser.compileOfferHref(options.href, language)
            }

            translationHrefs[language] = {
                'href': href
            };
        });

        return translationHrefs;
    };

    //                  if no translation exists
    //                      harvest offer translation content
    //                      update offer with translation both for db and index
    //                      schedule offer content processing    
    private _proceedWithTranslationHarvesting(options: OfferHarvestOptions) {
        const parser = ParserFactory.getParser(options.site);

        return this._harvestOfferContent(options)
            .then(data => {
                const content = parser.content(data);

                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Parsing offer translation page content', options.language, options.site, options.origin_href, options.href));

                return Promise.resolve(content);
            })
            .then(content => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Updating offer with translation page content', options.language, options.site, options.origin_href, options.href));

                return this._updateOfferWithTranslatedContent(options, content);
            })
            .then(offer => {
                LOG.debug(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation page content saved', options.language, options.site, options.origin_href, options.href, offer));
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Scheduling offer translation page content processing', options.language, options.site, options.origin_href, options.href));

                return WorkerService.scheduleContentProcessing({
                    site: options.site,
                    language: options.language,
                    href: options.href,
                    origin_href: options.origin_href
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation page content processing scheduled', options.language, options.site, options.origin_href, options.href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer translation page content processing not scheduled', options.language, options.site, options.origin_href, options.href, err));
                });
            });
    }

    private _harvestOfferContent = (options) => {
        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer page content harvesting', options.language, options.site, options.origin_href, options.href));

        const parser = ParserFactory.getParser(options.site);

        return new Promise((fulfill, reject) => {
            if (parser.config.json) {
                return fulfill(options);
            } else {
                const crawler = new Crawler();
                crawler.request({
                    url: options.href,
                    headers: parser.config.headers,
                    onError: err => {
                        LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Harvesting offer\'s page content failed %s', options.language, options.site, options.origin_href, options.href, err));
                        return reject(err);
                    },
                    onSuccess: data => {
                        return fulfill(data);
                    }
                });
            }
        });
    };

    private _extendExpirationTime(options, expirationTime) {
        LOG.debug(util.format('[OK] [%s] [%s] [%s] [%s] Offers expiration time extending', options.language, options.site, options.origin_href, options.href));

        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, {
                    $set: {
                        expires: new Date(expirationTime)
                    }
                }, (err, updatedOffer) => {
                    if (err) {
                        // TODO Mark somehow offer that was excluded from processing
                        LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offers expiration time update failed', options.language, options.site, options.origin_href, options.href, err));
                        return reject(err);
                    }

                    if (!updatedOffer) {
                        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer not updated. Skip processing.', options.language, options.site, options.origin_href, options.href));
                        return reject(new Error('DB update query failed'));
                    }

                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offers expiration time in database extended', options.language, options.site, options.origin_href, options.href));

                    let promises: Promise<void | {}>[] = [];

                    if (!options.language) {
                        _.each(_.keys(updatedOffer.translations), language => {
                            promises.push(this._extendIndexedOfferExpirationTime(language, updatedOffer, expirationTime));
                        })
                    } else {
                        promises.push(this._extendIndexedOfferExpirationTime(options.language, updatedOffer, expirationTime));
                    }

                    return Promise.all(promises)
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offers expiration time in index extended', options.language, options.site, options.origin_href, options.href));
                            return fulfill();
                        })
                        .catch(err => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offers expiration time in index extending failed', options.language, options.site, options.origin_href, options.href));
                            return reject(err);
                        });
                });
        });
    }

    private _extendIndexedOfferExpirationTime = (language, offer, expirationTime) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getElasticsearchConnection().updateByQuery({
                index: 'salestracker-' + language,
                type: 'offers',
                body: {
                    query: {
                        "term": { 
                            "origin_href": offer.origin_href 
                        }
                    },
                    script: {
                        source: "ctx._source.expires = '" + new Date(expirationTime).getTime() + "'"
                    }
                }
            }, function (err) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Updating indexed document failed', offer.site, offer.origin_href, language, err));
                    return reject(err);
                }

                LOG.info(util.format('[OK] [%s] [%s] [%s] Updating indexed document succeeded', offer.site, offer.origin_href, language));
                return fulfill();
            });
        });
    };

    private _storeOfferContent = (options, translations) => {
        const parser = ParserFactory.getParser(options.site);
        const runningTime = new Date();

        const offer = {
            'site': options.site,
            'parsed': new Date(runningTime),
            'expires': new Date(runningTime + parser.config.ttl), // in one hour
            'origin_href': options.href,
            'translations': translations
        } as any;

        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.save(offer, (err, savedOffer) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Saving offer page content failed', options.language, options.site, options.origin_href, options.href, err));
                    return reject(err);
                }

                if (!savedOffer) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Saving offer page content failed', options.language, options.site, options.origin_href, options.href, err));
                    return reject(new Error('DB save query failed'));
                }

                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer page content saved', options.language, options.site, options.origin_href, options.href));
                return fulfill(savedOffer);
            });
        });
    };

    /**
     * Here original offer could already be changed
     */
    private _updateOfferWithTranslatedContent = (options, content) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.findOne({
                "origin_href": options.origin_href
            }, (err, foundOffer) => {
                if (err) {
                    // TODO reclaim event processing
                    LOG.error(util.format('[OK] [%s] [%s] [%s] [%s] Offer not found in DB. Error occurred', options.language, options.site, options.origin_href, options.href, err));
                    return reject(err);
                }

                if (!foundOffer) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Main offer not found. Offer translation page content update failed.', options.language, options.site, options.origin_href, options.href));
                    return reject(err);
                }

                foundOffer.translations[options.language] = _.extend(foundOffer.translations[options.language], {
                    content: content
                });

                SessionFactory.getDbConnection().offers.update({
                    origin_href: options.origin_href
                }, {
                    $set: {
                        translations: foundOffer.translations
                    }
                }, (err, updatedOffer) => {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] Updating offer failed', options.site, options.href, err));
                        return reject(err);
                    }

                    if (!updatedOffer) {
                        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation page content not updated. Skip processing.', options.language, options.site, options.origin_href, options.href));
                        return reject(new Error('DB update query failed'));
                    }

                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation page content saved', options.language, options.site, options.origin_href, options.href));
                    return fulfill(updatedOffer);
                });
            });
        });
    };
}

export default new OfferHarvester();