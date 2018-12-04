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
	downloads: {
		pictures: []
	},
    parsed: { 'type': Date, 'default': Date.now },
    expires: { 'type': Date, 'default': Date.now },
	user: { type: Schema.ObjectId, ref: 'User' }
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

OfferSchema.index({
	'origin_href': 1
}, {
	name: 'idx_offer_origin_href'
});

OfferSchema.index({
	'site': 1,
	'expires': 1,
	'category': 1
}, {
	name: 'idx_offer_admin_filtering'
});

OfferSchema.index({
	'site': "text",
	'expires': 1
}, {
	name: 'idx_offer_site_expires'
});

var Offer = mongoose.model('Offer', OfferSchema);

module.exports = Offer;
