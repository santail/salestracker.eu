const _ = require('lodash');
const path = require('path');
const util = require('util');

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';
import ParserFactory from '../../lib/services/ParserFactory';

import WorkerService from './WorkerService';


// should not process pictures if development environment and switched off
const SHOULD_HARVEST_PICTURES = process.env.NODE_ENV !== 'development' || process.env.SHOULD_HARVEST_PICTURES !== 'false';

class DataProcessor {

    private _processorTimeout: { [site: string]: NodeJS.Timer } = {};
    private _lastProcessedOfferId;
    private _lastProcessedOfferParsedTime;

    private _stopProcessingRequested;

    process = (options, callback): any => {
        this._stopProcessingRequested = false;

        if (!_.isEmpty(options.origin_href)) {
            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer data processing requested.', options.language, options.site, options.origin_href, options.href));
            this._processSingleOffer(options, callback);
        } else if (!_.isEmpty(options.site)) {
            LOG.info(util.format('[OK] [%s] Site offers data processing requested.', options.site));
            this._processSiteOffers(options, callback);
        } else {
            LOG.info(util.format('[OK] [%s] All sites offers data processing requested.', options.site));
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
        });

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
                });

                LOG.info(util.format('[OK] [%s] All sites offers processing stop requested. Stopping.', options.site));
                return callback();
            }

            _.each(foundSites, site => {
                clearTimeout(this._processorTimeout[site.href]);
            });

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
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Finding main offer failed. Processing offer data failed.', options.language, options.site, options.origin_href, options.href, err));
                    return;
                }

                if (!foundOffer) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Main offer not found. Processing offer data failed.', options.language, options.site, options.origin_href, options.href));
                    return;
                }

                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer found. Proceed with processing data.', options.language, options.site, options.origin_href, options.href));

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

        const currentTime = new Date().getTime();
    
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

        SessionFactory.getDbConnection().offers.findOne({ 
            "$query": {
                $and: criteria
            }, 
            "$orderBy": { 
                "parsed": 1 
            }
        }, (err, foundOffer) => {            
            if (err) {
                // TODO reclaim event processing
                LOG.error(util.format('[ERROR] Next offer not found. Stop processing.', err));
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
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Finding main offer failed. Processing offer data failed.', options.language, options.site, options.origin_href, options.href, err));
                return callback(err);
            }

            if (!foundOffer) {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Main offer not found. Processing offer data failed.', options.language, options.site, options.origin_href, options.href));
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Main offer found. Proceed with processing data.', options.language, options.site, options.origin_href, options.href));

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
        const parser = ParserFactory.getParser(options.site);
        const isMainOffer = !options.language || parser.config.languages[options.language].main;

        let promises: Promise<void | {}>[] = [];

        if (isMainOffer) {
            promises.push(this._requestTranslationsHarvesting(options, foundOffer));
        }

        if (isMainOffer && options.process_pictures) {
            promises.push(this.requestPicturesHarvesting(options, foundOffer));
        }

        if (isMainOffer && options.process_categories) {
            promises.push(this.requestCategoriesProcessing(options, foundOffer));
        }

        if (isMainOffer && options.process_index) {
            promises.push(this.requestOfferContentIndexing(options, foundOffer));
        }

        return Promise.all(promises);
    }

    private _requestTranslationsHarvesting = (options, offer) => {
        const parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Schedule offer translations', options.language, options.site, options.origin_href, options.href));

        let delay = 30 * 1000; // Because of transaction issues for MongoDB, just skip some time to not overwrite offer missing some properties

        const translationsRequestPromises = _.map(_.keys(offer.translations), language => {
            const isMainOffer = parser.config.languages[language].main;

            // do not request main language translation harvesting as it is already there
            if (isMainOffer) {
                return;
            }

            const translation = offer.translations[language];

            let config = {
                'site': options.site,
                'language': language,
                'href': translation.href,
                'origin_href': options.origin_href,
            };

            return WorkerService.scheduleOfferHarvesting(config, delay)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer translation harvesting scheduled', language, options.site, options.href));
                    delay += 60 * 1000;
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer translation harvesting not scheduled %s', language, options.site, options.href, err));
                    // TODO Mark offer as failed due to missing translation
                });
        });

        return Promise.all(translationsRequestPromises)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer translations scheduled', options.language, options.site, options.origin_href, options.href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer translations not scheduled %s', options.language, options.site, options.origin_href, options.href, err));
            })
    };

    requestPicturesHarvesting = (options, offer) => {
        const parser = ParserFactory.getParser(options.site);

        // process only main offer pictures
        if (options.language && options.origin_href && !parser.config.languages[options.language].main) {
            return Promise.resolve();
        }

        LOG.info(util.format('[OK] [%s] [%s] [%s] Process pictures.', options.language, offer.site, offer.origin_href,));

        if (!SHOULD_HARVEST_PICTURES) {
            return Promise.resolve();
        }

        const picturesProcessPromises = _.map(offer.downloads.pictures, picture => {
            return WorkerService.schedulePictureHarvesting({
                'site': options.site,
                'origin_href': offer.origin_href,
                'picture_href': picture.origin_href,
                'href': options.href,
                'picture_path': path.join(process.cwd(), './uploads/offers/' + options.site + '/' + picture.path)
            })
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Picture harvesting scheduled.', options.language, offer.site, offer.origin_href, picture.origin_href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Picture harvesting not scheduled.', options.language, offer.site, offer.origin_href, picture.origin_href, err));
            });
        });

        return Promise.all(picturesProcessPromises)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Offer pictures harvesting scheduled', options.site, options.href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Offer pictures harvesting not scheduled %s', options.site, options.href, err));
            });
    };

    requestCategoriesProcessing = (options, offer) => {
        const parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] [%s] Process categories.', options.site, offer.origin_href));

        // process main offer only
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
            LOG.error(util.format('[ERROR] [%s] Categories processing not scheduled.', options.origin_href, err));
        });
    };

    requestOfferContentIndexing = (options, offer) => {
        LOG.info(util.format('[OK] [%s] [%s] Process indexes.', options.site, offer.origin_href));

        // TODO should take language into account or just schedule all languages re-indexing
        return WorkerService.scheduleIndexing({
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