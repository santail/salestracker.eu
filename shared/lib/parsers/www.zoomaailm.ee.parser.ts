'use strict';

var url = require("url");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class ZoomaailmParser extends AbstractParser {

    protected config: ParserConfiguration = {
        'site': 'https://www.zoomaailm.ee/',
        'indexPage': 'https://www.zoomaailm.ee/ee/specials/',
        'ttl': 2 * 60 * 60 * 1000,
        'languages': {
            'est': {
                'exists': true,
                'main': true
            },
            'rus': {
                'exists': true
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
            'title': ($) => {
                return $('div.product-essential div.product-shop div.product-name > h1').text().trim();
            },
            'pictures': ($) => {
                return $('div.product-essential div.product-img-box > div.more-views > ul > li > a').map(function (index, el) {
                    return $(el).attr('onclick').replace(/popWin\('(.*?)/, "$1").replace(/', (.*)/, "");
                }).get();
            },
            'price': ($) => {
                var current = this.priceCleanup($('div.product-essential div.product-shop div.price-box > p.special-price > span.price').text());
                var original = this.priceCleanup($('div.product-essential div.product-shop div.price-box > p.old-price > span.price').text());

                return {
                    current: current,
                    original: original,
                    discount: this.compileDiscount(current, original)
                }
            },
            'currency': () => {
                return 'EUR';
            },
            'description': ($) => {
                return $('div.product-essential div.description > div.std').text();
            },
            'vendor': ($) => {
                return $('#product-attribute-specs-table tbody tr.manufacturer td.data').text();
            }
        },
        'translations': ['title', 'description']
    };

    compilePagingPattern = (options) => {
        return options.href + this.config.paging!!.pattern;
    };

    compilePageHref = (link) => {
        return link;
    };

    compileOfferHref = (link) => {
        return url.resolve(this.config.indexPage, link);
    };
};

module.exports = ZoomaailmParser;