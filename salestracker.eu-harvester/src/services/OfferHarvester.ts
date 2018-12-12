var _ = require('lodash');
var mongojs = require('mongojs');
var util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var sessionFactory = require("../../lib/services/SessionFactory");


class OfferHarvester {
    public harvestOffer = (options, callback) => {
        var runningTime = new Date();
        var parser = parserFactory.getParser(options.site);

        const isMainOffer = _.isUndefined(options.origin_href) && parser.config.languages[options.language].main;
        const href = isMainOffer ? options.href : options.origin_href;

        sessionFactory.getDbConnection().offers.findOne({
            "origin_href": href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[OK] [%s] [%s] Offer not found in DB. Error accured', options.site, options.href), err);
                return callback(err);
            }

            if (!foundOffer) {
                LOG.info(util.format('[OK] [%s] [%s] Offer not found in DB. Proceed with harvesting', options.site, options.href));
                this._harvestOfferContent(options, callback);
                return;
            }

            const isTranslated = !_.isUndefined(foundOffer.translations[options.language]);

            if (isMainOffer) {
                this._extendExpirationTime(foundOffer._id, new Date(runningTime + parser.config.ttl), options, callback);
            } else if (isTranslated) {
                LOG.info(util.format('[OK] [%s] [%s] Offer already translated. Skipping.', options.site, options.href));
                callback();
            } else {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation not found. Proceed with harvesting', 
                    options.site, options.origin_href, options.href, options.language));
                this._harvestOfferContent(options, callback, foundOffer);
            }
        });
    }

    private _harvestOfferContent = (options, callback, foundOffer?) => {
        LOG.info(util.format('[OK] [%s] [%s] Offer page content harvesting', options.site, options.href));

        var parser = parserFactory.getParser(options.site);

        if (parser.config.json) {
            this._processBodyOrData(options, options, foundOffer, callback);
        } else {
            var crawler = new Crawler();
            crawler.request({
                url: options.href,
                headers: parser.config.headers,
                onError: err => {
                    LOG.error(util.format('[ERROR] [%s] Getting offer\'s content failed %s', options.site, options.href, err));
                    return callback(err);
                },
                onSuccess: data => {
                    this._processBodyOrData(data, options, foundOffer, callback)
                }
            });
        }
    };

    private _processBodyOrData(body, options, foundOffer, callback) {
        LOG.info(util.format('[OK] [%s] [%s] Offer page body received. Getting content', options.site, options.href));

        var parser = parserFactory.getParser(options.site);
        const content = parser.content(body);

        if (foundOffer) {
            LOG.info(util.format('[OK] [%s] [%s] Offer original found. Extending with translation', options.site, options.href));
            this._updateOfferWithTranslatedContent(options, content, foundOffer, callback);
        }
        else {
            LOG.info(util.format('[OK] [%s] [%s] Offer original not found. Store main offer content.', options.site, options.href));

            this._storeOfferContent(options, content)
                .then(() => {
                    return this._requestTranslations(options, body);
                })
                .then(() => {
                    return WorkerService.scheduleContentProcessing({
                            site: options.site,
                            language: options.language,
                            href: options.href,
                            origin_href: options.origin_href ? options.origin_href : options.href
                        })
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] Offer content processing scheduled', options.site, options.href));
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] Offer content processing not scheduled', options.site, options.href), err);
                        });
                })
                .then(() => {
                    return callback();
                })
                .catch(err => {
                    return callback(err);
                });
        }
    }

    private _updateOfferWithTranslatedContent = (options, content, foundOffer, callback) => {
        foundOffer.translations[options.language] = {
            'content': content,
            'href': options.href
        };

        sessionFactory.getDbConnection().offers.update({
            origin_href: options.origin_href
        }, {
            $set: {
                translations: foundOffer.translations
            }
        }, (err) => {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] [%s] Updating offer failed', options.site, options.href, err));
                return callback(err);
            }

            WorkerService.scheduleContentProcessing(options)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Offer content processing scheduled', options.site, options.href));
                    return callback();
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer content processing not scheduled', options.site, options.href), err);
                    return callback(err);
                });
        });
    };

    private _storeOfferContent = (options, content) => {
        var parser = parserFactory.getParser(options.site);
        var runningTime = new Date();

        const offer = {
            'site': options.site,
            'parsed': new Date(runningTime),
            'expires': new Date(runningTime + parser.config.ttl), // in one hour
            'origin_href': options.href,
            'translations': {}
        } as any;

        offer.translations[options.language] = {
            'content': content,
            'href': options.href
        };

        return new Promise((fulfill, reject) => {
            sessionFactory.getDbConnection().offers.save(offer, (err, savedOffer) => {
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

    private _requestTranslations = (options, body) => {
        LOG.info(util.format('[OK] [%s] [%s] Schedule offer translations', options.site, options.href));

        var translations = this._findTranslationHrefs(options, body);

        console.log(translations);
        
        let delay = 1000;

        const translationsRequestPromises = _.map(_.keys(translations), language => {
            const href = translations[language];

            let config = {
                'site': options.site,
                'language': language,
                'href': href,
                'origin_href': options.href,
            };

            delay = delay + 5000;

            return WorkerService.scheduleOfferHarvesting(config, delay)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer translation harvesting scheduled', options.site, href, language));                    
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer translation harvesting not scheduled %s', options.site, href, language), err);
                    // TODO Mark offer as failed due to missing translation
                });
        });

        return Promise.all(translationsRequestPromises)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Offer translations scheduled', options.site, options.href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Offer translations not scheduled %s', options.site, options.href), err);
            })
    };

    private _findTranslationHrefs = (options, body): { [language: string]: string } => {
        var parser = parserFactory.getParser(options.site);

        var translations = {};

        _.each(_.keys(parser.config.languages), language => {
            if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                return;
            }

            if (parser.config.languages[language].findHref) {
                const link = parser.config.languages[language].findHref(body);
                translations[language] = parser.compileOfferHref(link);
            } else {
                translations[language] = parser.compileOfferHref(options.href, language)
            }
        });

        return translations;
    }

    private _extendExpirationTime(offerId, expirationTime, options, callback) {
        LOG.debug(util.format('[OK] [%s] Offers expiration time extendeding', options.site, options.href));

        sessionFactory.getDbConnection().offers.update({
            _id: mongojs.ObjectId(offerId)
        }, {
            $set: {
                expires: new Date(expirationTime)
            }
        }, (err, updatedOffer) => {
            if (err) {
                // TODO Mark somehow offer that was excluded from processing
                LOG.error(util.format('[ERROR] [%s] [%s] Offers expiration time update failed', options.site, options.href, err));
                return callback(err);
            }

            if (!updatedOffer) {
                LOG.info(util.format('[OK] [%s] Offer not updated. Proceed with harvesting', options.site, options.href));
                return this._harvestOfferContent(options, callback);
            } 
            
            LOG.info(util.format('[OK] [%s] Offers expiration time extended', options.site, options.href));
            return callback();
        });
    }
}

export default new OfferHarvester();