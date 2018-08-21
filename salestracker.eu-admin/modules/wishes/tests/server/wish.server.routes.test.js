'use strict';

var should = require('should'),
	request = require('supertest'),
	app = require('../../../../server'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Wish = mongoose.model('Wish'),
	agent = request.agent(app);

/**
 * Globals
 */
var credentials, user, wish;

/**
 * Wish routes tests
 */
describe('Wish CRUD tests', function() {
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

		// Save a user to the test db and create new Wish
		user.save(function() {
			wish = {
				contains: 'Wish Name',
				email: 'some@email.com'
			};

			done();
		});
	});

	it('should be able to save Wish instance if logged in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Wish
				agent.post('/wishes')
					.send(wish)
					.expect(200)
					.end(function(wishSaveErr, wishSaveRes) {
						// Handle Wish save error
						if (wishSaveErr) done(wishSaveErr);

						// Get a list of Wishes
						agent.get('/wishes')
							.end(function(wishesGetErr, wishesGetRes) {
								// Handle Wish save error
								if (wishesGetErr) done(wishesGetErr);

								// Get Wishes list
								var wishes = wishesGetRes.body;

								// Set assertions
								(wishes[0].user._id).should.equal(userId);
								(wishes[0].contains).should.match('Wish Name');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to save Wish instance if not logged in', function(done) {
		agent.post('/wishes')
			.send(wish)
			.expect(401)
			.end(function(wishSaveErr, wishSaveRes) {
				// Call the assertion callback
				done(wishSaveErr);
			});
	});

	it('should not be able to save Wish instance if no body is provided', function(done) {
		// Invalidate contains field
		wish.contains = '';

		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Wish
				agent.post('/wishes')
					.send(wish)
					.expect(400)
					.end(function(wishSaveErr, wishSaveRes) {
						// Set message assertion
						(wishSaveRes.body.message).should.match('Please fill Wish name');

						// Handle Wish save error
						done(wishSaveErr);
					});
			});
	});

	it('should be able to update Wish instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Wish
				agent.post('/wishes')
					.send(wish)
					.expect(200)
					.end(function(wishSaveErr, wishSaveRes) {
						// Handle Wish save error
						if (wishSaveErr) done(wishSaveErr);

						// Update Wish name
						wish.contains = 'WHY YOU GOTTA BE SO MEAN?';
						wish.email = 'some@email.com';

						// Update existing Wish
						agent.put('/wishes/' + wishSaveRes.body._id)
							.send(wish)
							.expect(200)
							.end(function(wishUpdateErr, wishUpdateRes) {
								// Handle Wish update error
								if (wishUpdateErr) done(wishUpdateErr);

								// Set assertions
								(wishUpdateRes.body._id).should.equal(wishSaveRes.body._id);
								(wishUpdateRes.body.contains).should.match('WHY YOU GOTTA BE SO MEAN?');
								(wishUpdateRes.body.email).should.match('some@email.com');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should be able to get a list of Wishes if not signed in', function(done) {
		// Create new Wish model instance
		var wishObj = new Wish(wish);

		// Save the Wish
		wishObj.save(function() {
			// Request Wishes
			request(app).get('/wishes')
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Array.with.lengthOf(1);

					// Call the assertion callback
					done();
				});

		});
	});


	it('should be able to get a single Wish if not signed in', function(done) {
		// Create new Wish model instance
		var wishObj = new Wish(wish);

		// Save the Wish
		wishObj.save(function() {
			request(app).get('/wishes/' + wishObj._id)
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Object.with.property('contains', wish.contains);

					// Call the assertion callback
					done();
				});
		});
	});

	it('should be able to delete Wish instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Wish
				agent.post('/wishes')
					.send(wish)
					.expect(200)
					.end(function(wishSaveErr, wishSaveRes) {
						// Handle Wish save error
						if (wishSaveErr) done(wishSaveErr);

						// Delete existing Wish
						agent.delete('/wishes/' + wishSaveRes.body._id)
							.send(wish)
							.expect(200)
							.end(function(wishDeleteErr, wishDeleteRes) {
								// Handle Wish error error
								if (wishDeleteErr) done(wishDeleteErr);

								// Set assertions
								(wishDeleteRes.body._id).should.equal(wishSaveRes.body._id);

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to delete Wish instance if not signed in', function(done) {
		// Set Wish user
		wish.user = user;

		// Create new Wish model instance
		var wishObj = new Wish(wish);

		// Save the Wish
		wishObj.save(function() {
			// Try deleting Wish
			request(app).delete('/wishes/' + wishObj._id)
			.expect(401)
			.end(function(wishDeleteErr, wishDeleteRes) {
				// Set message assertion
				(wishDeleteRes.body.message).should.match('User is not logged in');

				// Handle Wish error error
				done(wishDeleteErr);
			});

		});
	});

	afterEach(function(done) {
		User.remove().exec();
		Wish.remove().exec();
		done();
	});
});