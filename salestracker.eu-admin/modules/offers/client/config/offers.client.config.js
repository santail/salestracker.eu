'use strict';

// Configuring the offers module
angular.module('offers').run(['Menus',
  function (Menus) {
    // Add the offers dropdown item
    Menus.addMenuItem('topbar', {
      title: 'Offers',
      state: 'offers',
      type: 'dropdown',
      roles: ['user']
    });

    // Add the dropdown list item
    Menus.addSubMenuItem('topbar', 'offers', {
      title: 'List Offers',
      state: 'offers.list'
    });

    // Add the dropdown create item
    Menus.addSubMenuItem('topbar', 'offers', {
      title: 'Create Offer',
      state: 'offers.create',
      roles: ['user']
    });
  }
]);
