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

    var must = [];
    var mustNot = [];
    
    var filters = [];

    if (req.query.filter) {
        must.push({
            "match_phrase": {
                "title": req.query.filter
            }
        });
    }

    if (req.query.site) {
        must.push({
            "term": {
                "site": req.query.site
            }
        });
    }

    if (req.query.category) {
        must.push({
            "term": {
                "category": req.query.category
            }
        });
    } else {
        mustNot.push({
            "exists": {
                "field": "category"
            }
        });
    }

    let bool = {};

    if (filters.length) {
        bool.filter = filters;
    }

    if (must.length) {
        bool.must = must;
    }

    if (mustNot.length) {
        bool.must_not = mustNot;
    }

    let body = {
        "from": page * count,
        "size": count,
        "query": {
            "bool": bool
        },
        "sort" : [{
            "price.discount.amount" : {
                "order" : "desc",
                "nested": {
                    "path": "price"
                }
            }
        }, {
            "price.discount.percents" : {
                "order" : "desc",
                "nested": {
                    "path": "price"
                }
            }
        }]
    };

    let promises = _.map(['est', 'eng', 'rus'], language => {
        return elastic.search({
            index: 'salestracker-' + language,
            type: 'offers',
            body: body
        })
        .then(response => {
            response.language = language;

            return Promise.resolve(response);
        });
    });

    Promise.all(promises)
        .then(results => {
            const maxResult = _.maxBy(results, result => {
                return result.hits ? result.hits.total : 0;
            });

            if (!maxResult.hits || !maxResult.hits.hits) {
                res.jsonp({
                    total: 0,
                    results: []
                });
                
                return;
            }

            var offers = _.map(maxResult.hits.hits, hit => {
                var offer = hit._source;
    
                if (!offer.downloads || !offer.downloads.pictures) {
                    offer.downloads = {
                        pictures: []
                    };
                }
    
                offer.downloads.pictures = _.map(offer.downloads.pictures, picture => {
                    const parsedPath = path.parse(picture.path);
    
                    return path.format({
                        dir: path.join(offer.site, parsedPath.dir),
                        name: parsedPath.name + '_200x200',
                        ext: '.png'
                    });
                });
    
                return offer;
            });
    
            res.jsonp({
                total: maxResult.hits.total,
                results: offers
            });
        })
        .catch(err => {
            return res.status(400).send({
                message: JSON.stringify(err)
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