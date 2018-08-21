'use strict';

(function() {
	// Offers Controller Spec
	describe('Offers Controller Tests', function() {
		// Initialize global variables
		var OffersController,
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

			// Initialize the Offers controller.
			OffersController = $controller('OffersController', {
				$scope: scope
			});
		}));

		it('$scope.find() should create an array with at least one Offer object fetched from XHR', inject(function(Offers) {
			// Create sample Offer using the Offers service
			var sampleOffer = new Offers({
				title: 'New Offer'
			});

			// Create a sample Offers array that includes the new Offer
			var sampleOffers = [sampleOffer];

			// Set GET response
			$httpBackend.expectGET('offers').respond(sampleOffers);

			// Run controller functionality
			scope.find();
			$httpBackend.flush();

			// Test scope value
			expect(scope.offers).toEqualData(sampleOffers);
		}));

		it('$scope.findOne() should create an array with one Offer object fetched from XHR using a offerId URL parameter', inject(function(Offers) {
			// Define a sample Offer object
			var sampleOffer = new Offers({
				title: 'New Offer'
			});

			// Set the URL parameter
			$stateParams.offerId = '525a8422f6d0f87f0e407a33';

			// Set GET response
			$httpBackend.expectGET(/offers\/([0-9a-fA-F]{24})$/).respond(sampleOffer);

			// Run controller functionality
			scope.findOne();
			$httpBackend.flush();

			// Test scope value
			expect(scope.offer).toEqualData(sampleOffer);
		}));

		it('$scope.create() with valid form data should send a POST request with the form input values and then locate to new object URL', inject(function(Offers) {
			// Create a sample Offer object
			var sampleOfferPostData = new Offers({
				title: 'New Offer'
			});

			// Create a sample Offer response
			var sampleOfferResponse = new Offers({
				_id: '525cf20451979dea2c000001',
				title: 'New Offer'
			});

			// Fixture mock form input values
			scope.title = 'New Offer';

			// Set POST response
			$httpBackend.expectPOST('offers', sampleOfferPostData).respond(sampleOfferResponse);

			// Run controller functionality
			scope.create();
			$httpBackend.flush();

			// Test form inputs are reset
			expect(scope.title).toEqual('');

			// Test URL redirection after the Offer was created
			expect($location.path()).toBe('/offers/' + sampleOfferResponse._id);
		}));

		it('$scope.update() should update a valid Offer', inject(function(Offers) {
			// Define a sample Offer put data
			var sampleOfferPutData = new Offers({
				_id: '525cf20451979dea2c000001',
				title: 'New Offer'
			});

			// Mock Offer in scope
			scope.offer = sampleOfferPutData;

			// Set PUT response
			$httpBackend.expectPUT(/offers\/([0-9a-fA-F]{24})$/).respond();

			// Run controller functionality
			scope.update();
			$httpBackend.flush();

			// Test URL location to new object
			expect($location.path()).toBe('/offers/' + sampleOfferPutData._id);
		}));

		it('$scope.remove() should send a DELETE request with a valid offerId and remove the Offer from the scope', inject(function(Offers) {
			// Create new Offer object
			var sampleOffer = new Offers({
				_id: '525a8422f6d0f87f0e407a33'
			});

			// Create new Offers array and include the Offer
			scope.offers = [sampleOffer];

			// Set expected DELETE response
			$httpBackend.expectDELETE(/offers\/([0-9a-fA-F]{24})$/).respond(204);

			// Run controller functionality
			scope.remove(sampleOffer);
			$httpBackend.flush();

			// Test array after successful delete
			expect(scope.offers.length).toBe(0);
		}));
	});
}());