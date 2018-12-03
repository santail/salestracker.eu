var _ = require('lodash');

var Promise: PromiseConstructor = require('promise');
var util = require('util');

import harvester from './services/Harvester';

var LOG = require('../lib/services/Logger');
var SessionFactory = require('../lib/services/SessionFactory');

var numParallel = 2;

var sites = [{
    site: 'www.barbora.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.ecoop.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.minuvalik.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.selver.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.zoomaailm.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.asos.com.men',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.asos.com.women',
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
    worker.createJob('harvestSite', config)
        .attempts(3)
        .backoff({
            delay: 60 * 1000,
            type: 'exponential'
        })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] Site processing not scheduled', config.site, err));
            }

            LOG.info(util.format('[OK] [%s] Site processing scheduled', config.site));
        });
};

worker.process('harvestSite', numParallel, function (job, done) {
    var config = job.data;

    // cleanup site only if job configuration requires it
    const cleanupPromise = harvester.cleanupSite(config)
        .then(function () {
            LOG.info(util.format('[OK] [%s] Site cleanup finished', config.site));
        }, function (err) {
            LOG.error(util.format('[ERROR] [%s] Site cleanup failed', config.site, err));
        });

    const processSitePromise = harvester.harvestSite(config)
        .then(function () {
            LOG.info(util.format('[OK] [%s] Getting latest offers finished', config.site));
        }, function (err) {
            LOG.error(util.format('[ERROR] [%s] Getting latest offers failed', config.site, err));
        });

    Promise.all([cleanupPromise, processSitePromise])
        .then(function (result) {
            LOG.info(util.format('[OK] Sites harvesting finished'));
            return done(null, result);
        }, function (err) {
            LOG.error(util.format('[ERROR] Sites harvesting failed', err));
            return done(err);
        });
});

worker.process('harvestIndexPage', numParallel, function (job, done) {
    var config = job.data;

    harvester.harvestIndexPage(config, function (err, result) {
        if (err) {
            LOG.error(util.format('[ERROR] [%s] [%s] Index page harvesting failed', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[OK] [%s] [%s] Index page harvesting finished', config.site, config.href));
        return done(null, result);
    });
});

worker.process('harvestPage', numParallel, function (job, done) {
    var config = job.data;

    harvester.harvestPage(config, function (err, result) {
        if (err) {
            LOG.error(util.format('[ERROR] [%s] [%s] Page harvesting failed', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[OK] [%s] [%s] Page harvesting finished', config.site, config.href));
        return done(null, result);
    });
});

worker.process('harvestOffer', numParallel, function (job, done) {
    var config = job.data;

    harvester.harvestOffer(config, function (err, result) {
        if (err) {
            LOG.error(util.format('[ERROR] [%s] Offer harvesting failed %s', config.site, config.href, err));
            return done(err);
        }

        LOG.debug(util.format('[OK] [%s] Offer harvesting finished %s', config.site, config.href));
        return done(null, result);
    });
});

worker.process('harvestPicture', numParallel, function (job, done) {
    var config = job.data;

    harvester.harvestPicture(config)
        .then(result => {
            LOG.info(util.format('[OK] [%s] Image harvesting finished %s', config.site, config.href));
            return done(null, result);
        })
        .catch(error => {
            LOG.error(util.format('[ERROR] [%s] Image harvesting failed %s', config.site, config.href, error));
            return done(error);
        });
});