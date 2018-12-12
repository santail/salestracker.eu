var _ = require('lodash');
var cheerio = require("cheerio");
var path = require('path');
var slugify = require('slugify');
var util = require('util');
import {
    URL
} from 'url';

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

            this._processOfferContent(options, foundOffer)
                .then(() => {
                    return callback();
                })
                .catch(() => {
                    return callback();
                });
        });
    }

    private _processOfferContent = (options, foundOffer) => {
        var parser = parserFactory.getParser(options.site);
        const isMainOffer = parser.config.languages[options.language].main;

        return new Promise((fulfill, reject) => {
            if (!foundOffer.translations[options.language]) {
                LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content not found.', options.site, options.origin_href, options.language));
                return fulfill();
            }

            let body = foundOffer.translations[options.language].content;

            LOG.info(util.format('[OK] [%s] [%s] [%s] Offer content found. Proceed with parsing content.', options.site, options.origin_href, options.language));

            if (!parser.config.json) {
                body = cheerio.load(body, {
                    normalizeWhitespace: true,
                    lowerCaseTags: true,
                    lowerCaseAttributeNames: true,
                    recognizeCDATA: true,
                    recognizeSelfClosing: true,
                    decodeEntities: false
                });
            }

            parser.parse(body, (err, data) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Parsing offer content failed', options.site, options.href, err));
                    return reject(err);
                }

                var translations = parser.compileTranslations(options, data);
                foundOffer.translations[options.language] = _.extend(foundOffer.translations[options.language], translations[options.language]);

                if (isMainOffer) {
                    var offer = parser.filterOfferProperties(data);
                    foundOffer = _.extend(foundOffer, offer);

                    parser.validateOfferProperties(foundOffer); // TODO check translations
                }

                SessionFactory.getDbConnection().offers.update({
                    origin_href: options.origin_href
                }, foundOffer, function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] Offer translation content update failed', data.site, data.href, err));
                        return reject(err);
                    }

                    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content updated.', options.site, options.origin_href, options.href, options.language));

                    WorkerService.scheduleDataProcessing({
                            'site': options.site,
                            'language': options.language,
                            'href': options.href,
                            'origin_href': options.origin_href ? options.origin_href : options.href
                        })
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content parsing scheduled.', options.site, options.origin_href, options.href, options.language));

                            return fulfill();
                        })
                        .catch(err => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translation content parsing not scheduled.', options.site, options.origin_href, options.href, options.language), err);

                            return fulfill(); // TODO Mark to re-schedule data processing
                        });;
                });
            });
        });
    }
}

export default new ContentProcessor();