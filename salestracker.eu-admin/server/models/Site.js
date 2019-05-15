'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Site Schema
 */
var SiteSchema = new Schema({
	name: String,
	href: String,
	active: Boolean,
    created: { 'type': Date, 'default': Date.now },
    modified: { 'type': Date, 'default': Date.now }
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

var Site = mongoose.model('Site', SiteSchema);

module.exports = Site;
