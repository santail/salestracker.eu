'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Site = mongoose.model('Site'),
	errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
	_ = require('lodash');

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
		}
		else {
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
	var site = req.site;

	site = _.extend(site, req.body);

	site.save(function (err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		}
		else {
			res.jsonp(site);
		}
	});
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
		}
		else {
			res.jsonp(site);
		}
	});
};

/**
 * List of Sites
 */
exports.list = function (req, res) {

	var sort;
	var sortObject = {};
	var count = req.query.count || 5;
	var page = req.query.page || 1;


	var filter = {
		filters: {
			mandatory: {
				contains: req.query.filter
			}
		}
	};

	var pagination = {
		start: (page - 1) * count,
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


	Site
		.find()
		.filter(filter)
		.order(sort)
		.page(pagination, function (err, sites) {
			if (err) {
				return res.status(400).send({
					message: errorHandler.getErrorMessage(err)
				});
			}
			else {
				res.jsonp(sites);
			}
		});

};

exports.all = function (req, res) {

	Site
	.find({
		is_active: true
	})
	.sort('name')
	.exec(function (err, sites) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		}
		else {
			res.jsonp(sites);
		}
	});
};

/**
 * Site middleware
 */
exports.siteByID = function (req, res, next, id) {

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).send({
			message: 'Site is invalid'
		});
	}

	Site.findById(id).populate('user', 'displayName').exec(function (err, site) {
		if (err) return next(err);
		if (!site) return next(new Error('Failed to load Site ' + id));
		req.site = site;
		next();
	});
};
