var _ = require('lodash');

var async = require('async');
var fs = require('fs');
var path = require('path');
var Promise: PromiseConstructor = require('promise');
var util = require('util');

var Harvester = require('./services/Harvester');

var LOG = require('../lib/services/Logger');
var SessionFactory = require('../lib/services/SessionFactory');

var numParallel = 2;

var sites = [{
    site: 'www.minuvalik.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.selver.ee',
    interval: 1 * 60 * 60 * 1000
}];

var worker = SessionFactory.getQueueConnection();

_.each(sites, function (config) {
    setInterval(function () {
        start(config);
    }, config.interval);

    start(config);
});

function start(config) {
    worker.createJob('processSite', config)
        .attempts(3)
        .backoff({
            delay: 60 * 1000,
            type: 'exponential'
        })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                LOG.error(util.format('[STATUS] [Failure] [%s] Site processing not scheduled', config.site, err));
            }

            LOG.info(util.format('[STATUS] [OK] [%s] Site processing scheduled', config.site));
        });
};

worker.process('processSite', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();

    // cleanup site only if job configuration requires it
    const cleanupPromise = harvester.cleanupSite(config)
        .then(function () {
            LOG.info(util.format('[STATUS] [OK] [%s] Site cleanup finished', config.site));
        }, function (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Site cleanup failed', config.site, err));
        });

    const processSitePromise = harvester.processSite(config)
        .then(function () {
            LOG.info(util.format('[STATUS] [OK] [%s] Getting latest offers finished', config.site));
        }, function (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Getting latest offers failed', config.site, err));
        });

    Promise.all([cleanupPromise, processSitePromise])
        .then(function (result) {
            LOG.info(util.format('[STATUS] [OK] Sites harvesting finished'));
            return done(null, result);
        }, function (err) {
            LOG.error(util.format('[STATUS] [Failure] Sites harvesting failed', err));
            return done(err);
        });
});

worker.process('processPage', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processPage(config, function (err, result) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Page harvesting failed', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] [%s] Page harvesting finished', config.site, config.href));
        return done(null, result);
    });
});

worker.process('processOffer', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processOffer(config, function (err, result) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Offer harvesting failed %s', config.site, config.href, err));
            return done(err);
        }

        LOG.debug(util.format('[STATUS] [OK] [%s] Offer harvesting finished %s', config.site, config.href));
        return done(null, result);
    });
});

worker.process('processImage', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processImage(config, function (err, result) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Image harvesting failed %s', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Image harvesting finished %s', config.site, config.href));
        return done(null, result);
    });
});
