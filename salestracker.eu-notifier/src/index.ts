var util = require('util');

var LOG = require('../lib/services/Logger');
var SessionFactory = require("../lib/services/SessionFactory");

var scheduler = SessionFactory.getSchedulerConnection();

var scheduledJob = scheduler.createJob('every', {})
    .attempts(1)
    .removeOnComplete(true)
    .backoff({
        delay: 60 * 1000,
        type: 'exponential'
    })
    .priority('high')
    .removeOnComplete(true)
    .save(function (err) {
        if (err) {
            LOG.error(util.format('[STATUS] [FAILED] [%s] Job not scheduled', err));
        }

        LOG.info(util.format('[STATUS] [OK] Job scheduled'));
    });

scheduler.every('30 seconds', scheduledJob);

scheduler.process('every', function (job, done) {
    console.log(util.format('[STATUS] [OK] Next iteration'), job.data);

    return done();
});
