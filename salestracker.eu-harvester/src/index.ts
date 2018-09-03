var _ = require('lodash');

var async = require('async');
var fs = require('fs');
var path = require('path');
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
            harvester.cleanupSite(config, function (err) {
                if (err) {
                    LOG.error(util.format('[STATUS] [FAILED] [%s] Site processing failed', config.site, err));
                }

                harvester.processSite(config, function (err) {
                    if (err) {
                        LOG.error(util.format('[STATUS] [FAILED] [%s] Site processing failed', config.site, err));
                        return siteProcessingFinished(err);
                    }

                    LOG.info(util.format('[STATUS] [OK] [%s] Site processing finished', config.site));
                    return siteProcessingFinished();
                });
            });
        };
    });

    async.series(siteHandlers, function (err, results) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] Sites processing failed', err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] Sites processing finished'));
        return done(null, results);
    });
});

worker.process('processPage', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processPage(config, function (err, offers) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Page processing failed', config.site, config.url, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] [%s] Page processing finished', config.site, config.url));
        return done(null, offers);
    });
});

worker.process('processOffer', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processOffer(config, function (err, offers) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Offer processing failed %s', config.site, config.url, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Offer processing finished %s', config.site, config.url));
        return done(null, offers);
    });
});

worker.process('processImage', numParallel, function (job, done) {
    var config = job.data;

    var harvester = new Harvester();
    harvester.processImage(config, function (err, offers) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Image processing failed %s', config.site, config.url, err));
            return done(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Image processing finished %s', config.site, config.url));
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