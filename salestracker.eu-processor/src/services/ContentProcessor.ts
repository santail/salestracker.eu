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
        LOG.info(util.format('[OK] [%s] Processing offer content %s %s', options.site, options.language, options.origin_href));

        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return callback(err);
            } 
            
            if (foundOffer) {
                LOG.info(util.format('[OK] [%s] Offer content found %s. Proceed with parsing content.', options.site, options.origin_href));
                
                this._processOfferContent(options, foundOffer)
                    .then(data => {
                        return callback(data);
                    });
            }
            else {
                LOG.error(util.format('[ERROR] [%s] Offer not found. Parsing content failed.', options.site, options.origin_href));
                return callback(err);
            };
        });
    }

    private _processOfferContent = (options, foundOffer) => {
        var parser = parserFactory.getParser(options.site);
        const isMainOffer = parser.config.languages[options.language].main;
        
        let body = foundOffer.translations[options.language].content;
        
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

        return new Promise((fulfill, reject) => {
            parser.parse(body, (err, data) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Parsing offer failed', options.site, options.href, err));
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
                }, {
                    $set: foundOffer
                }, function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] Updating offer failed', data.site, data.href, err));
                        return reject(err);
                    }
    
                    WorkerService.scheduleDataProcessing({
                        'site': options.site,
                        'language': options.language,
                        'href': options.href,
                        'origin_href': options.origin_href ? options.origin_href : options.href
                    })
                    .then(() => {
                        return fulfill();
                    })
                    .catch(err => {
                        return fulfill(); // TODO Mark to re-schedule data processing
                    });
                });
            });
        });
    }
}

export default new ContentProcessor();