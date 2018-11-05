'use strict';

var _ = require('lodash');
var util = require("util");

interface LanguageConfiguration {
  main?: boolean;
  exists: boolean;
  compiler?: (url: string) => string;
}

interface OfferTemplates {
  title: (content: any) => string;
  pictures: (content: any) => string[];
  additional?: (content: any) => string;
  description: (content: any) => string;
  details?: (content: any) => string;
  price: (content: any) => {
    current: number | undefined;
    original: number | undefined;
    discount: {
      amount: number | undefined;
      percents: number | undefined;
    }
  };
  currency: (content: any) => string;
  vendor?: (content: any) => string;
  client_card_required?: (content: any) => boolean;
}

interface PagingConfiguration {
  first: (content: any) => number;
  last: (content: any) => number;
  limit?: number;
  pattern: string;
  finit: boolean;
  controls?: (content: any) => any;
}

export interface ParserConfiguration {
  ttl: number;
  site: string;
  paging?: PagingConfiguration;
  indexPage: string;
  list: (content: any) => any[];
  json?: boolean
  templates: OfferTemplates;
  languages: { [language: string]: LanguageConfiguration };
  headers?: { [header: string]: string };
  translations: string[];
}


class AbstractParser {

  protected config: ParserConfiguration = {
    indexPage: '',
    list: () => [],
    templates: {
      title: () => { return ''},
      pictures: () => { return []},
      currency: () => { return ''},
      price: () => { return {
        current: 0,
        original: 0,
        discount: {
          amount: 0,
          percents:  0
        }
      }},
      vendor: () => { return ''},
      description: () => { return ''}
    },
    languages: {},
    translations: [],
    ttl: 0,
    site: '',
    headers: {}
  };

  getPagingParameters = (body, options) => {
    return this.compilePagingParameters(body, options);
  };

  compilePagingParameters = (content, options) => {
    var pages: string[] = [];

    const firstPage = this.config.paging!!.first(content) || 1;
    var lastPage = this.config.paging!!.last(content) || 1;

    if (process.env.NODE_ENV === 'development' && process.env.PAGING_PAGES_LIMIT && parseInt(process.env.PAGING_PAGES_LIMIT, 10) < lastPage) {
      lastPage = parseInt(process.env.PAGING_PAGES_LIMIT, 10);
    } else if (options.limit && options.limit < lastPage) {
      lastPage = options.limit;
    } else if (this.config.paging!!.limit!! && this.config.paging!!.limit!! < lastPage) {
      lastPage = this.config.paging!!.limit || 1;
    }

    for (var pageNumber: number = firstPage; pageNumber <= lastPage; pageNumber++) {
      pages.push(this.compilePagingPattern()
        .replace(/{paging_pagenumber}/g, pageNumber.toString())
        .replace(/{search_criteria}/g, options.search)
      );
    }

    return {
      'pages': pages
    };
  };

  compilePagingPattern = () => {
    var pattern = this.config.paging!!.pattern ? this.config.paging!!.pattern : this.config.indexPage;
    return this.compilePageHref(pattern)
  };

  getOffers = (content) => {
    var dataItems = this.config.list.call(this, content);

    if (process.env.NODE_ENV === 'development' && process.env.OFFERS_LIMIT) {
      dataItems = dataItems.slice(0, process.env.OFFERS_LIMIT);
    }

    var metadata = _.map(dataItems, (item) => {
      var metadata = {
        'id': this.compileOfferHref(item),
        'href': this.compileOfferHref(item)
      }

      if (this.config.json) {
        return _.extend(item, metadata);
      }

      return metadata;
    });

    return _.filter(metadata, (item) => {
      return item.href;
    });
  };

  parse = (body, parseFinished) => {
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

  compilePageHref = (link) => {
    return this.config.indexPage + link;
  };

  compileOfferHref = (link, language?: string) => {
    return this.config.indexPage + link.replace(/&amp;/g, '&');
  };

  compileImageHref = (link) => {
    return this.config.indexPage + link.replace(/&amp;/g, '&');
  };

  compileOffer = (data) => {
    var offer = {};

    _.each(_.keys(data), (property) => {
      if (!_.includes(this.config.translations, property)) {
        if (!_.includes(['language', 'href'], property)) {
          offer[property] = data[property];
        }
      }
    });

    return offer;
  };

  compileTranslations = (data) => {
    var translations = {};
    translations[data.language] = {};

    _.each(_.keys(data), (property) => {
      if (data.hasOwnProperty(property) && _.includes(this.config.translations, property)) {
        translations[data.language][property] = data[property];
      }

      translations[data.language].href = data.href;
    });

    return translations;
  };

  getMainLanguage = () => {
    var mainLanguage = _.find(_.keys(this.config.languages), (language) => {
      return this.config.languages[language].main;
    });

    if (!mainLanguage) {
      console.error(new Error('Main language is not set'));
    }

    return mainLanguage;
  };

  priceCleanup = (price): number | undefined => {
    if (price) {
      return Number((+(price.replace(/[^0-9\.,]?/gi, '').replace(/,/gi, '.'))).toFixed(2));
    }

    return undefined;
  };

  compileDiscount = (current, original) => {
    var amount;
    var percents;
    
    if (current && original) {
      amount = original - current;
      percents = 100 - current / original * 100;
    }

    return { 
      amount: Number((+amount).toFixed(2)), 
      percents: Number((+percents).toFixed(2)), 
    };
  };
};

export default AbstractParser;