'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    mongoose = require('mongoose'),
    Offer = mongoose.model('Offer'),
    errorHandler = require('./errors.server.controller'),
    _ = require('lodash');

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
    var sort;
    var sortObject = {};
    var count = req.query.count || 72;
    var page = req.query.page || 0;
    page = page < 0 ? 0 : page;

    var filter = {
        filters: {
            mandatory: {
                contains: req.query.filter
            }
        }
    };

    var pagination = {
        start: page * count,
        count: count
    };

    if (req.query.sorting) {
        var sortKey = Object.keys(req.query.sorting)[0];
        var sortValue = req.query.sorting[sortKey];
        sortObject[sortValue] = sortKey;
    }
    else {
        sortObject.desc = '_id';
    }

    sort = {
        sort: sortObject
    };

    var currentTime = new Date().getTime();
    var criteria = { expires: { $gt:  new Date(currentTime - 1 * 60 * 60 * 60 * 1000) }};

    if (req.query.category) {
        criteria.category = req.query.category; // TODO validate query value against real configs
    }

    if (req.query.site) {
        criteria.site = req.query.site; // TODO validate query value against real configs
    }

    Offer.find(criteria)
        .filter(filter)
        .order(sort)
        .page(pagination, function (err, offers) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err)
                });
            } else {
                res.jsonp(offers);
            }
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

