var _ = require('lodash');
var util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require("../../lib/services/SessionFactory");

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
//                  calculate tranlsation hrefs and merge to offer translations section
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
        var runningTime = new Date();
        var parser = parserFactory.getParser(options.site);

        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[OK] [%s] [%s] Offer not found in DB. Error accured', options.site, options.origin_href), err);
                return callback(err);
            }

            const isMainOffer = parser.config.languages[options.language].main;

            if (foundOffer) {
                LOG.info(util.format('[OK] [%s] [%s] Offer found in DB. Proceed.', options.site, options.origin_href));

                const isTranslated = !_.isUndefined(foundOffer.translations[options.language]);

                if (isMainOffer) {
                    this._extendExpirationTime(options, new Date(runningTime + parser.config.ttl))
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] Main offer expiration time extended', options.site, options.href));
                            return callback();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] Main offer expiration time not extended', options.site, options.href), err);
                            return callback(err);
                        });
                } 
                else {
                    if (isTranslated) {
                        LOG.info(util.format('[OK] [%s] [%s] Offer already translated. Skipping.', options.site, options.href));
                        callback();
                    } 
                    else {
                        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation not found. Proceed with harvesting', 
                            options.site, options.origin_href, options.href, options.language));
                        this._proceedWithTranslationHarvesting(options, foundOffer.translations)
                            .then(() => {
                                LOG.info(util.format('[OK] [%s] [%s] Offer translation harvested', options.site, options.href));
                                return callback();
                            })
                            .catch(err => {
                                LOG.error(util.format('[ERROR] [%s] [%s] Offer translation harvesting failed', options.site, options.href), err);
                                return callback(err);
                            });
                    }
                }
            }
            else {
                if (isMainOffer) {
                    LOG.info(util.format('[OK] [%s] [%s] Offer not found in DB. Proceed with main offer harvesting', options.site, options.href));
                    this._proceedWithMainOfferHarvesting(options)
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] Main offer harvested', options.site, options.href));
                            return callback();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] Main offer harvesting failed', options.site, options.href), err);
                            return callback(err);
                        });
                }
                else {
                    LOG.info(util.format('[OK] [%s] [%s] Offer not found in DB. Skip offer translation processing', options.site, options.href));
                    callback();
                }
            }
        });
    }

//            if main offer 
//                  harvest offer content
//                  calculate tranlsation hrefs and merge to offer translations section
//                  store offer with content to db
//                  schedule offer content processing
    private _proceedWithMainOfferHarvesting(options: OfferHarvestOptions) {
        var parser = parserFactory.getParser(options.site);

        return this._harvestOfferContent(options)
            .then(data => {
                LOG.info(util.format('[OK] [%s] [%s] Parsing main offer content', options.site, options.href));

                const translationHrefs = this._findTranslationHrefs(options, data);
                const content = parser.content(data);

                var translations = {};

                translations[options.language] = {
                    'content': content,
                    'href': options.href
                };

                return Promise.resolve(_.extend(translations, translationHrefs));
            })
            .then(translations => {
                LOG.info(util.format('[OK] [%s] [%s] Saving main offer content', options.site, options.href));

                return this._storeOfferContent(options, translations);
            })
            .then(offer => {
                LOG.debug(util.format('[OK] [%s] [%s] Main offer content saved', options.site, options.href, offer));
                LOG.info(util.format('[OK] [%s] [%s] Scheduling main offer content processing', options.site, options.href));

                return WorkerService.scheduleContentProcessing({
                    site: options.site,
                    language: options.language,
                    href: options.href,
                    origin_href: options.href
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Offer content processing scheduled', options.site, options.href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer content processing not scheduled', options.site, options.href), err);
                });
            });
    }

    private _findTranslationHrefs = (options, body): { [language: string]: string } => {
        var parser = parserFactory.getParser(options.site);

        var translationHrefs = {};

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
    }

    //                  if no translation exists
    //                      harvest offer translation content
    //                      update offer with translation both for db and index
    //                      schedule offer content processing    
    private _proceedWithTranslationHarvesting(options: OfferHarvestOptions, translations) {
        var parser = parserFactory.getParser(options.site);

        return this._harvestOfferContent(options)
            .then(data => {
                const content = parser.content(data);

                translations[options.language] = {
                    'content': content
                };

                return Promise.resolve(translations);
            })
            .then(translations => {
                LOG.info(util.format('[OK] [%s] [%s] Saving main offer content', options.site, options.href));

                return this._updateOfferWithTranslatedContent(options, translations);
            })
            .then(offer => {
                LOG.debug(util.format('[OK] [%s] [%s] Main offer content saved', options.site, options.href, offer));
                LOG.info(util.format('[OK] [%s] [%s] Scheduling main offer content processing', options.site, options.href));

                return WorkerService.scheduleContentProcessing({
                    site: options.site,
                    language: options.language,
                    href: options.href,
                    origin_href: options.origin_href
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Offer content processing scheduled', options.site, options.href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer content processing not scheduled', options.site, options.href), err);
                });
            });
    }

    private _harvestOfferContent = (options) => {
        LOG.info(util.format('[OK] [%s] [%s] Offer page content harvesting', options.site, options.href));

        var parser = parserFactory.getParser(options.site);

        return new Promise((fulfill, reject) => {
            if (parser.config.json) {
                return fulfill(options);
            } else {
                var crawler = new Crawler();
                crawler.request({
                    url: options.href,
                    headers: parser.config.headers,
                    onError: err => {
                        LOG.error(util.format('[ERROR] [%s] Harvesting offer\'s content failed %s', options.site, options.href), err);
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
        LOG.debug(util.format('[OK] [%s] Offers expiration time extendeding', options.site, options.href));

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
                    LOG.error(util.format('[ERROR] [%s] [%s] Offers expiration time update failed', options.site, options.href, err));
                    return reject(err);
                }

                if (!updatedOffer) {
                    LOG.info(util.format('[OK] [%s] Offer not updated. Skip processing.', options.site, options.href));
                    return reject(new Error('DB update query failed'));
                } 
                
                LOG.info(util.format('[OK] [%s] Offers expiration time extended', options.site, options.href));
                return fulfill(updatedOffer);
            });
        });
    }

    private _storeOfferContent = (options, translations) => {
        var parser = parserFactory.getParser(options.site);
        var runningTime = new Date();

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
                    LOG.error(util.format('[ERROR] [%s] [%s] Saving offer content failed', options.site, options.href, err));
                    return reject(err);
                }

                if (!savedOffer) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Saving offer content failed', options.site, options.href, err));
                    return reject(new Error('DB save query failed'));
                }

                LOG.info(util.format('[OK] [%s] [%s] Offer content saved', options.site, options.href));
                return fulfill(savedOffer);
            });
        });
    }

    private _updateOfferWithTranslatedContent = (options, translations) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, {
                $set: {
                    translations: translations
                }
            }, (err, updatedOffer) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Updating offer failed', options.site, options.href, err));
                    return reject(err);
                }

                if (!updatedOffer) {
                    LOG.info(util.format('[OK] [%s] Offer not updated. Skip processing.', options.site, options.href));
                    return reject(new Error('DB update query failed'));
                } 

                LOG.info(util.format('[OK] [%s] [%s] Offer content saved', options.site, options.href));
                return fulfill(updatedOffer);
            });
        });
    };
}

export default new OfferHarvester();