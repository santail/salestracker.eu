var _ = require('lodash');
var cheerio = require("cheerio");
var path = require('path');
var slugify = require('slugify');
var util = require('util');
import { URL } from 'url';

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require('../../lib/services/SessionFactory');

import WorkerService from "./WorkerService";


class ContentProcessor {

    process(options, callback) {
        LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content processing', options.site, options.origin_href, options.language));

        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Checking offer failed'), err);
                return callback(err);
            }

            if (!foundOffer) {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer not found. Parsing content failed.', options.site, options.origin_href, options.language));
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] [%s] [%s] Offer found. Proceed with parsing content.', options.site, options.origin_href, options.language));

            this._parseOfferContent(options, foundOffer)
                .then(offer => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content parsed', options.site, options.href, options.language));

                    return this._processOfferPictures(options, offer);
                })
                .then(offer => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer pictures processed', options.site, options.href, options.language));

                    return this._updateOfferData(options, offer);
                })
                .then(offer => {
                    return this._validateOfferProperties(options, offer);
                })
                .then(offer => {
                    return this._requestOfferDataProcessing(options, offer);
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content processing finished.', options.site, options.origin_href, options.language));
                    return callback();
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer content procesing failed', options.site, options.href, options.language), err);
                    return callback(err);
                });
        });
    }

    private _parseOfferContent = (options, offer) => {
        var parser = parserFactory.getParser(options.site);
        const isMainOffer = parser.config.languages[options.language].main;

        return new Promise((fulfill, reject) => {
            if (options.language && !offer.translations[options.language]) {
                LOG.info(util.format('[OK] [%s] [%s] [%s] Offer language not found. Skip content processing', options.site, options.origin_href, options.language));
                return fulfill();
            }

            let content = offer.translations[options.language].content;

            LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content found. Proceed with parsing content.', options.site, options.origin_href, options.language));

            if (!parser.config.json) {
                content = cheerio.load(content, {
                    normalizeWhitespace: true,
                    lowerCaseTags: true,
                    lowerCaseAttributeNames: true,
                    recognizeCDATA: true,
                    recognizeSelfClosing: true,
                    decodeEntities: false
                });
            }

            parser.parse(content, (err, data) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Parsing offer content failed', options.site, options.href, err));
                    return reject(err);
                }

                var translations = parser.compileTranslations(options, data);
                offer.translations[options.language] = _.extend(offer.translations[options.language], translations[options.language]);

                if (isMainOffer) {
                    var properties = parser.filterOfferProperties(data);
                    offer = _.extend(offer, properties);
                }
                
                return fulfill(offer);
            });
        });
    }

    private _validateOfferProperties = (options, offer) => {
        var parser = parserFactory.getParser(options.site);

        parser.validateOfferProperties(offer); // TODO check translations

        return Promise.resolve(offer);
    }

    private _updateOfferData = (options, offer) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, offer, function (err, updatedOffer) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer translation content update failed', options.site, options.href), err);
                    return reject(err);
                }

                LOG.info(util.format('[OK] [%s] [%s] [%s] Offer data updated', options.site, options.href, options.language));
                return fulfill(updatedOffer);
            });
        });
    }

    private _requestOfferDataProcessing = (options, offer) => {
        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content updated.', options.site, options.origin_href, options.href, options.language));

        return WorkerService.scheduleDataProcessing({
                'site': options.site,
                'language': options.language,
                'href': options.href,
                'origin_href': options.origin_href ? options.origin_href : options.href
            })
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content parsing scheduled.', options.site, options.origin_href, options.href, options.language));
            })
            .catch(err => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content parsing not scheduled.', options.site, options.origin_href, options.href, options.language), err);
            });
    }

    private _processOfferPictures = (options, offer) => {
        let downloads = {
            pictures: []
        };

        downloads.pictures = _.map(offer.pictures, pictureHref => {
            const offerHref = new URL(offer.origin_href);
            let picturePath = path.join(slugify(offerHref.pathname), path.basename(pictureHref));
            
            if (options.site === 'www.barbora.ee') {
                picturePath = picturePath.replace('GetInventoryImage?id=', '') + '.jpg';
            }

            if (options.site === 'www.asos.com.men' || options.site === 'www.asos.com.women') {
                pictureHref += '?$XXL$';
            }

            return {
                origin_href: pictureHref,
                path: encodeURI(picturePath)
            }
        });

        offer.downloads = downloads;

        return Promise.resolve(offer);
    }
}

export default new ContentProcessor();