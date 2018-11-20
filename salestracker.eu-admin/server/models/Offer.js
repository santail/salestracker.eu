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
	category: String,
    vendor: String,
    price: {
		original: Number,
		current: Number,
		discount: {
			amount: Number,
			percents: Number
		}
	},
	currency: String,
	origin_href: String,
	site: { 'type': String, 'trim': true },
	translations: {
		est: {
			title: { 'type': String, 'trim': true },
			description: { 'type': String, 'trim': true },
			details: { 'type': String, 'trim': true }
		}
	},
    parsed: { 'type': Date, 'default': Date.now },
    expires: { 'type': Date, 'default': Date.now },
	user: { type: Schema.ObjectId, ref: 'User' }
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

OfferSchema.index({
	'url': 1
}, {
	name: 'idx_offer_url'
});

OfferSchema.index({
	'category': "text",
	'brand': "text",
	'title': "text"
}, {
	name: 'idx_offer_category_brand_title'
});

var Offer = mongoose.model('Offer', OfferSchema);

module.exports = Offer;
