'use strict';

(function() {
	// Sites Controller Spec
	describe('Sites Controller Tests', function() {
		// Initialize global variables
		var SitesController,
		scope,
		$httpBackend,
		$stateParams,
		$location;

		// The $resource service augments the response object with methods for updating and deleting the resource.
		// If we were to use the standard toEqual matcher, our tests would fail because the test values would not match
		// the responses exactly. To solve the problem, we define a new toEqualData Jasmine matcher.
		// When the toEqualData matcher compares two objects, it takes only object properties into
		// account and ignores methods.
		beforeEach(function() {
			jasmine.addMatchers({
				toEqualData: function(util, customEqualityTesters) {
					return {
						compare: function(actual, expected) {
							return {
								pass: angular.equals(actual, expected)
							};
						}
					};
				}
			});
		});

		// Then we can start by loading the main application module
		beforeEach(module(ApplicationConfiguration.applicationModuleName));

		// The injector ignores leading and trailing underscores here (i.e. _$httpBackend_).
		// This allows us to inject a service but then attach it to a variable
		// with the same name as the service.
		beforeEach(inject(function($controller, $rootScope, _$location_, _$stateParams_, _$httpBackend_) {
			// Set a new global scope
			scope = $rootScope.$new();

			// Point global variables to injected services
			$stateParams = _$stateParams_;
			$httpBackend = _$httpBackend_;
			$location = _$location_;

			// Initialize the Sites controller.
			SitesController = $controller('SitesController', {
				$scope: scope
			});
		}));

		it('$scope.find() should create an array with at least one Site object fetched from XHR', inject(function(Sites) {
			// Create sample Site using the Sites service
			var sampleSite = new Sites({
				name: 'New Site'
			});

			// Create a sample Sites array that includes the new Site
			var sampleSites = [sampleSite];

			// Set GET response
			$httpBackend.expectGET('sites').respond(sampleSites);

			// Run controller functionality
			scope.find();
			$httpBackend.flush();

			// Test scope value
			expect(scope.sites).toEqualData(sampleSites);
		}));

		it('$scope.findOne() should create an array with one Site object fetched from XHR using a siteId URL parameter', inject(function(Sites) {
			// Define a sample Site object
			var sampleSite = new Sites({
				name: 'New Site'
			});

			// Set the URL parameter
			$stateParams.siteId = '525a8422f6d0f87f0e407a33';

			// Set GET response
			$httpBackend.expectGET(/sites\/([0-9a-fA-F]{24})$/).respond(sampleSite);

			// Run controller functionality
			scope.findOne();
			$httpBackend.flush();

			// Test scope value
			expect(scope.site).toEqualData(sampleSite);
		}));

		it('$scope.create() with valid form data should send a POST request with the form input values and then locate to new object URL', inject(function(Sites) {
			// Create a sample Site object
			var sampleSitePostData = new Sites({
				name: 'New Site'
			});

			// Create a sample Site response
			var sampleSiteResponse = new Sites({
				_id: '525cf20451979dea2c000001',
				name: 'New Site'
			});

			// Fixture mock form input values
			scope.name = 'New Site';

			// Set POST response
			$httpBackend.expectPOST('sites', sampleSitePostData).respond(sampleSiteResponse);

			// Run controller functionality
			scope.create();
			$httpBackend.flush();

			// Test form inputs are reset
			expect(scope.name).toEqual('');

			// Test URL redirection after the Site was created
			expect($location.path()).toBe('/sites/' + sampleSiteResponse._id);
		}));

		it('$scope.update() should update a valid Site', inject(function(Sites) {
			// Define a sample Site put data
			var sampleSitePutData = new Sites({
				_id: '525cf20451979dea2c000001',
				name: 'New Site'
			});

			// Mock Site in scope
			scope.site = sampleSitePutData;

			// Set PUT response
			$httpBackend.expectPUT(/sites\/([0-9a-fA-F]{24})$/).respond();

			// Run controller functionality
			scope.update();
			$httpBackend.flush();

			// Test URL location to new object
			expect($location.path()).toBe('/sites/' + sampleSitePutData._id);
		}));

		it('$scope.remove() should send a DELETE request with a valid siteId and remove the Site from the scope', inject(function(Sites) {
			// Create new Site object
			var sampleSite = new Sites({
				_id: '525a8422f6d0f87f0e407a33'
			});

			// Create new Sites array and include the Site
			scope.sites = [sampleSite];

			// Set expected DELETE response
			$httpBackend.expectDELETE(/sites\/([0-9a-fA-F]{24})$/).respond(204);

			// Run controller functionality
			scope.remove(sampleSite);
			$httpBackend.flush();

			// Test array after successful delete
			expect(scope.sites.length).toBe(0);
		}));
	});
}());