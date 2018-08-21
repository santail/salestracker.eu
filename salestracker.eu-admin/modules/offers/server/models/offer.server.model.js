'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Offer Schema
 */
var OfferSchema = new Schema({
	url: String,
	title: {
		'type': String,
		'default': '',
		'required': 'Please fill Offer title',
		'trim': true
	},
	site: {
		'type': String,
		'default': '',
		'required': 'Please fill Offer site',
		'trim': true
	},
	'modified': {
		'type': Date,
		'default': Date.now
	},
	description: String,
	details: String,
	original_price: String,
	price: String,
	discount: String,
	period: String,
	active: Boolean,
	language: String,
	vendor: String,
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	}
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

OfferSchema.index({
	'url': 1
}, {
	name: 'idx_offer_url'
});

OfferSchema.index({
	'title': "text",
	'description': "text",
	'description.long': "text",
	'description.short': "text",
	"language": "text"
}, {
	name: 'idx_offer_title_description',
	default_language: "russian"
});

mongoose.model('Offer', OfferSchema);