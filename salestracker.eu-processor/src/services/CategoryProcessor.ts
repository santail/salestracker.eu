const _ = require('lodash');
const util = require('util');

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';

import WorkerService from "./WorkerService";


class CategoryProcessor {

    private _categories;

    process(options) {
        LOG.info(util.format('[OK] [%s] [%s] Offer category processing started', options.site, options.origin_href));

        return new Promise((resolve, reject) => {
            SessionFactory.getDbConnection().categories.find({}, (err, foundCategories) => {
                if (err) {
                    LOG.error(util.format('[ERROR] Checking categories failed', err));
                    return reject();
                }

                if (!foundCategories) {
                    // TODO Mark somehow failed offer and re-run harvesting
                    LOG.error(util.format('[ERROR] Offer category processing failed. Categories not found'));
                    return reject();
                }

                this._categories = _.chain(foundCategories)
                    .keyBy('category')
                    .mapValues('tags')
                    .value();

                SessionFactory.getDbConnection().offers.findOne({
                    origin_href: options.origin_href
                }, (err, foundOffer) => {
                    if (err) {
                        LOG.error(util.format('[ERROR] Updating main offer with found categories failed', err));
                        return reject(err);
                    }
        
                    if (!foundOffer) {
                        // TODO Mark somehow failed offer and re-run harvesting
                        LOG.error(util.format('[ERROR] [%s] Updating main offer with found categories failed. Offer not found.', options.origin_href));
                        return reject(new Error('Offer not found for update: ' + options.origin_href));
                    }
        
                    return this._processFoundOffer(options, foundOffer)
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Updating main offer with found categories finished', options.language, options.site, options.origin_href, options.href));
                            return resolve();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Updating main offer with found categories failed', options.language, options.site, options.origin_href, options.href, err));
                            return reject(err);
                        });
                });
            });
        });
    }

    private _processFoundOffer(options, foundOffer) {
        return new Promise((resolve, reject) => {
            let categories = this._findCategories(foundOffer);

            if (!categories.length) {
                LOG.info(util.format('[OK] [%s] [%s] Offer categories not found', foundOffer.site, foundOffer.origin_href));
                return resolve();
            }

            LOG.info(util.format('[OK] [%s] [%s] Offer categories found. Updating offer.', foundOffer.site, foundOffer.origin_href, categories));

            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, {
                $set: {
                    category: categories
                }
            }, err => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer category processing failed', foundOffer.site, foundOffer.origin_href, err));
                    return reject(err);
                }

                LOG.info(util.format('[OK] [%s] [%s] Updating indexed offer with new categories', foundOffer.site, foundOffer.origin_href));

                // TODO Should update all indexes, not only main language index
                return WorkerService.scheduleIndexing({
                    'site': foundOffer.site,
                    'origin_href': foundOffer.origin_href
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Update offer index with found categories scheduled %s', foundOffer.site, foundOffer.origin_href, categories));
                    return resolve();
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] Update offer index with found categories not scheduled.', foundOffer.origin_href, err));
                    return reject(err);
                });
            });
        });
    }

    private _findCategories = (offer: any) => {
        let title = offer.translations.est ? offer.translations.est.title : offer.translations.eng.title;

        const categories = _.keys(this._categories);

        const foundCategories = _.filter(categories, category => {
            let tags = this._categories[category];

            if (tags.length) {
                return _.some(tags, tag => {
                    return title.toLowerCase().indexOf(tag.toLowerCase()) >= 0;
                });
            }

            return false;
        });

        return foundCategories;
    }
}

export default new CategoryProcessor();