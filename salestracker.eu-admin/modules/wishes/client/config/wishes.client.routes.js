'use strict';

// Setting up route
angular.module('wishes').config(['$stateProvider',
  function ($stateProvider) {
    // Articles state routing
    $stateProvider
      .state('wishes', {
        abstract: true,
        url: '/wishes',
        template: '<ui-view/>'
      })
      .state('wishes.list', {
        url: '',
        templateUrl: 'modules/wishes/client/views/list-wishes.client.view.html'
      })
      .state('wishes.create', {
        url: '/create',
        templateUrl: 'modules/wishes/client/views/create-wish.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('wishes.view', {
        url: '/:wishId',
        templateUrl: 'modules/wishes/client/views/view-wish.client.view.html'
      })
      .state('wishes.edit', {
        url: '/:wishId/edit',
        templateUrl: 'modules/wishes/client/views/edit-wish.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);
