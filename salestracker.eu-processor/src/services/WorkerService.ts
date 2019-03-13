const util = require('util');

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';


interface DataProcessingOptions {
    site: string,
    language: string,
    href: string,
    origin_href: string
}

class WorkerService {
    scheduleOfferHarvesting = (options, delay) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('harvestOffer', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .delay(delay)
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] Offer processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] [%s] Offer processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    };
    
    schedulePictureHarvesting = (options) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('harvestPicture', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Image processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Image processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    };

    scheduleCategoriesProcessing = (options) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processCategories', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Offer categories processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Offer categories processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    };

    scheduleIndexing = (options) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processIndexing', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Offer indexes processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Offer indexes processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    };

    scheduleDataProcessing = (options: DataProcessingOptions) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processData', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Offer parsed data processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Offer parsed data processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    };
}

export default new WorkerService();