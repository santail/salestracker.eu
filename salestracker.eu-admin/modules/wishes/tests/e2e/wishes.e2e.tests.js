'use strict';

describe('Wishes E2E Tests:', function () {
  describe('Test wishes page', function () {
    it('Should report missing credentials', function () {
      browser.get('http://localhost:8000/wishes');
      expect(element.all(by.repeater('wish in wishes')).count()).toEqual(0);
    });
  });
});
