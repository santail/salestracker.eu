(function() {
    'use strict';

    angular
        .module('offers')
        .factory('OffersForm', factory);

    function factory() {

      var getFormFields = function(disabled) {

        var fields = [
  				{
  					key: 'title',
  					type: 'input',
  					templateOptions: {
  			      label: 'Name:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'description',
  					type: 'textarea',
  					templateOptions: {
  			      label: 'Description:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'details',
  					type: 'textarea',
  					templateOptions: {
  			      label: 'Details:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'site',
  					type: 'input',
  					templateOptions: {
  			      label: 'Site:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'vendor',
  					type: 'input',
  					templateOptions: {
  			      label: 'Vendor:',
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
  				},
  				{
  					key: 'url',
  					type: 'input',
  					templateOptions: {
  			      label: 'URL:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'original_price',
  					type: 'input',
  					templateOptions: {
  			      label: 'Original price:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'price',
  					type: 'input',
  					templateOptions: {
  			      label: 'Sales price:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'discount',
  					type: 'input',
  					templateOptions: {
  			      label: 'Discount:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'period',
  					type: 'input',
  					templateOptions: {
  			      label: 'Sales period:',
  						disabled: disabled
  			    }
  				},
  				{
  					key: 'active',
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
