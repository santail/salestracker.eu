var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');


class WorkerService {
    scheduleOfferProcessing = (options, callback) => {
        SessionFactory.getQueueConnection().create('processOffer', options)
            .attempts(3).backoff({
                delay: 60 * 1000,
                type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
                if (err) {
                    LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', options.site, options.href, err));
                    return callback(err);
                }

                LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', options.site, options.href));
                return callback(null);
            });
    }

    scheduleIndexPageProcessing = (options, callback) => {
        SessionFactory.getQueueConnection().create('processIndexPage', options)
            .attempts(3).backoff({
                delay: 60 * 1000,
                type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
                if (err) {
                    LOG.error(util.format('[STATUS] [FAILED] [%s] %s Index page processing schedule failed', options.site, options.href, err));
                    return callback(err);
                }

                LOG.debug(util.format('[STATUS] [OK] [%s] %s Index page processing scheduled', options.site, options.href));
                return callback(null);
            });
    }

    schedulePageProcessing = (options, callback) => {
        SessionFactory.getQueueConnection().create('processPage', options)
            .attempts(3).backoff({
                delay: 60 * 1000,
                type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
                if (err) {
                    LOG.error(util.format('[STATUS] [FAILED] [%s] %s Page processing schedule failed', options.site, options.href, err));
                    return callback(err);
                }

                LOG.debug(util.format('[STATUS] [OK] [%s] %s Page processing scheduled', options.site, options.href));
                return callback(null);
            });
    }

    scheduleDataProcessing(data: any, callback): any {
        SessionFactory.getQueueConnection().create('processData', data)
            .attempts(3).backoff({
                delay: 60 * 1000,
                type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
                if (err) {
                    LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer data processing schedule failed', data.site, data.href, err));
                    return callback(err);
                }

                LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer data processing scheduled', data.site, data.href));
                return callback(null);
            });
    }

};

export default new WorkerService();