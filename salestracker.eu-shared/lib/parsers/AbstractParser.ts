'use strict';

const _ = require('lodash');
const util = require("util");

const LOG = require("../services/Logger");

interface LanguageConfiguration {
  main?: boolean;
  exists: boolean;
  compileHref?: (url: string) => string;
  findHref?: (content: any) => string;
}

interface OfferTemplates {
  content: (data: any) => string;
  title: (data: any) => string;
  pictures: (data: any) => string[];
  additional?: (data: any) => string;
  description: (data: any) => string;
  details?: (data: any) => string;
  price: (data: any) => {
    current: number | undefined;
    original: number | undefined;
    discount: {
      amount: number | undefined;
      percents: number | undefined;
    },
    currency: string;
  };
  vendor?: (data: any) => string;
  client_card_required?: (data: any) => boolean;
  offers_group?: (data: any) => boolean;
}

interface PagingConfiguration {
  first?: (content: any) => number;
  last?: (content: any) => number;
  controls?: (content: any) => any;
  limit?: number;
  pattern: string;
  finite?: boolean;
}

export interface ParserConfiguration {
  ttl: number;
  site: string;
  has_index_page: boolean;
  index_page: string;
  hierarchy?: { [level: string]: (content: any) => string[] };
  paging?: PagingConfiguration;
  list: (content: any) => any[];
  json?: boolean
  templates: OfferTemplates;
  languages: { [language: string]: LanguageConfiguration };
  headers?: { [header: string]: string };
  translations: string[];
  required_properties: string[];
}

class AbstractParser {
  protected config: ParserConfiguration = {
    has_index_page: false,
    index_page: '',
    hierarchy: {
      groups: () => { return [] },
      categories: () => { return [] }
    },
    list: () => [],
    templates: {
      content: () => { return '' },
      title: () => { return '' },
      pictures: () => { return [] },
      price: () => {
        return {
          current: 0,
          original: 0,
          discount: {
            amount: 0,
            percents: 0
          },
          currency: ''
        }
      },
      vendor: () => { return '' },
      description: () => { return '' }
    },
    languages: {},
    translations: [],
    required_properties: [],
    ttl: 0,
    site: '',
    headers: {}
  };

  getHierarchicalIndexPages = (options, content) => {
    if (this.config.hierarchy!!.pattern) {
      return this.config.hierarchy!!.pattern(content);
    }

    return this.config.hierarchy!!['level-' + options.hierarchy](content);
  };

  compilePagingParameters = (content, options) => {
    let pages: string[] = [];

    const firstPage = this.config.paging!!.first!!(content) || 1;
    let lastPage = this.config.paging!!.last!!(content) || 1;

    if (process.env.NODE_ENV === 'development' && process.env.PAGING_PAGES_LIMIT && _.toFinite(process.env.PAGING_PAGES_LIMIT) < lastPage) {
      lastPage = _.toFinite(process.env.PAGING_PAGES_LIMIT);
    } else if (options.limit && options.limit < lastPage) {
      lastPage = options.limit;
    } else if (this.config.paging!!.limit!! && this.config.paging!!.limit!! < lastPage) {
      lastPage = this.config.paging!!.limit!! || 1;
    }

    for (let pageNumber: number = firstPage; pageNumber <= lastPage; pageNumber++) {
      pages.push(this.compilePagingPattern(options)
        .replace(/{paging_pagenumber}/g, '' + pageNumber)
        .replace(/{search_criteria}/g, options.search)
      );
    }

    return {
      'pages': pages
    };
  };

  compilePagingPattern = (options?: any) => {
    const pattern = this.config.paging!!.pattern ? this.config.paging!!.pattern : this.config.index_page;
    return this.compilePageHref(pattern)
  };

  compilePageHref = (link) => {
    return this.config.index_page + link;
  };

  compileNextPageHref = (index: number = 0) => {
    index++;

    return this.compilePagingPattern().replace(/{paging_pagenumber}/g, '' + index);
  };

  getOffers = (content) => {
    let dataItems: any[] = [];

    try {
      dataItems = this.config.list.call(this, content);
    }
    catch (err) {
      content = null;
      LOG.error(util.format('[ERROR] Offers processing not scheduled', err));
    }

    if (process.env.NODE_ENV === 'development' && process.env.OFFERS_LIMIT) {
      dataItems = dataItems.slice(0, _.toFinite(process.env.OFFERS_LIMIT));
    }

    let metadata = _.map(dataItems, (item) => {
      let metadata = {
        'href': this.compileOfferHref(item)
      };

      if (this.config.json) {
        return _.extend(item, metadata);
      }

      return metadata;
    });

    return _.filter(metadata, (item) => {
      return item.href;
    });
  };

  content = (body) => {
    if (this.config.json && typeof body === 'string') {
      body = JSON.parse(body);
    }

    return this.config.templates.content.call(this, body);
  };

  parse = (body, callback) => {
    if (this.config.json && typeof body === 'string') {
      body = JSON.parse(body);
    }

    let offer = (function (that, data) {
      let templates = _.extend({}, that.config.templates);

      function _parseTemplates(body, templates) {
        let result = {};

        for (let key in templates) {

          if (key !== 'content' && templates.hasOwnProperty(key)) {
            const template = templates[key];

            if (typeof template === 'string') {
              result[key] = template;
            } else if (typeof template === 'object') {
              result[key] = _parseTemplates(body, template);
            } else if (typeof template === 'function') {
              const value = template.call(null, body);
              result[key] = typeof value === "string" ? value.trim().replace(/\t/g, ' ').replace(/\s\s+/g, ' ') : value;
            }
          }
        }

        return result;
      }

      try {
        const result = _parseTemplates(data, templates);

        data = null;

        return result;
      }
      catch (err) {
        console.error('Error parsing offer\'s data', err);

        return callback(new Error(util.format("Error parsing templates", err)), offer);
      }
    })(this, body);

    return callback(null, offer);
  };

  compileOfferHref = (link, language?: string) => {
    return this.config.index_page + link.replace(/&amp;/g, '&');
  };

  compileImageHref = (link) => {
    return this.config.index_page + link.replace(/&amp;/g, '&');
  };

  filterOfferProperties = (data) => {
    let offer = {};

    const filteredFields = ['language', 'href', 'content'];

    _.each(_.keys(data), property => {
      if (!_.includes(this.config.translations, property) && !_.includes(filteredFields, property)) {
        offer[property] = data[property];
      }
    });

    return offer;
  };

  compileTranslations = (options, data) => {
    let translations = {};
    translations[options.language] = {};

    _.each(_.keys(data), (property) => {
      if (data.hasOwnProperty(property) && _.includes(this.config.translations, property)) {
        translations[options.language][property] = data[property];
      }

      translations[options.language].href = options.href;
    });

    return translations;
  };

  getMainLanguage = () => {
    let mainLanguage = _.find(_.keys(this.config.languages), (language) => {
      return this.config.languages[language].main;
    });

    if (!mainLanguage) {
      console.error(new Error('Main language is not set'));
    }

    return mainLanguage;
  };

  priceCleanup = (price: string): number | undefined => {
    if (!_.isUndefined(price)) {
      return Number((+(('' + price).replace(/[^0-9.,]?/gi, '').replace(/,/gi, '.'))).toFixed(2));
    }

    return undefined;
  };

  compileDiscount = (current, original) => {
    let amount = 0;
    let percents = 0;

    if (current && original) {
      amount = original - current;
      percents = Math.floor(100 - current / original * 100);
    }

    return {
      amount: Number((+amount).toFixed(2)),
      percents: Number((+percents).toFixed(2)),
    };
  };

  validateOfferProperties = (offer) => {
    offer.is_valid = !_.some(this.config.required_properties, property => {
      return _.isUndefined(offer[property]) || _.isNil(offer[property]) || _.isEmpty(offer[property]);
    });
  }
}

export default AbstractParser;