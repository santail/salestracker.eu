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
exports.create = function (req, res) {
    let job = {
        search: req.body.searchCriterion
    };

    if (req.body.limit) {
        job.limit = req.body.limit;
    }

    if (req.body.site) {
        job.site = req.body.site;
    }

    jobs
        .create('processSite', job)
        .attempts(3)
        .backoff({ delay: 60 * 1000, type: 'exponential' })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                console.error(util.format('[STATUS] [FAILED] [%s] Job not scheduled', JSON.stringify(job), err));
                return;
            }

            console.info(util.format('[STATUS] [OK] [%s] Job scheduled', JSON.stringify(job)));
        });
};

