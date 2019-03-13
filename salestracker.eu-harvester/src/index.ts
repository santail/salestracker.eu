const _ = require('lodash');
const Promise: PromiseConstructor = require('promise');
const util = require('util');

import LOG from "../lib/services/Logger";
import SessionFactory from '../lib/services/SessionFactory';

import harvester from './services/Harvester';


const numParallel = 2;

const SITES = [{
    site: 'www.barbora.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.babycity.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.ecoop.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.minuvalik.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.selver.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.zoomaailm.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.asos.com.men',
    interval: 60 * 60 * 1000
}, {
    site: 'www.asos.com.women',
    interval: 60 * 60 * 1000
}, {
    site: 'www.rimi.ee',
    interval: 60 * 60 * 1000
}, {
    site: 'www.euronics.ee',
    interval: 2 * 60 * 1000
}];

let worker = SessionFactory.getQueueConnection();
let harvestingJobs: {[site: string]: NodeJS.Timer} = {};

worker.process('harvestSite', numParallel, function (job, done) {
    let config = job.data;

    if (!config.site || !config.site.length) {
        requestAllSitesHarvesting();
        return done();
    }
    else {
        requestSingleSiteHarvesting(config)
            .then(result => {
                LOG.info(util.format('[OK] Sites harvesting finished'));
                return done(null, result);
            }, err => {
                LOG.error(util.format('[ERROR] Sites harvesting failed', err));
                return done(err);
            });
    }
});

/**
 * Runs harvesting for all sites for defined interval.
 * No clean-up performed
 */
function requestAllSitesHarvesting() {
    _.each(_.keys(harvestingJobs), site => {
        clearInterval(harvestingJobs[site]);
    });

    _.each(SITES, siteConfig => {
        harvestingJobs[siteConfig.site] = setInterval(() => {
            scheduleSiteHarvesting(siteConfig);
        }, siteConfig.interval);

        scheduleSiteHarvesting(siteConfig);
    });
}

/**
 * Starts defined site harvesting and schedules further harvesting requests with defined interval
 *
 * @param config
 */
function requestSingleSiteHarvesting(config) {
    clearInterval(harvestingJobs[config.site]);

    harvestingJobs[config.site] = setInterval(() => {
        scheduleSiteHarvesting(_.extend({
            should_cleanup: false,
            cleanup_uploads: false
        } as any, config));
    }, 60 * 60 * 1000);

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

    return Promise.all([cleanupPromise, processSitePromise]);
}

function scheduleSiteHarvesting(config) {
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
}

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