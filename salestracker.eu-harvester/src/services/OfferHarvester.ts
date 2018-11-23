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
        }, (err, foundMainOffer) => {
            if (err) {
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return this._gatherOffer(options, callback);
            } else if (foundMainOffer) {
                const isTranslated = !_.isUndefined(foundMainOffer.translations[options.language]);

                if (isMainOffer) {
                    this._extendExpirationTime(foundMainOffer._id, new Date(runningTime + parser.config.ttl), options, callback);
                } else if (isTranslated) {
                    LOG.info(util.format('[OK] [%s] Offer already translated. Skipping.', options.site, options.href));
                    return callback(null);
                } else {
                    LOG.info(util.format('[OK] [%s] Offer translation not found %s. Proceed with harvesting %s', options.site, options.origin_href, options.href));
                    return this._gatherOffer(options, callback);
                }
            } else {
                LOG.info(util.format('[OK] [%s] Offer not found. Proceed with harvesting', options.site, options.href));
                return this._gatherOffer(options, callback);
            };
        });
    }

    private _gatherOffer = (options, callback) => {
        var runningTime = new Date();
        var parser = parserFactory.getParser(options.site);

        var parseResponseData = (body) => {
            parser.parse(body, (err, data) => {
                var translations = this._findTranslationHrefs(options, body);
                if (translations) {
                    data.translations = translations;
                }

                body = null;

                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Parsing offer failed', options.site, options.href, err));
                    return callback(err);
                }

                LOG.debug(util.format('[OK] [%s] Offer parsing finished %s', options.site, options.href));

                data = _.extend(data, {
                    'href': options.href,
                    'site': options.site,
                    'language': options.language,
                    'parsed': new Date(runningTime),
                    'expires': new Date(runningTime + parser.config.ttl) // in one hour
                });

                if (options.origin_href) {
                    data.origin_href = options.origin_href;
                }

                WorkerService.scheduleDataProcessing(data, callback);
            });
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
                        LOG.error(util.format('[ERROR] [%s] Offer processing failed %s', options.site, options.href, err));
                        return callback(err);
                    }

                    return callback(null, offer);
                },
                onSuccess: parseResponseData
            });
        }
    };

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
                return this._gatherOffer(options, callback);
            } else {
                LOG.info(util.format('[OK] [%s] Offers expiration time extended', options.site, options.href));
                return callback(null);
            }
        });
    }

    private _findTranslationHrefs = (options, body): { [language: string]: string } => {
        var parser = parserFactory.getParser(options.site);

        var translations = {};

        _.each(_.keys(parser.config.languages), function (language) {
            if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                return;
            }

            if (parser.config.languages[language].findHref) {
                translations[language] = parser.config.languages[language].findHref(body);
            }
        });

        return translations;
    }
}

export default new OfferHarvester();