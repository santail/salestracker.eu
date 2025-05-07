'use strict';

var _ = require("lodash");
var url = require("url");
var util = require("util");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class EuronicsParser extends AbstractParser {

  protected override config: ParserConfiguration = {
    'has_index_page': true,
    'index_page': 'https://www.euronics.ee/tooted/status/outlet/sort/pricechangedesc',
    'site': 'https://www.euronics.ee/',
    'ttl': 2 * 60 * 60 * 1000,
    'languages': {
      'est': {
        'exists': true,
        'main': true
      },
      'eng': {
        'exists': true,
        'findHref': ($) => {
          return $('ul.oi-lang-switch > li > a').filter((index: any, el: any) => {
            return $(el).text() === 'ENG';
          }).first().attr('href');
        }
      },
      'rus': {
        'exists': true,
        'findHref': ($) => {
          return $('ul.oi-lang-switch > li > a').filter((index: any, el: any) => {
            return $(el).text() === 'RUS';
          }).first().attr('href');
        }
      }
    },
    'paging': {
      'finite': true,
      'pattern': '/tooted/status/outlet/nr/{paging_pagenumber}',
      'first': function ($) {
        var controls = this.controls!!($);
        if (!controls.length) {
          return 1;
        }

        return controls.find('li.page').first().text().trim();
      },
      'last': function ($) {
        var controls = this.controls!!($);
        if (!controls.length) {
          return 1;
        }

        return controls.find('li.page').last().text().trim();
      },
      'controls': ($) => {
        return $('div.oi-pagination ol.oi-list').first();
      }
    },
    'list': ($) => {
      return $("div.oi-section-product-data ul.oi-grid-products > li.oi-item p.image > a").map((index: any, el: any) => {
        return $(el).attr('href');
      }).get();
    },
    'templates': {
      'content': ($) => {
        return $('div.oi-section-main-content').first().html();
      },
      'title': ($) => {
        var modelId = $('div.oi-main-article-header div > span').last().text().trim()
          .replace('Tootekood: ', '').replace('Product code: ', '').replace('Код товара: ', '');
        var title = $('div.oi-main-article-header > h1').text().trim();

        return util.format('%s %s', title, modelId);
      },
      'pictures': ($) => {
        var pictureUrls: string[] = [];

        var mainPictureUrl = $('div.oi-product-media > p.thumb > a').attr('href');

        if (mainPictureUrl) {
          pictureUrls.push(this.compileImageHref(mainPictureUrl));
        }

        let hrefs = $('div.oi-viewport-media > ol > li.oi-pager-item > a[data-img]').map((index: any, el: any) => {
          return this.compileImageHref($(el).attr('href'));
        }).get();

        _.merge(pictureUrls, hrefs);

        return pictureUrls;
      },
      'price': ($) => {
        let price = {
          'current': this.priceCleanup($('div.oi-product-description p.price > span').text()),
          'original': 0,
          'currency': 'EUR'
        } as any;

        if ($('div.oi-product-description p.price > span.new-price').length === 1) {
          price.current = this.priceCleanup($('div.oi-product-description p.price > span.new-price').text());
        }

        if ($('div.oi-product-description p.price > span.old-price').length === 1) {
          price.original = this.priceCleanup($('div.oi-product-description p.price > span.old-price').text());
        }

        price.discount = this.compileDiscount(price.current, price.original);

        return price;
      },
      'description': ($) => {
        return $('div.oi-product-description > div.oi-description').html();
      },
      'vendor': ($) => {
        var header = $('div.oi-product-details > table th').filter((index: any, el: any) => {
          return _.includes(['tootja:', 'Производитель:', 'producer:'], $(el).text());
        }).first();

        return header.next('td').text().trim();
      }
    },
    'translations': ['title', 'description'],
    'required_properties': ['description', 'price', 'pictures', 'title']
  };

  override compilePageHref = (link: any) => {
    return this.config.site + link;
  };

  override compilePagingPattern = () => {
    return this.config.site + this.config.paging!!.pattern;
  };

  override compileOfferHref = (link: any) => {
    return link;
  };

  override compileImageHref = (link: any) => {
    return link;
  };
};

module.exports = EuronicsParser;
