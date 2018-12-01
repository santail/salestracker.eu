
var util = require('util');


var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');


class WorkerService {

    scheduleImageHarvesting(options) {
        SessionFactory.getQueueConnection().create('harvestImage', options)
            .attempts(3).backoff({
                delay: 60 * 1000,
                type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] %s Image processing schedule failed', options.site, options.href, err));
                }

                LOG.debug(util.format('[OK] [%s] %s Image processing scheduled', options.site, options.href));
            });
    }

    scheduleCategoriesProcessing(options) {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processCategories', options)
                .attempts(3).backoff({
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
                    return fulfill(err);
                });
        });
    }

    scheduleDataProcessing(options) {
        return new Promise((fulfill, reject) => {
            SessionFactory.getQueueConnection().create('processData', options)
                .attempts(3).backoff({
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
                    return fulfill(err);
                });
        });
    }
};

export default new WorkerService();