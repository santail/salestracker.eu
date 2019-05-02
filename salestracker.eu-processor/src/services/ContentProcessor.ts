const _ = require('lodash');
const cheerio = require("cheerio");
const path = require('path');
const slugify = require('slugify');
const util = require('util');

import { URL } from 'url';

import LOG from "../../lib/services/Logger";
import ParserFactory from '../../lib/services/ParserFactory';
import SessionFactory from '../../lib/services/SessionFactory';

import WorkerService from "./WorkerService";


class ContentProcessor {

    process(options, callback) {
        const parser = ParserFactory.getParser(options.site);
        const isMainOffer = parser.config.languages[options.language].main;

        if (isMainOffer) {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer content processing', options.language, options.site, options.origin_href, options.href));
        } else {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content processing', options.language, options.site, options.origin_href, options.href));
        }

        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Finding main offer failed. Offer content processing failed.', options.language, options.site, options.origin_href, options.href, err));
                return callback(err);
            }

            if (!foundOffer) {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Main offer not found. Offer content processing failed.', options.language, options.site, options.origin_href, options.href));
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer found. Proceed with processing content.', options.language, options.site, options.origin_href, options.href));

            this._parseOfferContent(options, foundOffer)
                .then(data => {
                    return this._processOfferPictures(options, data);
                })
                .then(data => {
                    return this._updateOfferData(options, data);
                })
                .then(offer => {
                    return this._validateOfferProperties(options, offer);
                })
                .then(() => {
                    return this._requestOfferDataProcessing(options);
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer content processing finished.', options.language, options.site, options.origin_href, options.href));
                    return callback();
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer content processing failed', options.language, options.site, options.origin_href, options.href, err));
                    return callback(err);
                });
        });
    }

    private _parseOfferContent = (options, offer) => {
        const parser = ParserFactory.getParser(options.site);
        const isMainOffer = parser.config.languages[options.language].main;

        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Parsing offer content', options.language, options.site, options.origin_href, options.href));

        return new Promise((fulfill, reject) => {
            if (options.language && !offer.translations[options.language]) {
                LOG.info(util.format('[OK] [%s] [%s] [%s] Offer language not found. Skip content processing', options.language, options.site, options.origin_href, options.origin));
                return fulfill();
            }

            let content = offer.translations[options.language].content;

            if (_.isEmpty(content)) {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer content found, but empty.', options.language, options.site, options.origin_href, options.href));
                return reject("Can't parse empty content: " + content);
            }

            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer content found. Proceed with parsing content.', options.language, options.site, options.origin_href, options.href));

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
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Parsing offer content failed', options.language, options.site, options.origin_href, options.href, err));
                    return reject(err);
                }

                const translations = parser.compileTranslations(options, data);
                offer.translations[options.language] = _.extend(offer.translations[options.language], translations[options.language]);

                if (isMainOffer) {
                    const properties = parser.filterOfferProperties(data);
                    offer = _.extend(offer, properties);
                }
                
                return fulfill(offer);
            });
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Parsing offer content failed', options.language, options.site, options.origin_href, options.href, err));
            return Promise.reject(err);
        });
    };

    private _validateOfferProperties = (options, offer) => {
        const parser = ParserFactory.getParser(options.site);

        parser.validateOfferProperties(offer); // TODO check translations

        return Promise.resolve(offer);
    };

    private _updateOfferData = (options, data) => {
        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Update offer with new data', options.language, options.site, options.origin_href, options.href));

        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, data, function (err, updatedOffer) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Update offer with new data failed', options.language, options.site, options.origin_href, options.href, data, err));
                    return reject(err);
                }

                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Update offer with new data succeeded', options.language, options.site, options.origin_href, options.href));
                return fulfill(updatedOffer);
            });
        });
    };

    private _requestOfferDataProcessing = (options) => {
        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content updated.', options.language, options.site, options.origin_href, options.href));

        return WorkerService.scheduleDataProcessing({
            'site': options.site,
            'language': options.language,
            'href': options.href,
            'origin_href': options.origin_href ? options.origin_href : options.href
        })
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation data processing.', options.language, options.site, options.origin_href, options.href));
        })
        .catch(err => {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation data processing not scheduled.', options.language, options.site, options.origin_href, options.href, err));
        });
    };

    private _processOfferPictures = (options, data) => {
        const parser = ParserFactory.getParser(options.site);
        const isMainOffer = parser.config.languages[options.language].main;

        if (!isMainOffer) {
            return Promise.resolve(data);
        }

        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Processing offer pictures', options.language, options.site, options.origin_href, options.href));

        let downloads = {
            pictures: []
        };

        downloads.pictures = _.map(data.pictures, pictureHref => {
            const offerHref = new URL(data.origin_href);
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

        data.downloads = downloads;

        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer pictures processed', options.language, options.site, options.origin_href, options.href));

        return Promise.resolve(data);
    }
}

export default new ContentProcessor();