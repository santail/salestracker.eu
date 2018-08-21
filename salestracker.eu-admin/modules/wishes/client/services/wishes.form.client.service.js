(function() {
    'use strict';

    angular
        .module('wishes')
        .factory('WishesForm', factory);

    function factory() {

      var getFormFields = function(disabled) {

        var fields = [
  				{
  					key: 'contains',
  					type: 'input',
  					templateOptions: {
  					  required: true,
  			      label: 'Contains:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'email',
  					type: 'input',
  					templateOptions: {
              type: 'email',
              label: 'Email',
  						disabled: disabled
            },
  				},
  				{
  					key: 'phone',
  					type: 'input',
  					templateOptions: {
  			      label: 'Phone:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'language',
  					type: 'input',
  					templateOptions: {
  			      label: 'Language:',
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
