import {
    ObjectId
} from 'bson';
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

    private _processorTimeout: { [site: string]: NodeJS.Timer } = {};
    private _lastProcessedOfferId;
    private _lastProcessedOfferParsedTime;

    private _stopProcessingRequested;

    process = (options, callback): any => {
        this._stopProcessingRequested = false;

        if (!_.isEmpty(options.origin_href)) {
            LOG.info(util.format('[OK] [%s] [%s] Offer processing requested.', options.site, options.origin_href));
            this._processSingleOffer(options, callback);
        } else if (!_.isEmpty(options.site)) {
            LOG.info(util.format('[OK] [%s] Site offers processing requested.', options.site));
            this._processSiteOffers(options, callback);
        } else {
            LOG.info(util.format('[OK] [%s] All sites offers processing requested.', options.site));
            this._processAllSitesOffers(options, callback);
        }
    };

    stopProcess = (options, callback): any => {
        this._stopProcessingRequested = true;

        if (options.site) {
            LOG.info(util.format('[OK] [%s] Site offers processing stopped.', options.site));
            this._stopProcessSiteOffers(options, callback);
        } else {
            LOG.info(util.format('[OK] All sites offers processing stopped.'));
            this._stopProcessAllSitesOffers(callback);
        }
    };

    private _stopProcessSiteOffers(options, callback) {
        clearTimeout(this._processorTimeout[options.site]);
        return callback();
    }

    private _stopProcessAllSitesOffers(callback) {
        _.each(_.keys(this._processorTimeout), site => {
            clearTimeout(this._processorTimeout[site]);
        })

        return callback();
    }

    private _processAllSitesOffers(options, callback) {
        SessionFactory.getDbConnection().sites.find({
            "$query": {
                active: true
            }
        }, (err, foundSites) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return callback(err);
            }

            if (this._stopProcessingRequested) {
                LOG.info(util.format('[OK] [%s] All sites offers processing stop requested. Clearing timeout.', options.site));

                clearTimeout(this._processorTimeout['all']);
                _.each(foundSites, site => {
                    clearTimeout(this._processorTimeout[site.href]);
                })

                LOG.info(util.format('[OK] [%s] All sites offers processing stop requested. Stopping.', options.site));
                return callback();
            }

            _.each(foundSites, site => {
                clearTimeout(this._processorTimeout[site.href]);
            })

            this._processAllOffers(options);

            return callback();
        });
    };

    private _processAllOffers(options) {
        this._processorTimeout['all'] = setTimeout(() => {
            SessionFactory.getDbConnection().offers.findOne({
                "$query": {
                    _id: {
                        "$gte": this._lastProcessedOfferId
                    },
                },
                "$orderby": {
                    "_id": 1
                }
            }, (err, foundOffer) => {
                if (err) {
                    // TODO reclaim event processing
                    LOG.error(util.format('[ERROR] Checking offer failed', err));
                    return;
                }

                this._processFoundOffer(options, foundOffer)
                    .then(() => {
                        this._processAllOffers(options);
                    })
                    .catch(() => {
                        LOG.error(util.format('[ERROR] Checking offer failed', err));
                    });
            });
        }, 0)
    };

    private _processSiteOffers(options, callback) {
        if (this._stopProcessingRequested) {
            LOG.info(util.format('[OK] [%s] Site offers processing stop requested. Clearing timeout.', options.site));
            clearTimeout(this._processorTimeout[options.site]);
            LOG.info(util.format('[OK] [%s] Site offers processing stop requested. Stopping.', options.site));
            return callback();
        }

        let criteria: any[] = [{
            site: options.site
        }];

        var currentTime = new Date().getTime();
    
        if (this._lastProcessedOfferId && this._lastProcessedOfferParsedTime) {
            criteria.push({
                _id: {
                    "$ne": this._lastProcessedOfferId
                },
                parsed: {
                    "$gt": new Date(this._lastProcessedOfferParsedTime)
                },
                expires: { 
                    "$gt":  new Date(currentTime - 2 * 60 * 60 * 1000) 
                }
            });
        }

        SessionFactory.getDbConnection().offers
            .findOne({ 
                "$query": {
                    $and: criteria
                }, 
                "$orderBy": { 
                    "parsed": 1 
                }
            }, (err, foundOffer) => {            
                if (err) {
                    // TODO reclaim event processing
                    LOG.error(util.format('[ERROR] Next offer not found. Stop processing.'), err);
                    clearTimeout(this._processorTimeout[options.site]);
                    return callback(err);
                }

                if (!foundOffer) {
                    LOG.error(util.format('[ERROR] Next offer not found. Stop processing.'));
                    clearTimeout(this._processorTimeout[options.site]);

                    this._lastProcessedOfferId = null;
                    this._lastProcessedOfferParsedTime = null;
                    return callback();
                }

                LOG.info(util.format('[OK] [%s] [%s] Offer found. Proceed with processing data.', foundOffer.site, foundOffer.origin_href));

                this._lastProcessedOfferId = foundOffer._id;
                this._lastProcessedOfferParsedTime = foundOffer.parsed;

                this._processFoundOffer(options, foundOffer)
                    .then(() => {
                        LOG.info(util.format('[OK] [%s] [%s] Processing offer data finished. Next offer.', foundOffer.site, foundOffer.origin_href));

                        this._processorTimeout[options.site] = setTimeout(() => {
                            this._processSiteOffers(options, callback);
                        }, 0)
                    })
                    .catch(() => {
                        LOG.error(util.format('[ERROR] Checking offer failed', err));
                        callback();
                    });
            });
    };

    private _processSingleOffer(options, callback) {
        SessionFactory.getDbConnection().offers.findOne({
            "origin_href": options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return callback(err);
            }

            this._processFoundOffer(options, foundOffer)
                .then(() => {
                    return callback();
                })
                .catch(() => {
                    return callback();
                });
        });
    }

    private _processFoundOffer(options, foundOffer) {
        if (!foundOffer) {
            LOG.error(util.format('[ERROR] [%s] Offer not found. Processing data failed.', options.site, options.origin_href));
            return Promise.resolve < void | {} > (void 0);
        }

        LOG.info(util.format('[OK] [%s] [%s] Processing data.', foundOffer.site, foundOffer.origin_href));

        let promises: Promise<void | {}>[] = [];

        if (options.process_pictures) {
            promises.push(this.processPictures(options, foundOffer));
        }

        if (options.process_categories) {
            promises.push(this.processCategories(options, foundOffer));
        }

        if (options.process_index) {
            promises.push(this.processIndexes(options, foundOffer));
        }

        return Promise.all(promises);
    }

    processPictures = (options, offer) => {
        var parser = parserFactory.getParser(options.site);

        if (options.language && options.origin_href && !parser.config.languages[options.language].main) {
            return Promise.resolve();
        }

        LOG.info(util.format('[OK] [%s] [%s] Process pictures.', offer.site, offer.origin_href));

        return new Promise((fulfill, reject) => {
            SessionFactory.getDbConnection().offers.update({
                origin_href: offer.origin_href
            }, {
                $set: {
                    downloads: { pictures: [] }
                }
            }, function (err) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer update failed', options.site, offer.origin_href), err);
                    return reject();
                }
    
                LOG.info(util.format('[OK] [%s] [%s] Offer updated with empty pictures collection.', options.site, offer.origin_href));
    
                return _.map(offer.pictures, pictureHref => {
                    if (!SHOULD_HARVEST_PICTURES) {
                        return fulfill();
                    }
        
                    const offerHref = new URL(offer.origin_href);
                    let picturePath = path.join(process.cwd(), './uploads/offers/' + options.site + '/' + slugify(offerHref.pathname));
        
                    return WorkerService.schedulePictureHarvesting({
                            'site': options.site,
                            'origin_href': offer.origin_href,
                            'picture_href': pictureHref,
                            'picture_path': picturePath
                        })
                        .then(() => {
                            LOG.info(util.format('[OK] [%s] [%s] [%s] Picture harvesting scheduled.', offer.site, offer.origin_href, pictureHref));
                            return fulfill();
                        })
                        .catch(err => {
                            LOG.error(util.format('[ERROR] [%s] Picture harvesting not scheduled.', pictureHref), err);
                            return reject(err);
                        });
                });
            });
        });
    };

    processCategories = (options, offer) => {
        var parser = parserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] [%s] Process categories.', options.site, offer.origin_href));

        if (options.language && options.origin_href && !parser.config.languages[options.language].main) {
            return Promise.resolve();
        }

        return WorkerService.scheduleCategoriesProcessing({
                'site': options.site,
                'language': options.language,
                'href': options.href,
                'origin_href': options.origin_href
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Categories processing not scheduled.', options.origin_href), err);
            });
    };

    processIndexes = (options, offer) => {
        LOG.info(util.format('[OK] [%s] [%s] Process indexes.', options.site, offer.origin_href));

        // TODO should take language into account or just schedule all languages re-indexing
        return WorkerService.scheduleIndexing({
                'site': options.site,
                'language': options.language,
                'href': options.href,
                'origin_href': options.origin_href
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Indexes processing not scheduled.', options.origin_href), err);
            });
    };

}

export default new DataProcessor();