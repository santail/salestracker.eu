'use strict';

//Jobs service used to communicate Jobs REST endpoints
angular.module('jobs').factory('Jobs', ['$resource',
	function($resource) {
		return $resource('api/jobs/:jobId', {
			jobId: '@_id'
		});
	}
]);