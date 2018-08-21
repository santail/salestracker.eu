'use strict';

//Wishes service used to communicate Wishes REST endpoints
angular.module('wishes').factory('Wishes', ['$resource',
	function($resource) {
		return $resource('api/wishes/:wishId', {
			wishId: '@_id'
		}, {
			update: {
				method: 'PUT'
			}
		});
	}
]);