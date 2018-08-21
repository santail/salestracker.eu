'use strict';

// Setting up route
angular.module('offers').config(['$stateProvider',
  function ($stateProvider) {
    // Offers state routing
    $stateProvider
      .state('offers', {
        abstract: true,
        url: '/offers',
        template: '<ui-view/>'
      })
      .state('offers.list', {
        url: '',
        templateUrl: 'modules/offers/client/views/list-offers.client.view.html'
      })
      .state('offers.create', {
        url: '/create',
        templateUrl: 'modules/offers/client/views/create-offer.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('offers.view', {
        url: '/:offerId',
        templateUrl: 'modules/offers/client/views/view-offer.client.view.html'
      })
      .state('offers.edit', {
        url: '/:offerId/edit',
        templateUrl: 'modules/offers/client/views/edit-offer.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);
