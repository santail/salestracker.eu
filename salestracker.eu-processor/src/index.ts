var util = require('util');

var LOG = require("../lib/services/Logger");
var SessionFactory = require('../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();

worker.process('processData', 10, function (job, done) {
    var offer = job.data;

    SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(err);
        }

        if (!saved) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(new Error('DB save query failed'));
        }

        LOG.debug(util.format('[STATUS] [OK] [%s] Offer saved %s', offer.site, offer.url));
        return done(null, saved);
    });
});
