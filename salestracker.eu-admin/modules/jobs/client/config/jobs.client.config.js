'use strict';

// Configuring the jobs module
angular.module('jobs').run(['Menus',
  function (Menus) {
    // Add the jobs dropdown item
    Menus.addMenuItem('topbar', {
      title: 'Jobs',
      state: 'jobs',
      type: 'dropdown',
      roles: ['user']
    });

    // Add the dropdown list item
    Menus.addSubMenuItem('topbar', 'jobs', {
      title: 'List jobs',
      state: 'jobs.list'
    });

  }
]);
