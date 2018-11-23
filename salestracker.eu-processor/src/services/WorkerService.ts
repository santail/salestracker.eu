
var util = require('util');


var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();

class WorkerService {

    scheduleOfferProcessing(options) {
        worker.create('harvestOffer', options)
        .attempts(3).backoff({
            delay: 60 * 1000,
            type: 'exponential'
        })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] %s Offer processing schedule failed', options.site, options.href, err));
            }

            LOG.debug(util.format('[OK] [%s] %s Offer processing scheduled', options.site, options.href));
        });
    }

    scheduleImageHarvesting(options) {
        worker.create('harvestImage', options)
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
};

export default new WorkerService();