let _ = require('lodash');

let Promise: PromiseConstructor = require('promise');
let util = require('util');

import harvester from './services/Harvester';

let LOG = require('../lib/services/Logger');
let SessionFactory = require('../lib/services/SessionFactory');

let numParallel = 2;

let sites = [{
    site: 'www.barbora.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.babycity.ee',
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
}, {
    site: 'www.rimi.ee',
    interval: 1 * 60 * 60 * 1000
}, {
    site: 'www.euronics.ee',
    interval: 2 * 60 * 1000
}];

let worker = SessionFactory.getQueueConnection();
let harvestingJobs: {[site: string]: NodeJS.Timer} = {};

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
    let config = job.data;

    if (!config.site || !config.site.length) {
        _.each(_.keys(harvestingJobs), site => {
            clearInterval(harvestingJobs[site]);
        })

        _.each(sites, config => {
            let job = setInterval(() => {
                start(config);
            }, config.interval);
        
            harvestingJobs[config.site] = job;

            start(config);
        });

        return done();
    }

    clearInterval(harvestingJobs[config.site]);

    let interval = setInterval(() => {
        config.should_cleanup = false;
        config.cleanup_uploads = false;
        
        start(config);
    }, 1 * 60 * 60 * 1000);

    harvestingJobs[config.site] = interval;

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
        .then(result => {
            LOG.info(util.format('[OK] Sites harvesting finished'));
            return done(null, result);
        }, err => {
            LOG.error(util.format('[ERROR] Sites harvesting failed', err));
            return done(err);
        });
});

worker.process('harvestIndexPage', numParallel, function (job, done) {
    let config = job.data;

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
    let config = job.data;

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
    let config = job.data;

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
    let config = job.data;

    harvester.harvestPicture(config)
        .then(result => {
            LOG.info(util.format('[OK] [%s] [%s] [%s] Image harvesting finished', config.site, config.origin_href, config.picture_href));
            return done(null, result);
        })
        .catch(error => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] Image harvesting failed', config.site, config.origin_href, config.picture_href), error);
            return done(error);
        });
});