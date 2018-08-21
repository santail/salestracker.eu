(function() {
    'use strict';

    angular
        .module('sites')
        .factory('SitesForm', factory);

    function factory() {

      var getFormFields = function(disabled) {

        var fields = [
  				{
  					key: 'name',
  					type: 'input',
  					templateOptions: {
  			      label: 'Name:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'url',
  					type: 'input',
  					templateOptions: {
  			      label: 'Url:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'is_active',
  					type: 'checkbox',
  					templateOptions: {
  			      label: 'Active:',
  						disabled: disabled
  			    }
  				}

  			];

        return fields;

      };

      var service = {
        getFormFields: getFormFields
      };

      return service;

  }

})();
