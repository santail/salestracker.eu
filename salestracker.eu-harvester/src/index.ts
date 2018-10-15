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
    site: 'www.minuvalik.ee'
}];

var worker = SessionFactory.getQueueConnection();

worker.createJob('processSite', {
        'site': 'www.minuvalik.ee'
    })
    .attempts(3)
    .backoff({
        delay: 60 * 1000,
        type: 'exponential'
    })
    .removeOnComplete(true)
    .save(function (err) {
        if (err) {
            LOG.error(util.format('[STATUS] [FAILED] [%s] Job not scheduled', err));
        }

        LOG.info(util.format('[STATUS] [OK] Job scheduled'));
    });

worker.process('processSite', numParallel, function (job, done) {
    var config = job.data;

    let processingSites: any = [];

    if (config.site) {
        processingSites = [{
            site: config.site
        }];
    } else {
        cleanUploads();
        processingSites = _.cloneDeep(sites);
    }

    var siteHandlers = _.map(processingSites, function (site) {
        config.site = site.site;

        return function (siteProcessingFinished) {
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

            Promise.all([cleanupPromise, processSitePromise]).then(function () {
                return siteProcessingFinished();
            }, function (err) {
                return siteProcessingFinished(err);
            })
        };
    });

    async.series(siteHandlers, function (err, results) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] Sites harvesting failed', err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] Sites harvesting finished'));
        return done(null, results);
    });
});

worker.process('processPage', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processPage(config, function (err, offers) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Page harvesting failed', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] [%s] Page harvesting finished', config.site, config.href));
        return done(null, offers);
    });
});

worker.process('processOffer', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processOffer(config, function (err, offers) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Offer harvesting failed %s', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Offer harvesting finished %s', config.site, config.href));
        return done(null, offers);
    });
});

worker.process('processImage', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processImage(config, function (err, offers) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Image harvesting failed %s', config.site, config.href, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Image harvesting finished %s', config.site, config.href));
        return done(null, offers);
    });
});

var cleanUploads = function () {
    var uploadsPath = path.join(process.cwd(), './uploads/offers/');

    fs.readdir(uploadsPath, function (err, files) {
        if (err) {
            LOG.error(util.format('[STATUS] [FAILED] Error reading uploads directory', err));
        } else {
            if (files.length !== 0) {
                _.each(files, function (file) {
                    var filePath = uploadsPath + file;
                    fs.stat(filePath, function (err, stats) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [FAILED] Error reading uploaded file', err));
                        } else {
                            if (stats.isFile()) {
                                fs.unlink(filePath, function (err) {
                                    if (err) {
                                        LOG.error(util.format('[STATUS] [FAILED] Error deleting uploaded file', err));
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }
    });
};