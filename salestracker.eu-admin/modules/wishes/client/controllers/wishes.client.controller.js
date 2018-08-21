'use strict';

// Wishes controller
angular.module('wishes').controller('WishesController', ['$scope', '$stateParams', '$location', 'Authentication', 'Wishes', 'TableSettings', 'WishesForm', 'Jobs',
  function ($scope, $stateParams, $location, Authentication, Wishes, TableSettings, WishesForm, Jobs) {
    $scope.authentication = Authentication;
    $scope.tableParams = TableSettings.getParamsFactory('Wishes', Wishes);
    $scope.wish = {};

    $scope.setFormFields = function (disabled) {
      $scope.formFields = WishesForm.getFormFields(disabled);
    };

    // Create new Wish
    $scope.create = function (isValid) {
      // Create new Wish object
      var wish = new Wishes($scope.wish);

      // Redirect after save
      wish.$save(function (response) {
        $location.path('wishes/' + response._id);
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    // Remove existing Wish
    $scope.remove = function (wish) {
      if (wish) {
				wish = Wishes.get({
					wishId: wish._id
				}, function () {
					wish.$remove(function() {
			      $scope.tableParams.reload();
			    });
				});

			}
			else {
				$scope.wish.$remove(function () {
					$location.path('wishes');
				});
			}
    };

    // Update existing Wish
    $scope.update = function (isValid) {
      var wish = $scope.wish;

      wish.$update(function () {
        $location.path('wishes/' + wish._id);
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    $scope.toViewWish = function () {
      $scope.wish = Wishes.get({
        wishId: $stateParams.wishId
      });
      $scope.setFormFields(true);
    };

    $scope.toEditWish = function () {
      $scope.wish = Wishes.get({
        wishId: $stateParams.wishId
      });
      $scope.setFormFields(false);
    };
    
    $scope.callProcuring = function () {
			var job = new Jobs({
				"name": "procurer_run_event",
				"params": {},
				"queue": "offers_queue",
				"attempts": null,
				"timeout": null,
				"delay": new Date().toISOString(),
				"priority": 0,
				"status": "queued",
				"enqueued": new Date().toISOString()
			});

			// Redirect after save
			job.$save(function (response) {
				$scope.tableParams.reload();
			}, function (errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};
		
		$scope.callWishProcuring = function (wish) {
			wish = Wishes.get({
				wishId: wish._id
			}, function () {
				var job = new Jobs({
					"name": "wish_procure_event",
					"params": {
						"contains": wish.contains,
						"language": wish.language,
						"email": wish.email,
						"phone": wish.phone
					},
					"queue": "offers_queue",
					"attempts": null,
					"timeout": null,
					"delay": new Date().toISOString(),
					"priority": 0,
					"status": "queued",
					"enqueued": new Date().toISOString()
				});

				// Redirect after save
				job.$save(function (response) {
				  // success
				}, function (errorResponse) {
					$scope.error = errorResponse.data.message;
				});
			});
		};
		
		$scope.callProcuring = function (wish) {
			var job = new Jobs({
				"name": "procurer_run_event",
				"params": {},
				"queue": "offers_queue",
				"attempts": null,
				"timeout": null,
				"delay": new Date().toISOString(),
				"priority": 0,
				"status": "queued",
				"enqueued": new Date().toISOString()
			});

			// Redirect after save
			job.$save(function (response) {
				$scope.tableParams.reload();
			}, function (errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};
  }
]);
