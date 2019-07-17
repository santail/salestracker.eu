const _ = require('lodash');
const Promise: PromiseConstructor = require('promise');
const util = require('util');

import LOG from "../lib/services/Logger";
import SessionFactory from '../lib/services/SessionFactory';

import harvester from './services/Harvester';
import WorkerService from "./services/WorkerService";


const numParallel = 2;

const SITES = [{
    "site": "www.barbora.ee",
    "interval": 3600000
}, {
    "site": "www.babycity.ee",
    "interval": 3600000
}, {
    "site": "www.ecoop.ee",
    "interval": 3600000
}, {
    "site": "www.minuvalik.ee",
    "interval": 3600000
}, {
    "site": "www.selver.ee",
    "interval": 3600000
}, {
    "site": "www.zoomaailm.ee",
    "interval": 3600000
}, {
    "site": "www.asos.com.men",
    "interval": 3600000
}, {
    "site": "www.asos.com.women",
    "interval": 3600000
}, {
    "site": "www.rimi.ee",
    "interval": 3600000
}, {
    "site": "www.euronics.ee",
    "interval": 3600000
}];

let worker = SessionFactory.getQueueConnection();
let harvestingJobs: {[site: string]: NodeJS.Timer} = {};

worker.process('harvestSite', numParallel, requestSiteHarvesting);

worker.process('harvestIndexPage', numParallel, harvestIndexPage);

worker.process('harvestPage', numParallel, harvestPage);

worker.process('harvestOffer', numParallel, harvestOffer);

worker.process('harvestPicture', numParallel, harvestPicture);

/**
 * Starts defined site harvesting and schedules further harvesting requests with defined interval
 *
 * @param config
 */
function requestSiteHarvesting(job, done) {
    let config = job.data;

    LOG.info(util.format('[OK] [%s] Site harvesting started', config.site));

    clearInterval(harvestingJobs[config.site]);

    harvestingJobs[config.site] = setInterval(() => {
        harvestSite(config);
    }, 3600000);

    harvestSite(config);

    done();
}

function harvestSite(config) {
    // cleanup site only if job configuration requires it
    const cleanupPromise = harvester.cleanupSite(config);
    const processSitePromise = harvester.harvestSite(config);

    return Promise.all([cleanupPromise, processSitePromise])
        .then(() => {
            LOG.info(util.format('[OK] [%s] Site harvesting finished', config.site));
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] Site harvesting failed', config.site, err));
        });
}

function harvestIndexPage(job, done) {
    let config = job.data;

    harvester.harvestIndexPage(config)
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] Index page harvesting finished', config.site, config.href));
            done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] Index page harvesting failed', config.site, config.href, err));
            done();
        });
};

function harvestPage(job, done) {
    let config = job.data;

    harvester.harvestPage(config)
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] Page harvesting finished', config.site, config.href));
            done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] Page harvesting failed', config.site, config.href, err));
            done();
        });
};

function harvestOffer(job, done) {
    let config = job.data;

    harvester.harvestOffer(config)
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] Offer harvesting finished', config.site, config.href));
            done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] Offer harvesting failed', config.site, config.href, err));
            done();
        });
};

function harvestPicture(job, done) {
    let config = job.data;

    harvester.harvestPicture(config)
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] [%s] Image harvesting finished', config.site, config.origin_href, config.picture_href));
            done();
        })
        .catch(error => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] Image harvesting failed', config.site, config.origin_href, config.picture_href), error);
            done();
        });
};
