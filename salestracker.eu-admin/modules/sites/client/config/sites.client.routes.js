'use strict';

// Setting up route
angular.module('sites').config(['$stateProvider',
  function ($stateProvider) {
    // Articles state routing
    $stateProvider
      .state('sites', {
        abstract: true,
        url: '/sites',
        template: '<ui-view/>'
      })
      .state('sites.list', {
        url: '',
        templateUrl: 'modules/sites/client/views/list-sites.client.view.html'
      })
      .state('sites.create', {
        url: '/create',
        templateUrl: 'modules/sites/client/views/create-site.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('sites.view', {
        url: '/:siteId',
        templateUrl: 'modules/sites/client/views/view-site.client.view.html'
      })
      .state('sites.edit', {
        url: '/:siteId/edit',
        templateUrl: 'modules/sites/client/views/edit-site.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);
