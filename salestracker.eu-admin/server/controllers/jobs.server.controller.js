'use strict';

const util = require("util");

/**
 * Module dependencies.
 */
var errorHandler = require('./errors.server.controller'),
    _ = require('lodash'),
    kue = require('kue');

let REDIS_ADDR = process.env.REDIS_ADDR || '127.0.0.1:6379';

const jobs = kue.createQueue({
    redis: `redis://${REDIS_ADDR}`
});

/**
 * Create a Offer
 */
exports.processSite = function (req, res) {
    const job = {
        'site': req.body.site,
        'should_cleanup': req.body.should_cleanup,
        'cleanup_uploads': req.body.cleanup_uploads
    };

    jobs
        .create(job.site ? 'harvestSite' : 'harvestSites', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( {status: 'ok' } );
        });
};

/**
 * Create a Offer
 */
exports.processContent = function (req, res) {
    const job = {
        'site': req.body.site,
        'language': req.body.language,
        'href': req.body.href,
        'origin_href': req.body.origin_href
    };

    jobs
        .create('processContent', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( {status: 'ok' } );
        });
};

/**
 * Create a Offer
 */
exports.processData = function (req, res) {
    const job = {
        'site': req.body.site,
        'language': req.body.language,
        'href': req.body.href,
        'origin_href': req.body.origin_href
    };

    jobs
        .create('processData', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( {status: 'ok' } );
        });
};

/**
 * Create a Offer
 */
exports.processPictures = function (req, res) {
    const job = {
        'site': req.body.site,
        'language': req.body.language,
        'href': req.body.href,
        'origin_href': req.body.origin_href
    };

    jobs
        .create('requestPicturesHarvesting', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( { status: 'ok' } );
        });
};

/**
 * Create a Offer
 */
exports.stopProcessPictures = function (req, res) {
    const job = {
        'site': req.body.site,
        'language': req.body.language,
        'href': req.body.href,
        'origin_href': req.body.origin_href,
        'process_pictures': true
    };

    jobs
        .create('stopProcessData', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( { status: 'ok' } );
        });
};

/**
 * Create a Offer
 */
exports.processCategories = function (req, res) {
    const job = {
        'site': req.body.site,
        'language': req.body.language,
        'href': req.body.href,
        'origin_href': req.body.origin_href,
        'process_categories': true
    };

    jobs
        .create('processCategories', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( {status: 'ok' } );
        });
};

/**
 * Create a Offer
 */
exports.processIndexing = function (req, res) {
    const job = {
        'site': req.body.site,
        'language': req.body.language,
        'href': req.body.href,
        'origin_href': req.body.origin_href
    };

    jobs
        .create('processIndexing', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[ERROR] [%s] Job not scheduled', JSON.stringify(job), err));
                res.json({ status: 'failed' });
                return;
            }

            console.info(util.format('[OK] [%s] Job scheduled', JSON.stringify(job)));
            res.json( {status: 'ok' } );
        });
};

