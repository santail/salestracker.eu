'use strict';

var should = require('should'),
	request = require('supertest'),
	app = require('../../server'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Offer = mongoose.model('Offer'),
	agent = request.agent(app);

/**
 * Globals
 */
var credentials, user, offer;

/**
 * Offer routes tests
 */
describe('Offer CRUD tests', function() {
	beforeEach(function(done) {
		// Create user credentials
		credentials = {
			username: 'username',
			password: 'password'
		};

		// Create a new user
		user = new User({
			firstName: 'Full',
			lastName: 'Name',
			displayName: 'Full Name',
			email: 'test@test.com',
			username: credentials.username,
			password: credentials.password,
			provider: 'local'
		});

		// Save a user to the test db and create new Offer
		user.save(function() {
			offer = {
				name: 'Offer Name'
			};

			done();
		});
	});

	it('should be able to save Offer instance if logged in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Offer
				agent.post('/offers')
					.send(offer)
					.expect(200)
					.end(function(offerSaveErr, offerSaveRes) {
						// Handle Offer save error
						if (offerSaveErr) done(offerSaveErr);

						// Get a list of Offers
						agent.get('/offers')
							.end(function(offersGetErr, offersGetRes) {
								// Handle Offer save error
								if (offersGetErr) done(offersGetErr);

								// Get Offers list
								var offers = offersGetRes.body;

								// Set assertions
								(offers[0].user._id).should.equal(userId);
								(offers[0].name).should.match('Offer Name');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to save Offer instance if not logged in', function(done) {
		agent.post('/offers')
			.send(offer)
			.expect(401)
			.end(function(offerSaveErr, offerSaveRes) {
				// Call the assertion callback
				done(offerSaveErr);
			});
	});

	it('should not be able to save Offer instance if no name is provided', function(done) {
		// Invalidate name field
		offer.name = '';

		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Offer
				agent.post('/offers')
					.send(offer)
					.expect(400)
					.end(function(offerSaveErr, offerSaveRes) {
						// Set message assertion
						(offerSaveRes.body.message).should.match('Please fill Offer name');

						// Handle Offer save error
						done(offerSaveErr);
					});
			});
	});

	it('should be able to update Offer instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Offer
				agent.post('/offers')
					.send(offer)
					.expect(200)
					.end(function(offerSaveErr, offerSaveRes) {
						// Handle Offer save error
						if (offerSaveErr) done(offerSaveErr);

						// Update Offer name
						offer.name = 'WHY YOU GOTTA BE SO MEAN?';

						// Update existing Offer
						agent.put('/offers/' + offerSaveRes.body._id)
							.send(offer)
							.expect(200)
							.end(function(offerUpdateErr, offerUpdateRes) {
								// Handle Offer update error
								if (offerUpdateErr) done(offerUpdateErr);

								// Set assertions
								(offerUpdateRes.body._id).should.equal(offerSaveRes.body._id);
								(offerUpdateRes.body.name).should.match('WHY YOU GOTTA BE SO MEAN?');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should be able to get a list of Offers if not signed in', function(done) {
		// Create new Offer model instance
		var offerObj = new Offer(offer);

		// Save the Offer
		offerObj.save(function() {
			// Request Offers
			request(app).get('/offers')
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Array.with.lengthOf(1);

					// Call the assertion callback
					done();
				});

		});
	});


	it('should be able to get a single Offer if not signed in', function(done) {
		// Create new Offer model instance
		var offerObj = new Offer(offer);

		// Save the Offer
		offerObj.save(function() {
			request(app).get('/offers/' + offerObj._id)
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Object.with.property('name', offer.name);

					// Call the assertion callback
					done();
				});
		});
	});

	it('should be able to delete Offer instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Offer
				agent.post('/offers')
					.send(offer)
					.expect(200)
					.end(function(offerSaveErr, offerSaveRes) {
						// Handle Offer save error
						if (offerSaveErr) done(offerSaveErr);

						// Delete existing Offer
						agent.delete('/offers/' + offerSaveRes.body._id)
							.send(offer)
							.expect(200)
							.end(function(offerDeleteErr, offerDeleteRes) {
								// Handle Offer error error
								if (offerDeleteErr) done(offerDeleteErr);

								// Set assertions
								(offerDeleteRes.body._id).should.equal(offerSaveRes.body._id);

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to delete Offer instance if not signed in', function(done) {
		// Set Offer user
		offer.user = user;

		// Create new Offer model instance
		var offerObj = new Offer(offer);

		// Save the Offer
		offerObj.save(function() {
			// Try deleting Offer
			request(app).delete('/offers/' + offerObj._id)
			.expect(401)
			.end(function(offerDeleteErr, offerDeleteRes) {
				// Set message assertion
				(offerDeleteRes.body.message).should.match('User is not logged in');

				// Handle Offer error error
				done(offerDeleteErr);
			});

		});
	});

	afterEach(function(done) {
		User.remove().exec();
		Offer.remove().exec();
		done();
	});
});