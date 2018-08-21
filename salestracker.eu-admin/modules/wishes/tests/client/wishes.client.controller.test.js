'use strict';

(function() {
	// Wishes Controller Spec
	describe('Wishes Controller Tests', function() {
		// Initialize global variables
		var WishesController,
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

			// Initialize the Wishes controller.
			WishesController = $controller('WishesController', {
				$scope: scope
			});
		}));

		it('$scope.find() should create an array with at least one Wish object fetched from XHR', inject(function(Wishes) {
			// Create sample Wish using the Wishes service
			var sampleWish = new Wishes({
				contains: 'New Wish',
				email: 'some@email.com'
			});

			// Create a sample Wishes array that includes the new Wish
			var sampleWishes = [sampleWish];

			// Set GET response
			$httpBackend.expectGET('wishes').respond(sampleWishes);

			// Run controller functionality
			scope.find();
			$httpBackend.flush();

			// Test scope value
			expect(scope.wishes).toEqualData(sampleWishes);
		}));

		it('$scope.findOne() should create an array with one Wish object fetched from XHR using a wishId URL parameter', inject(function(Wishes) {
			// Define a sample Wish object
			var sampleWish = new Wishes({
				contains: 'New Wish',
				email: 'some@email.com'
			});

			// Set the URL parameter
			$stateParams.wishId = '525a8422f6d0f87f0e407a33';

			// Set GET response
			$httpBackend.expectGET(/wishes\/([0-9a-fA-F]{24})$/).respond(sampleWish);

			// Run controller functionality
			scope.findOne();
			$httpBackend.flush();

			// Test scope value
			expect(scope.wish).toEqualData(sampleWish);
		}));

		it('$scope.create() with valid form data should send a POST request with the form input values and then locate to new object URL', inject(function(Wishes) {
			// Create a sample Wish object
			var sampleWishPostData = new Wishes({
				contains: 'New Wish',
				email: 'some@email.com'
			});

			// Create a sample Wish response
			var sampleWishResponse = new Wishes({
				_id: '525cf20451979dea2c000001',
				contains: 'New Wish'
			});

			// Fixture mock form input values
			scope.contains = 'New Wish';
			scope.email = 'some@email.com';


			// Set POST response
			$httpBackend.expectPOST('wishes', sampleWishPostData).respond(sampleWishResponse);

			// Run controller functionality
			scope.create();
			$httpBackend.flush();

			// Test form inputs are reset
			expect(scope.contains).toEqual('');
			expect(scope.email).toEqual('');

			// Test URL redirection after the Wish was created
			expect($location.path()).toBe('/wishes/' + sampleWishResponse._id);
		}));

		it('$scope.update() should update a valid Wish', inject(function(Wishes) {
			// Define a sample Wish put data
			var sampleWishPutData = new Wishes({
				_id: '525cf20451979dea2c000001',
				contains: 'New Wish',
				email: 'some@email.com'
			});

			// Mock Wish in scope
			scope.wish = sampleWishPutData;

			// Set PUT response
			$httpBackend.expectPUT(/wishes\/([0-9a-fA-F]{24})$/).respond();

			// Run controller functionality
			scope.update();
			$httpBackend.flush();

			// Test URL location to new object
			expect($location.path()).toBe('/wishes/' + sampleWishPutData._id);
		}));

		it('$scope.remove() should send a DELETE request with a valid wishId and remove the Wish from the scope', inject(function(Wishes) {
			// Create new Wish object
			var sampleWish = new Wishes({
				_id: '525a8422f6d0f87f0e407a33'
			});

			// Create new Wishes array and include the Wish
			scope.wishes = [sampleWish];

			// Set expected DELETE response
			$httpBackend.expectDELETE(/wishes\/([0-9a-fA-F]{24})$/).respond(204);

			// Run controller functionality
			scope.remove(sampleWish);
			$httpBackend.flush();

			// Test array after successful delete
			expect(scope.wishes.length).toBe(0);
		}));
	});
}());