'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Category Schema
 */
var CategorySchema = new Schema({
	category: String,
    tags: [String]
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

var Category = mongoose.model('Category', CategorySchema);

module.exports = Category;
