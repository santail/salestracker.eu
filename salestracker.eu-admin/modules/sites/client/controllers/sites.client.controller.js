'use strict';

// Sites controller
angular.module('sites').controller('SitesController', ['$scope', '$stateParams', '$location', 'Authentication', 'Sites', 'TableSettings', 'SitesForm', 'Jobs',
	function ($scope, $stateParams, $location, Authentication, Sites, TableSettings, SitesForm, Jobs) {
		$scope.authentication = Authentication;
		$scope.tableParams = TableSettings.getParamsFactory('Sites', Sites);
		$scope.site = {};

		$scope.setFormFields = function (disabled) {
			$scope.formFields = SitesForm.getFormFields(disabled);
		};


		// Create new Site
		$scope.create = function () {
			var site = new Sites($scope.site);

			// Redirect after save
			site.$save(function (response) {
				$location.path('sites/' + response._id);
			}, function (errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Remove existing Site
		$scope.remove = function (site) {

			if (site) {
				site = Sites.get({
					siteId: site._id
				}, function () {
					site.$remove(function () {
						$scope.tableParams.reload();
					});
				});
			}
			else {
				$scope.site.$remove(function () {
					$location.path('sites');
				});
			}
		};

		$scope.update = function (isValid) {
			var site = $scope.site;

			site.$update(function () {
				$location.path('sites/' + site._id);
			}, function (errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		$scope.toViewSite = function () {
			$scope.site = Sites.get({
				siteId: $stateParams.siteId
			});
			$scope.setFormFields(true);
		};

		$scope.toEditSite = function () {
			$scope.site = Sites.get({
				siteId: $stateParams.siteId
			});
			$scope.setFormFields(false);
		};

		$scope.callCleanup = function (site) {
			site = Sites.get({
				siteId: site._id
			}, function () {
				var job = new Jobs({
					"name": "harvester_run_event",
					"params": {
						"site": site.url,
						"cleanup": true
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
					$scope.tableParams.reload();
				}, function (errorResponse) {
					$scope.error = errorResponse.data.message;
				});
			});
		};

		$scope.callReactivate = function (site) {
			site = Sites.get({
				siteId: site._id
			}, function () {
				var job = new Jobs({
					"name": "harvester_run_event",
					"params": {
						"site": site.url,
						"reactivate": true
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
					$scope.tableParams.reload();
				}, function (errorResponse) {
					$scope.error = errorResponse.data.message;
				});
			});
		};

		$scope.callProcess = function (site) {
			site = Sites.get({
				siteId: site._id
			}, function () {
				var job = new Jobs({
					"name": "harvester_run_event",
					"params": {
						"site": site.url
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
					$scope.tableParams.reload();
				}, function (errorResponse) {
					$scope.error = errorResponse.data.message;
				});
			});
		};
	}

]);
