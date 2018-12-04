'use strict';

var _ = require("lodash");
var url = require("url");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";


class RimiParser extends AbstractParser {

  protected config: ParserConfiguration = {
    'site': 'www.rimi.ee',
    'has_index_page': true,
    'index_page': 'https://www.rimi.ee/pakkumised',
    'ttl': 2 * 60 * 60 * 1000,
    'languages': {
      'est': {
        'exists': true,
        'main': true
      },
      'eng': {
        'exists': false
      },
      'rus': {
        'exists': false
      }
    },
    'list': ($) => {
      return $('div.offers section.offers-group a.offer-card').map((index, el) => {
        return $(el).attr('href');
      }).get();
    },
    'templates': {
      'content': ($) => {
        return $('section.offer').html();
      },
      'title': ($) => {
        return $('div.offer-card__basics div.offer-card__name').text();
      },
      'pictures': ($) => {
        return [$('div.offer-card__image div.offer-card__image-cloudinary').attr('style').replace(/background-image\: url\('/gi, '').replace(/'\)/gi, '')];
      },
      'price': ($) => {
        const badge = $('div.offer-price.simple.percent');

        if (badge.length > 0) {
          return {
            current: 0,
            original: 0,
            discount: {
              amount: 0,
              percents: $('div.container__badge-price div.price-badge > div.new').text().replace('-', '').replace('%', '')
            },
            currency: 'EUR'
          };
        }

        const integer = $('div.container__badge-price div.price-badge > div.new div.price-badge__left > div.euro').text();
        const cents = $('div.container__badge-price div.price-badge > div.new div.price-badge__right > div.price-badge__right__top > div.cents').text();
        
        let current = this.priceCleanup(integer + '.' + cents);
        let original = this.priceCleanup($('div.container__badge-price div.price-badge > div.old').text());
        let discount = this.compileDiscount(current, original);

        return {
          current: current,
          original: original,
          discount: discount,
          currency: 'EUR'
        };
      },
      'client_card_required': ($) => {
        if ($('div.offer-price.simple.percent.card').length > 0) {
          return true;
        }

        return false;
      },
      'offers_group': ($) => {
        const badge = $('div.offer-price.simple.percent');

        if (badge.length > 0) {
          return !badge.hasClass('card');
        }

        return false;
      },
      'description': ($) => {
        return '';
      }
    },
    'translations': ['title'],
    'required_properties': ['title', 'price']
  };

  compileImageHref = (link) => {
    return link;
  };
  
  compileOfferHref = (link) => {
    return link;
  };
};

module.exports = RimiParser;