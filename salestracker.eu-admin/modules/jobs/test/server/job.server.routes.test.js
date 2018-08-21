'use strict';

var should = require('should'),
	request = require('supertest'),
	app = require('../../server'),
	mongoose = require('mongoose'),
	Job = mongoose.model('Job'),
	agent = request.agent(app);

/**
 * Globals
 */
var job;

/**
 * Job routes tests
 */
describe('Job CRUD tests', function() {
	beforeEach(function(done) {

		// create new Job
		job = {
			name: 'Job Name'
		};

		done();
	});

	it('should be able to get a list of Jobs if not signed in', function(done) {
		// Create new Job model instance
		var jobObj = new Job(job);

		// Save the Job
		jobObj.save(function() {
			// Request Jobs
			request(app).get('/jobs')
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Array.with.lengthOf(1);

					// Call the assertion callback
					done();
				});

		});
	});


	it('should be able to get a single Job if not signed in', function(done) {
		// Create new Offer model instance
		var jobObj = new Job(job);

		// Save the Job
		jobObj.save(function() {
			request(app).get('/jobs/' + jobObj._id)
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Object.with.property('name', job.name);

					// Call the assertion callback
					done();
				});
		});
	});

	afterEach(function(done) {
		Job.remove().exec();
		done();
	});
});