'use strict';

// Configuring the Sites module
angular.module('sites').run(['Menus',
  function (Menus) {
    // Add the sites dropdown item
    Menus.addMenuItem('topbar', {
      title: 'Sites',
      state: 'sites',
      type: 'dropdown',
      roles: ['user']
    });

    // Add the dropdown list item
    Menus.addSubMenuItem('topbar', 'sites', {
      title: 'List Sites',
      state: 'sites.list'
    });

    // Add the dropdown create item
    Menus.addSubMenuItem('topbar', 'sites', {
      title: 'Create Site',
      state: 'sites.create',
      roles: ['user']
    });
  }
]);
