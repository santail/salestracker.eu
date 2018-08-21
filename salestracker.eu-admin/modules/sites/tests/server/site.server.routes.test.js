'use strict';

var should = require('should'),
	request = require('supertest'),
	app = require('../../../../server'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Site = mongoose.model('Site'),
	agent = request.agent(app);

/**
 * Globals
 */
var credentials, user, site;

/**
 * Site routes tests
 */
describe('Site CRUD tests', function() {
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

		// Save a user to the test db and create new Site
		user.save(function() {
			site = {
				name: 'Site Name'
			};

			done();
		});
	});

	it('should be able to save Site instance if logged in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Site
				agent.post('/sites')
					.send(site)
					.expect(200)
					.end(function(siteSaveErr, siteSaveRes) {
						// Handle Site save error
						if (siteSaveErr) done(siteSaveErr);

						// Get a list of Sites
						agent.get('/sites')
							.end(function(sitesGetErr, sitesGetRes) {
								// Handle Site save error
								if (sitesGetErr) done(sitesGetErr);

								// Get Sites list
								var sites = sitesGetRes.body;

								// Set assertions
								(sites[0].user._id).should.equal(userId);
								(sites[0].name).should.match('Site Name');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to save Site instance if not logged in', function(done) {
		agent.post('/sites')
			.send(site)
			.expect(401)
			.end(function(siteSaveErr, siteSaveRes) {
				// Call the assertion callback
				done(siteSaveErr);
			});
	});

	it('should not be able to save Site instance if no name is provided', function(done) {
		// Invalidate name field
		site.name = '';

		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Site
				agent.post('/sites')
					.send(site)
					.expect(400)
					.end(function(siteSaveErr, siteSaveRes) {
						// Set message assertion
						(siteSaveRes.body.message).should.match('Please fill Site name');

						// Handle Site save error
						done(siteSaveErr);
					});
			});
	});

	it('should be able to update Site instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Site
				agent.post('/sites')
					.send(site)
					.expect(200)
					.end(function(siteSaveErr, siteSaveRes) {
						// Handle Site save error
						if (siteSaveErr) done(siteSaveErr);

						// Update Site name
						site.name = 'WHY YOU GOTTA BE SO MEAN?';

						// Update existing Site
						agent.put('/sites/' + siteSaveRes.body._id)
							.send(site)
							.expect(200)
							.end(function(siteUpdateErr, siteUpdateRes) {
								// Handle Site update error
								if (siteUpdateErr) done(siteUpdateErr);

								// Set assertions
								(siteUpdateRes.body._id).should.equal(siteSaveRes.body._id);
								(siteUpdateRes.body.name).should.match('WHY YOU GOTTA BE SO MEAN?');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should be able to get a list of Sites if not signed in', function(done) {
		// Create new Site model instance
		var siteObj = new Site(site);

		// Save the Site
		siteObj.save(function() {
			// Request Sites
			request(app).get('/sites')
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Array.with.lengthOf(1);

					// Call the assertion callback
					done();
				});

		});
	});


	it('should be able to get a single Site if not signed in', function(done) {
		// Create new Site model instance
		var siteObj = new Site(site);

		// Save the Site
		siteObj.save(function() {
			request(app).get('/sites/' + siteObj._id)
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Object.with.property('name', site.name);

					// Call the assertion callback
					done();
				});
		});
	});

	it('should be able to delete Site instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Site
				agent.post('/sites')
					.send(site)
					.expect(200)
					.end(function(siteSaveErr, siteSaveRes) {
						// Handle Site save error
						if (siteSaveErr) done(siteSaveErr);

						// Delete existing Site
						agent.delete('/sites/' + siteSaveRes.body._id)
							.send(site)
							.expect(200)
							.end(function(siteDeleteErr, siteDeleteRes) {
								// Handle Site error error
								if (siteDeleteErr) done(siteDeleteErr);

								// Set assertions
								(siteDeleteRes.body._id).should.equal(siteSaveRes.body._id);

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to delete Site instance if not signed in', function(done) {
		// Set Site user
		site.user = user;

		// Create new Site model instance
		var siteObj = new Site(site);

		// Save the Site
		siteObj.save(function() {
			// Try deleting Site
			request(app).delete('/sites/' + siteObj._id)
			.expect(401)
			.end(function(siteDeleteErr, siteDeleteRes) {
				// Set message assertion
				(siteDeleteRes.body.message).should.match('User is not logged in');

				// Handle Site error error
				done(siteDeleteErr);
			});

		});
	});

	afterEach(function(done) {
		User.remove().exec(function(){
			Site.remove().exec(function(){
				done();
			});
		});
	});
});
