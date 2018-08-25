'use strict';

var _ = require('lodash');
var util = require("util");


function AbstractParser() {}

AbstractParser.prototype.getPagingParameters = function (body, options) {
  return this.compilePagingParameters(body, options);
};

AbstractParser.prototype.getOffers = function (content) {
  var that = this;

  var dataItems = that.config.list.call(that, content);

  var metadata = _.map(dataItems, function (item) {
    var metadata = {
      'id': that.compileOfferUrl('est', item),
      'url': that.compileOfferUrl('est', item)
    }

    if (that.config.json) {
      return _.extend(item, metadata);
    }

    return metadata;
  });

  return _.filter(metadata, function (item) {
    return item.url;
  });
};

AbstractParser.prototype.parse = function (body, parseFinished) {
  if (this.config.json && typeof body === 'string') {
    body = JSON.parse(body);
  }

  var offer = (function (that, body) {
    var templates = _.extend({}, that.config.templates);

    function _parseTemplates(body, templates) {
      var result = {};

      for (var key in templates) {

        if (templates.hasOwnProperty(key)) {
          var template = templates[key];

          if (typeof template === 'string') {
            result[key] = template;
          } else if (typeof template === 'object') {
            result[key] = _parseTemplates(body, template);
          } else if (typeof template === 'function') {
            var value = template.call(null, body);
            result[key] = typeof value === "string" ? value.trim().replace(/\t/g, ' ').replace(/\s\s+/g, ' ') : value;
          }
        }
      }

      return result;
    }

    try {
      var result = _parseTemplates(body, templates);

      body = null;

      return result;
    } catch (err) {
      return parseFinished(new Error(util.format("Error parsing templates", err)), offer);
    }
  })(this, body);

  return parseFinished(null, offer);
};

AbstractParser.prototype.compilePageUrl = function (language, link) {
  var that = this;

  return that.config.indexPages[language] + link;
};

AbstractParser.prototype.compileOfferUrl = function (language, link) {
  var that = this;

  return that.config.indexPages[language] + link.replace(/&amp;/g, '&');
};

AbstractParser.prototype.compileImageUrl = function (language, link) {
  var that = this;

  return that.config.indexPages[language] + link.replace(/&amp;/g, '&');
};

AbstractParser.prototype.compilePagingParameters = function (content, options) {
  var that = this;

  var pages = [];

  const firstPage = that.config.paging.first(content);
  var lastPage = that.config.paging.last(content);

  if (options.limit && options.limit < lastPage) {
    lastPage = options.limit;
  } else if (that.config.paging.limit && that.config.paging.limit < lastPage) {
    lastPage = that.config.paging.limit;
  }

  for (var pageNumber = firstPage; pageNumber <= lastPage; pageNumber++) {
    pages.push(that.compilePagingPattern('est')
      .replace(/{paging_pagenumber}/g, pageNumber)
      .replace(/{search_criteria}/g, options.search)
    );
  }

  return {
    'pages': pages
  };
};

AbstractParser.prototype.compilePagingPattern = function (content, options) {
  var that = this;

  var pattern = that.config.paging.pattern ? that.config.paging.pattern : that.config.indexPages['est'];
  return that.compilePageUrl('est', pattern)
}

module.exports = AbstractParser;