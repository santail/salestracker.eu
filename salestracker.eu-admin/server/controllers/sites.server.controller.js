'use strict';

var _ = require('lodash');

var errorHandler = require('./errors.server.controller');

var mongoose = require('mongoose');
var Site = mongoose.model('Site');

/**
 * Create a Site
 */
exports.create = function (req, res) {
    var site = new Site(req.body);
    site.user = req.user;

    site.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(site);
        }
    });
};

/**
 * Show the current Site
 */
exports.read = function (req, res) {
    res.jsonp(req.site);
};

/**
 * Update a Site
 */
exports.update = function (req, res) {
    Site.remove({})
        .then(() => {
            const sites = _.map(req.body, site => {
                if (site._id) {
                    delete site._id;
                }

                return new Site(site);
            });

            Site.collection.insertMany(sites)
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
 * Delete an Site
 */
exports.delete = function (req, res) {
    var site = req.site;

    site.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(site);
        }
    });
};

/**
 * List of Sites
 */
exports.list = function (req, res) {
    Site.find({}, function (err, sites) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(sites);
        }
    });
};

/**
 * Site middleware
 */
exports.siteByID = function (req, res, next, id) {
    Site.findById(id).populate('user', 'displayName').exec(function (err, site) {
        if (err) return next(err);
        if (!site) return next(new Error('Failed to load Site ' + id));
        req.site = site;
        next();
    });
};