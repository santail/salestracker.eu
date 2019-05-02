const _ = require('lodash');
const util = require('util');

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';

import WorkerService from "./WorkerService";


class CategoryProcessor {

    private _categories;

    process(options, callback) {
        LOG.info(util.format('[OK] [%s] [%s] Offer category processing started', options.site, options.origin_href));

        SessionFactory.getDbConnection().categories.find({}, (err, foundCategories) => {
            if (err) {
                LOG.error(util.format('[ERROR] Checking categories failed', err));
                return;
            }

            if (!foundCategories) {
                // TODO Mark somehow failed offer and re-run harvesting
                LOG.error(util.format('[ERROR] Offer category processing failed. Categories not found'));
                return;
            }

            this._categories = _.chain(foundCategories)
                .keyBy('category')
                .mapValues('tags')
                .value();

            SessionFactory.getDbConnection().offers.findOne({
                origin_href: options.origin_href
            }, (err, foundOffer) => {
                if (err) {
                    LOG.error(util.format('[ERROR] Checking offer failed', err));
                    return callback(err);
                }
    
                if (!foundOffer) {
                    // TODO Mark somehow failed offer and re-run harvesting
                    LOG.error(util.format('[ERROR] Offer category processing failed. Offer not found %', options.origin_href));
                    return callback(new Error('Offer not found for update: ' + options.origin_href));
                }
    
                try {
                    this._processFoundOffer(options, foundOffer, callback);
                }
                catch (ex) {
                    callback();
                }
            });
        });
    }

    private _processFoundOffer(options, foundOffer, callback) {
        let categories = this._findCategories(foundOffer);

        if (!categories.length) {
            LOG.info(util.format('[OK] [%s] [%s] Offer category not found', foundOffer.site, foundOffer.origin_href));
            return callback();
        }

        SessionFactory.getDbConnection().offers.update({
            origin_href: options.origin_href
        }, {
            $set: {
                category: categories
            }
        }, function (err) {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] [%s] Offer category processing failed', foundOffer.site, foundOffer.origin_href, err));
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] [%s] Offer updated with found categories', foundOffer.site, foundOffer.origin_href));

            if (options.process_categories) {
                LOG.info(util.format('[OK] [%s] [%s] Updating indexed offer with new categories', foundOffer.site, foundOffer.origin_href));

                // TODO Should update all indexes, not only main language index
                return WorkerService.scheduleIndexing({
                    'site': foundOffer.site,
                    'origin_href': foundOffer.origin_href
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Update offer index with found categories scheduled %s', foundOffer.site, foundOffer.origin_href, categories));
                    return callback();
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] Indexes processing not scheduled.', foundOffer.origin_href, err));
                    return callback(err);
                });
            }

            return Promise.resolve();
        });
    }

    private _findCategories = (offer: any) => {
        let title = offer.translations.est ? offer.translations.est.title : offer.translations.eng.title;

        return _.filter(_.keys(this._categories), category => {
            let tags = this._categories[category];

            return _.some(tags, tag => {
                return title.toLowerCase().indexOf(tag.toLowerCase()) >= 0;
            });
        });
    }
}

export default new CategoryProcessor();