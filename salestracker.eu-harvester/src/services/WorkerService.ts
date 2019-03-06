var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');


class WorkerService {
    scheduleOfferHarvesting = (options) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('harvestOffer', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] [%s] Offer processing schedule failed', options.site, options.href), err);
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] [%s] Offer processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    }

    scheduleIndexPageProcessing = (options) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('harvestIndexPage', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Index page processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Index page processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    }

    schedulePageProcessing = (options, delay) => {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('harvestPage', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .delay(delay)
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Page processing schedule failed', options.site, options.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Page processing scheduled', options.site, options.href));
                    return fulfill();
                });
        });
    }

    scheduleContentProcessing(data: any): any {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processContent', data)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Offer content processing schedule failed', data.site, data.href, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Offer content processing scheduled', data.site, data.href));
                    return fulfill();
                });
        });
    }

    scheduleImageProcessing(options: any): any {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processImage', options)
                .attempts(3)
                .backoff({
                    delay: 60 * 1000,
                    type: 'exponential'
                })
                .removeOnComplete(true)
                .save(function (err) {
                    if (err) {
                        LOG.error(util.format('[ERROR] [%s] %s Image processing schedule failed', options.site, options.dest, err));
                        return reject(err);
                    }

                    LOG.debug(util.format('[OK] [%s] %s Image processing scheduled', options.site, options.dest));
                    return fulfill();
                });
        });
    }

};

export default new WorkerService();