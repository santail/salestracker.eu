'use strict';

/**
 * Module dependencies.
 */
var elasticsearch = require('elasticsearch');
var errorHandler = require('./errors.server.controller');
var _ = require('lodash');
var mongoose = require('mongoose');
var Offer = mongoose.model('Offer');
var path = require('path');

let ELASTIC_ADDR = process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200';

const elastic = new elasticsearch.Client({
    host: ELASTIC_ADDR,
    log: 'error'
});

/**
 * Create a Offer
 */
exports.create = function (req, res) {
    var offer = new Offer(req.body);
    offer.user = req.user;

    offer.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(offer);
        }
    });
};

/**
 * Show the current Offer
 */
exports.read = function (req, res) {
    res.jsonp(req.offer);
};

/**
 * Update a Offer
 */
exports.update = function (req, res) {
    var offer = req.offer;

    offer = _.extend(offer, req.body);

    offer.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(offer);
        }
    });
};

/**
 * Delete an Offer
 */
exports.delete = function (req, res) {
    var offer = req.offer;

    offer.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(offer);
        }
    });
};

/**
 * List of Offers
 */
exports.list = function (req, res) {
    var currentTime = new Date().getTime();

    var count = req.query.count || 72;
    var page = req.query.page || 0;
    page = page < 0 ? 0 : page;

    var criteria = [];
    var filters = [{
        "range": {
            "expires": {
                "gt": new Date(currentTime - 6 * 60 * 60 * 1000)
            }
        }
    }];

    if (req.query.filter) {
        criteria.push({
            "match_phrase": {
                "title": req.query.filter
            }
        });
    }

    if (req.query.site) {
        criteria.push({
            "term": {
                "site": req.query.site
            }
        });
    }

    elastic.search({
        index: 'salestracker-eng',
        type: 'offers',
        body: {
            "from": page * count,
            "size": count,
            "query": {
                "bool": {
                    "should": criteria,
                    "filter": filters
                }
            }
        }
    }, function (err, response) {
        if (err) {
            return res.status(400).send({
                message: JSON.stringify(err)
            });
        }

        if (!response.hits || !response.hits.hits) {
            res.jsonp({
                total: 0,
                results: []
            });
            
            return;
        }

        var offers = _.map(response.hits.hits, function (hit) {
            var offer = hit._source;

            if (!offer.downloads || !offer.downloads.pictures) {
                offer.downloads = {
                    pictures: []
                }
            }

            offer.downloads.pictures = _.map(offer.downloads.pictures, picture => {
                const parsedPath = path.parse(picture);

                return path.format({
                    dir: parsedPath.dir,
                    name: parsedPath.name + '_200x200',
                    ext: '.png'
                });
            });

            return offer;
        });

        res.jsonp({
            total: response.hits.total,
            results: offers
        });
    });
};

/**
 * Offer middleware
 */
exports.offerByID = function (req, res, next, id) {
    Offer.findById(id).populate('user', 'displayName').exec(function (err, offer) {
        if (err) return next(err);
        if (!offer) return next(new Error('Failed to load Offer ' + id));
        req.offer = offer;
        next();
    });
};