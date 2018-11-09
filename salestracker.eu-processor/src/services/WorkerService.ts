
var util = require('util');


var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();

class WorkerService {

    scheduleOfferProcessing(options) {
        worker.create('processOffer', options)
        .attempts(3).backoff({
            delay: 60 * 1000,
            type: 'exponential'
        })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', options.site, options.href, err));
            }

            LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', options.site, options.href));
        });
    }

    scheduleImageProcessing(options) {
        worker.create('processImage', options)
        .attempts(3).backoff({
            delay: 60 * 1000,
            type: 'exponential'
        })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                LOG.error(util.format('[STATUS] [FAILED] [%s] %s Image processing schedule failed', options.site, options.href, err));
            }

            LOG.debug(util.format('[STATUS] [OK] [%s] %s Image processing scheduled', options.site, options.href));
        });
    }
};

export default new WorkerService();