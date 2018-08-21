'use strict';

// Offers controller
angular.module('offers').controller('OffersController', ['$scope', '$stateParams', '$location', '$q', 'Authentication', 'Offers', 'TableSettings', 'OffersForm', 'Jobs', 'Sites', "$element", "ngTableEventsChannel",
    function ($scope, $stateParams, $location, $q, Authentication, Offers, TableSettings, OffersForm, Jobs, Sites, $element, ngTableEventsChannel) {
        $scope.authentication = Authentication;
        $scope.tableParams = TableSettings.getParamsFactory('Offers', Offers);
        $scope.offer = {};

        $scope.setFormFields = function (disabled) {
            $scope.formFields = OffersForm.getFormFields(disabled);
        };

        $scope.checkboxes = {
            checked: false,
            items: {}
        };

        ngTableEventsChannel.onAfterReloadData(function (result) {
            // watch for check all checkbox
            $scope.$watch(function () {
                return $scope.checkboxes.checked;
            }, function (value) {
                angular.forEach(result.data, function (item) {
                    $scope.checkboxes.items[item._id] = value;
                });
            });

            // watch for data checkboxes
            $scope.$watch(function () {
                return $scope.checkboxes.items;
            }, function (values) {
                var checked = 0,
                    unchecked = 0,
                    total = result.data.length;

                angular.forEach(result.data, function (item) {
                    checked += ($scope.checkboxes.items[item._id]) || 0;
                    unchecked += (!$scope.checkboxes.items[item._id]) || 0;
                });

                if (unchecked === 0 || checked === 0) {
                    $scope.checkboxes.checked = (checked !== 0 && checked === total);
                }

                angular.element($element[0].getElementsByClassName("select-all")).prop("indeterminate", (checked !== 0 && unchecked !== 0));
            }, true);
        }, $scope, $scope.tableParams);

    $scope.names = function(column) {
        var names = [];
                names.push({
                    'id': '1',
                    'title': 'test'
                });

        $scope.nameOptions = names;
    };

        var getLanguages = function ($column) {
            return [
                { 'id': 'ru', 'title': 'Russian' },
                { 'id': 'et', 'title': 'Estonian'},
                { 'id': 'en', 'title': 'English' },
                { 'id': 'fi', 'title': 'Finnish' }
            ];
        };

        $scope.trueFalse = function ($column) {
            return [
                { 'id': 'true', 'title': 'Active'},
                { 'id': 'false','title': 'Not active' }
            ];
        };

        $scope.columns = [
            { field: "title",          title: "Title",    visible: true, filter: { title: 'text' }, url: true },
            { field: "price",          title: "Price",    visible: true },
            { field: "original_price", title: "Original", visible: true },
            { field: "discount",       title: "Discount", visible: true },
            { field: "language",       title: "Language", visible: true, filter: { language: 'select'}, filterData: getLanguages, show: true },
            { field: "site",           title: "Site",     visible: true, filter: { site: 'text'} },
            { field: "vendor",         title: "Vendor",   visible: true, filter: { vendor: 'text' } },
            { field: "active",         title: "Active?",  visible: true, filter: { active: 'text' } },
            { field: "modified | date:'yyyy.MM.dd HH:mm:ss'", title: "Modified", visible: true }
        ];

        // Create new Offer
        $scope.create = function () {
            var offer = new Offers($scope.offer);

            // Redirect after save
            offer.$save(function (response) {
                $location.path('offers/' + response._id);
            }, function (errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

        // Remove existing Offer
        $scope.remove = function (offer) {
            if (!offer) {
                var getEntityFunctions = [];
                var deleteEntityFunctions = [];

                angular.forEach($scope.checkboxes.items, function (value, key) {
                    if (value) {
                        var entityPromise = Offers.get({
                            offerId: key
                        });

                        getEntityFunctions.push(entityPromise.$promise);

                        entityPromise.$promise.then(function () {
                            deleteEntityFunctions.push(entityPromise.$remove().$promise);
                        });
                    }
                });

                $q.all(getEntityFunctions).then(function (foundEntities) {
                    $q.all(deleteEntityFunctions).then(function (deletedEntities) {
                        $scope.checkboxes.items = {};
                        $scope.tableParams.reload();
                    });
                });
            }
            else if (offer) {
                offer = Offers.get({
                    offerId: offer._id
                }, function () {
                    offer.$remove(function () {
                        $scope.tableParams.reload();
                    });
                });
            }
            else {
                $scope.offer.$remove(function () {
                    $location.path('offers');
                });
            }
        };

        // Update existing Offer
        $scope.update = function () {
            var offer = $scope.offer;

            offer.$update(function () {
                $location.path('offers/' + offer._id);
            }, function (errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };


        $scope.toViewOffer = function () {
            $scope.offer = Offers.get({
                offerId: $stateParams.offerId
            });
            $scope.setFormFields(true);
        };

        $scope.toEditOffer = function () {
            $scope.offer = Offers.get({
                offerId: $stateParams.offerId
            });
            $scope.setFormFields(false);
        };

        $scope.callReprocessing = function (offer) {
            if (!offer) {
                var getEntityFunctions = [];
                var updateEntityFunctions = [];

                angular.forEach($scope.checkboxes.items, function (value, key) {
                    if (value) {
                        var entityPromise = Offers.get({
                            offerId: key
                        });

                        getEntityFunctions.push(entityPromise.$promise);

                        entityPromise.$promise.then(function (entity) {
                            var job = new Jobs({
                                "name": "offer_fetch_event",
                                "params": {
                                    "id": entity.id,
                                    "site": entity.site,
                                    "language": entity.language,
                                    "url": entity.url,
                                    "refresh": true
                                },
                                "queue": "offers_queue",
                                "attempts": null,
                                "timeout": null,
                                "delay": new Date().toISOString(),
                                "priority": 0,
                                "status": "queued",
                                "enqueued": new Date().toISOString()
                            });

                            updateEntityFunctions.push(job.$save().$promise);
                        });
                    }
                });

                $q.all(getEntityFunctions).then(function (foundEntities) {
                    $q.all(updateEntityFunctions).then(function (updatedEntities) {
                        $scope.checkboxes.items = {};
                        $scope.tableParams.reload();
                    });
                });
            }
            else {
                offer = Offers.get({
                    offerId: offer._id
                }, function () {
                    var job = new Jobs({
                        "name": "offer_fetch_event",
                        "params": {
                            "id": offer.id,
                            "site": offer.site,
                            "language": offer.language,
                            "url": offer.url,
                            "refresh": true
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
                        // offer.$remove(function () {
                        $scope.tableParams.reload();
                        // });
                    }, function (errorResponse) {
                        $scope.error = errorResponse.data.message;
                    });
                });
            }
        };

        $scope.sites = [];
        Sites.get(function (sites) {
            angular.forEach(sites, function (site) {
                $scope.sites.push({
                    'id': site.url,
                    'title': site.name
                });
            });
        });
    }
]);
