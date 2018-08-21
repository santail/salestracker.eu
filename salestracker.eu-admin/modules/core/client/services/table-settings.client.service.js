(function() {
    'use strict';

    angular
        .module('core')
        .factory('TableSettings', factory);

    factory.$inject = ['NgTableParams'];

    function factory(NgTableParams) {

      var getData = function(Entity) {
        return function (params) {
          return Entity.get(params.url()).$promise.then(function(data) {
            params.total(data.total);
            return data.results;
          });
        };
      };

      var initialParams = {
        page: 1,
        count: 50
      };

      var initialSettings = {
        total: 0,
        counts: [10, 25, 50, 100],
        filterDelay: 300,
      };

      var entityTableParams = {};

      var getParamsFactory = function (name, Entity) {
        if (!entityTableParams[name]) {
          /* jshint ignore:start */
          var tableParams = new NgTableParams(initialParams, initialSettings);
          tableParams.settings({getData: getData(Entity)});
          entityTableParams[name] = tableParams;
          /* jshint ignore:end */
        }

        return entityTableParams[name];
      };

      return {
        getParamsFactory: getParamsFactory
      };
  }

})();
