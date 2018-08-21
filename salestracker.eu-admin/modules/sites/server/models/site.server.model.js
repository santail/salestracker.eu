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
	name: {
		type: String,
		default: '',
		required: 'Please fill Site name',
		trim: true
	},
	url: {
		type: String,
		default: '',
		required: 'Please fill Site url',
		trim: true
	},
	is_active: {
		type: Boolean,
		default: false
	},
	created: {
		type: Date,
		default: Date.now
	},
	'modified': {
		'type': Date,
		'default': Date.now
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	}
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

mongoose.model('Site', SiteSchema);