'use strict';

/**
 * Module dependencies.
 */
var errorHandler = require('./errors.server.controller');
var _ = require('lodash');
var mongoose = require('mongoose');

var Category = mongoose.model('Category');
var Offer = mongoose.model('Offer');

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
    Category.remove({})
        .then(() => {
            const categories = _.map(req.body, category => {
                if (category._id) {
                    delete category._id;
                }

                return new Category(category);
            });

            Category.collection.insertMany(categories)
                .then((data) => {
                    res.jsonp(data);
                })
                .catch((err) => {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                })
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
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
 * List of categories
 */
exports.list = function (req, res) {
    Category.find({}, function (err, categories) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(categories);
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