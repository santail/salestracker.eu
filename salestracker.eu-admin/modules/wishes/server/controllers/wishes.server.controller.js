'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Wish = mongoose.model('Wish'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  _ = require('lodash');

/**
 * Create a wish
 */
exports.create = function (req, res) {
  var wish = new Wish(req.body);
  wish.user = req.user;

  wish.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wish);
    }
  });
};

/**
 * Show the current wish
 */
exports.read = function (req, res) {
  res.json(req.wish);
};

/**
 * Update a wish
 */
exports.update = function (req, res) {
  var wish = req.wish;

	wish = _.extend(wish , req.body);

  wish.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wish);
    }
  });
};

/**
 * Delete an wish
 */
exports.delete = function (req, res) {
  var wish = req.wish;

  wish.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wish);
    }
  });
};

/**
 * List of Wishes
 */
exports.list = function(req, res) {

	var sort;
	var sortObject = {};
	var count = req.query.count || 5;
	var page = req.query.page || 1;

	var filter = {
		filters : {
			mandatory : {
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

	Wish
		.find()
		.filter(filter)
		.order(sort)
		.page(pagination, function(err, wishes){
			if (err) {
				return res.status(400).send({
					message: errorHandler.getErrorMessage(err)
				});
			} else {
				res.jsonp(wishes);
			}
		});

};

/**
 * Wish middleware
 */
exports.wishByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Wish is invalid'
    });
  }

  Wish.findById(id).populate('user', 'displayName').exec(function (err, wish) {
    if (err) {
      return next(err);
    } else if (!wish) {
      return res.status(404).send({
        message: 'No wish with that identifier has been found'
      });
    }
    req.wish = wish;
    next();
  });
};
