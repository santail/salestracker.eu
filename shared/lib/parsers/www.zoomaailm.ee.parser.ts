'use strict';

var url = require("url");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class ZoomaailmParser extends AbstractParser {

    protected config: ParserConfiguration = {
        'site': 'https://www.zoomaailm.ee/',
        'has_index_page': true,
        'index_page': 'https://www.zoomaailm.ee/ee/specials/',
        'ttl': 2 * 60 * 60 * 1000,
        'languages': {
            'est': {
                'exists': true,
                'main': true
            },
            'rus': {
                'exists': true,
                'findHref': ($) => {
                    return $('div.header-container div.header div.form-language > a.lang-selector_ru').attr('href');
                }
            }
        },
        'hierarchy': {
            'pattern': ($) => {
                return $('ul.category-list > li div.title > h2 > a').map((index, el) => {
                    return this.compilePageHref($(el).attr('href'));
                }).get();
            }
        },
        'paging': {
            'finit': true,
            'pattern': '&limit=12&p={paging_pagenumber}',
            'first': function ($) {
                var controls = this.controls!!($);
                if (!controls.length) {
                    return 1;
                }

                return this.controls!!($).find('ol > li.current').text();
            },
            'last': function ($) {
                var controls = this.controls!!($);
                if (!controls.length) {
                    return 1;
                }

                return controls.find('ol > li').last().find('a').attr('href').replace(/.*p=(\d)/, "$1");
            },
            'controls': ($) => {
                return $('div.pager > div.pages').first();
            }
        },
        'list': function ($) {
            return $('ul.products-grid > li > a').map(function (index, el) {
                return $(el).attr('href');
            }).get();
        },
        'templates': {
            'content': ($) => {
                return $('div.product-essential').html();
            },
            'title': ($) => {
                return $('div.product-shop div.product-name > h1').text().trim();
            },
            'pictures': ($) => {
                return $('div.product-img-box > div.more-views > ul > li > a > img').map(function (index, el) {
                    return $(el).attr('src').replace(/\/thumbnail\/56x/, "/image/365x");
                }).get();
            },
            'price': ($) => {
                var current = this.priceCleanup($('div.product-shop div.price-box > p.special-price > span.price').text());
                var original = this.priceCleanup($('div.product-shop div.price-box > p.old-price > span.price').text());

                return {
                    current: current,
                    original: original,
                    discount: this.compileDiscount(current, original),
                    currency: 'EUR'
                }
            },
            'description': ($) => {
                return $('div.description > div.std').text();
            },
            'vendor': ($) => {
                return $('#product-attribute-specs-table tbody tr.manufacturer td.data').text();
            }
        },
        'translations': ['title', 'description'],
        'required_properties': ['description', 'price', 'pictures', 'title']
    };

    compilePagingPattern = (options) => {
        return options.href + this.config.paging!!.pattern;
    };

    compilePageHref = (link) => {
        return link;
    };

    compileOfferHref = (link) => {
        return url.resolve(this.config.index_page, link);
    };
};

module.exports = ZoomaailmParser;