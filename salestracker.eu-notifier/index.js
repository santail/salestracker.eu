var util = require('util');

var LOG = require('./lib/services/Logger');
var SessionFactory = require('./lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();
var scheduler = SessionFactory.getSchedulerConnection();

var scheduledJob = scheduler.createJob('every', {})
    .attempts(1)
    .removeOnComplete(true)
    .backoff({
        delay: 60 * 1000,
        type: 'exponential'
    })
    .priority('high');

//schedule it to run every 2 seconds
scheduler.every('30 seconds', scheduledJob);

//somewhere process your scheduled jobs
scheduler.process('every', function (job, done) {
    LOG.info(util.format('[STATUS] [OK] Next iteration'));

    return done();
});
