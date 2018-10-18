'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Wish Schema
 */
var WishSchema = new Schema({
	content: String,
    contacts: {
		email: String,
		phone: String,
	},
	active: Boolean,
    created: { 'type': Date, 'default': Date.now },
	user: { type: Schema.ObjectId, ref: 'User' }
}, {
	autoIndex: process.env.NODE_ENV === 'development'
});

WishSchema.index({
	'content': "text",
	'contacts.phone': "text",
	'contacts.email': "text"
}, {
	name: 'idx_wish_content_phone_email'
});

var Wish = mongoose.model('Wish', WishSchema);

module.exports = Wish;
