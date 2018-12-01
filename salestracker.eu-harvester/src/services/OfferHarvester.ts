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
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return this._harvestOfferContent(options, callback);
            } else if (foundOffer) {
                const isTranslated = !_.isUndefined(foundOffer.translations[options.language]);

                if (isMainOffer) {
                    this._extendExpirationTime(foundOffer._id, new Date(runningTime + parser.config.ttl), options, callback);
                } else if (isTranslated) {
                    LOG.info(util.format('[OK] [%s] Offer already translated. Skipping.', options.site, options.href));
                    return callback(null);
                } else {
                    LOG.info(util.format('[OK] [%s] Offer translation not found %s. Proceed with harvesting %s', options.site, options.origin_href, options.href));
                    return this._harvestOfferContent(options, callback, foundOffer);
                }
            } else {
                LOG.info(util.format('[OK] [%s] Offer not found. Proceed with harvesting', options.site, options.href));
                return this._harvestOfferContent(options, callback);
            };
        });
    }

    private _harvestOfferContent = (options, callback, foundOffer?) => {
        var parser = parserFactory.getParser(options.site);

        var parseResponseData = (body) => {
            const content = parser.content(body);

            if (!foundOffer) {
                this._storeOfferContent(options, content)
                    .then(() => {                        
                        return this._requestTranslations(options, body);
                    })
                    .then(() => {
                        return callback();
                    })
                    .catch(err => {
                        return callback(err);
                    });
            }
            else {
                this._updateOfferWithTranslatedContent(options, content, foundOffer, callback);
            }
        };

        if (parser.config.json) {
            parseResponseData(options);
        } else {
            var crawler = new Crawler();
            crawler.request({
                url: options.href,
                headers: parser.config.headers,
                onError: function (err, offer) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] Getting offer\'s content failed %s', options.site, options.href, err));
                        return callback(err);
                    }

                    return callback(null, offer);
                },
                onSuccess: parseResponseData
            });
        }
    };

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

            return WorkerService.scheduleContentProcessing(options)
                .then(() => {
                    return callback();
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

                LOG.info(util.format('[OK] [%s] Offer content saved %s', options.site, options.href));
                return fulfill(savedOffer);
            });
        })
        .then(() => {
            return WorkerService.scheduleContentProcessing({
                site: options.site,
                language: options.language,
                href: options.href,
                origin_href: options.origin_href ? options.origin_href : options.href
            });
        });
    }

    private _requestTranslations = (options, body) => {
        var translations = this._findTranslationHrefs(options, body);

        const translationsRequestPromises = _.map(_.keys(translations), language => {
            let config = {
                'site': options.site,
                'language': language,
                'href': translations[language],
                'origin_href': options.href,
            };

            return WorkerService.scheduleOfferHarvesting(config)
                .catch(err => {
                    // TODO Mark offer as failed due to missing translation
                });
        });

        return Promise.all(translationsRequestPromises)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Offer translations scheduled', options.site, options.href));
                return Promise.resolve();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Offer translations not scheduled %s', options.site, options.href));
                return Promise.reject(err);
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
            }
            else {
                translations[language] = parser.compileOfferHref(options.href, language)
            }
        });

        return translations;
    }

    private _extendExpirationTime(offerId, expirationTime, options, callback) {
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
            } else {
                LOG.info(util.format('[OK] [%s] Offers expiration time extended', options.site, options.href));
                return callback(null);
            }
        });
    }
}

export default new OfferHarvester();