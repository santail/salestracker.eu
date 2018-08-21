'use strict';

// Configuring the Wishes module
angular.module('wishes').run(['Menus',
  function (Menus) {
    // Add the wishes dropdown item
    Menus.addMenuItem('topbar', {
      title: 'Wishes',
      state: 'wishes',
      type: 'dropdown',
      roles: ['user']
    });

    // Add the dropdown list item
    Menus.addSubMenuItem('topbar', 'wishes', {
      title: 'List Wishes',
      state: 'wishes.list'
    });

    // Add the dropdown create item
    Menus.addSubMenuItem('topbar', 'wishes', {
      title: 'Create Wish',
      state: 'wishes.create',
      roles: ['user']
    });
  }
]);
