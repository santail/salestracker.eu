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

var SHOULD_HARVEST_PICTURES = process.env.NODE_ENV !== 'development' || process.env.SHOULD_HARVEST_PICTURES !== 'false';

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
    
                    return fulfill();
                });
            });
        });
    }

    private _processParsedData = (options, data) => {
        var pictures: string[] = [];

        _.each(data.pictures, pictureHref => {
            if (SHOULD_HARVEST_PICTURES) {
                WorkerService.scheduleImageHarvesting({
                    'site': options.site,
                    'offerHref': options.href,
                    'href': pictureHref
                });
            }

            const offerHref = new URL(options.href);
            pictureHref = path.join(options.site + '/' + slugify(offerHref.pathname), path.basename(pictureHref));

            if (options.site === 'www.barbora.ee') {
                pictureHref = pictureHref.replace('GetInventoryImage?id=', '') + '.jpg';
            }

            pictures.push(pictureHref)
        });

        return {
            pictures: pictures
        };
    }
}

export default new ContentProcessor();