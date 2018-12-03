var _ = require('lodash');
var path = require('path');
var slugify = require('slugify');
var util = require('util');
import { URL } from 'url';

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require('../../lib/services/SessionFactory');

import WorkerService from './WorkerService';


// should not process pictures if development environment and switched off
var SHOULD_HARVEST_PICTURES = process.env.NODE_ENV !== 'development' || process.env.SHOULD_HARVEST_PICTURES !== 'false';

class DataProcessor {

    process = (options, callback): any => {
        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return callback(err);
            } 
            
            if (foundOffer) {
                LOG.info(util.format('[OK] [%s] Offer found %s. Proceed with processing data.', options.site, options.origin_href));
                
                this._processPictures(options, foundOffer);
                this._processCategories(options)
                this._processIndexes(options);
                
                return callback();
            }
            else {
                LOG.error(util.format('[ERROR] [%s] Offer not found. Processing data failed.', options.site, options.origin_href));
                return callback(err);
            };
        });
    };

    private _processPictures = (options, offer) => {    
        var parser = parserFactory.getParser(options.site);

        if (!parser.config.languages[options.language].main) {
            return;
        }

        _.each(offer.pictures, pictureHref => {
            if (SHOULD_HARVEST_PICTURES) {
                const offerHref = new URL(options.href);
                
                let picturePath = path.join(process.cwd(), './uploads/offers/' + options.site + '/' + slugify(offerHref.pathname));

                WorkerService.schedulePictureHarvesting({
                    'site': options.site,
                    'href': options.href,
                    'origin_href': options.origin_href,
                    'picture_href': pictureHref,
                    'picture_path': picturePath
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] Picture harvesting not scheduled.', options.picture_href, err));
                });
            }
        });
    };

    private _processCategories = (options) => {
        var parser = parserFactory.getParser(options.site);

        if (parser.config.languages[options.language].main) {
            WorkerService.scheduleCategoriesProcessing({
                'site': options.site,
                'language': options.language,
                'href': options.href,
                'origin_href': options.origin_href
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Categories processing not scheduled.', options.origin_href, err));
            });
        }
    };

    private _processIndexes = (options) => {
        WorkerService.scheduleIndexing({
            'site': options.site,
            'language': options.language,
            'href': options.href,
            'origin_href': options.origin_href
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] Indexes processing not scheduled.', options.origin_href, err));
        });
    };

}

export default new DataProcessor();