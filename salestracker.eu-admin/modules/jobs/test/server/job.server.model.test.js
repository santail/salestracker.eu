'use strict';

/**
 * Module dependencies.
 */
var should = require('should'),
	mongoose = require('mongoose'),
	Job = mongoose.model('Job');

/**
 * Globals
 */
var job;

/**
 * Unit tests
 */
describe('Job Model Unit Tests:', function() {
	beforeEach(function(done) {

		job = new Job({
			name: 'Job Name'
		});

		done();
	});

	describe('Method Save', function() {
		it('should be able to save without problems', function(done) {
			return job.save(function(err) {
				should.not.exist(err);
				done();
			});
		});

		it('should be able to show an error when try to save without name', function(done) {
			job.name = '';

			return job.save(function(err) {
				should.exist(err);
				done();
			});
		});
	});

	afterEach(function(done) {
		Job.remove().exec();

		done();
	});
});