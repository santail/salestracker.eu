'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Offer Schema
 */
let OfferSchema = new Schema({
	category: String,
    brand: String,
    price: String,
	discount: String,
	url: String,
	site: { 'type': String, 'trim': true },
	active: Boolean,
	title: { 'type': String, 'trim': true },
    parsed: { 'type': Date, 'default': Date.now },
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

mongoose.model('Offer', OfferSchema);

