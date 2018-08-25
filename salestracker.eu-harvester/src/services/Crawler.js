var tidy = require('htmltidy').tidy;
var cheerio = require("cheerio");
var request = require("request");
var util = require("util");

var LOG = require("../../lib/services/Logger");


function Crawler() {
    this.config = {
        'headers': {
            'accept': "application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
            'accept-language': 'en-US,en;q=0.8',
            'accept-charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3'
        },
        'userAgents': [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
            'Mozilla/5.0 (Windows NT 5.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
            'Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1)',
            'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
            'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (Windows NT 6.2; WOW64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/5.0)',
            'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; .NET CLR 2.0.50727; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)'
        ],
        proxies: [{
            'http': '159.224.176.205:53281',
            'https': '159.224.176.205:53281'
        }, {
            'http': '84.47.174.19:8080',
            'https': '84.47.174.19:8080'
        }, {
            'http': '85.130.3.136:53281',
            'https': '85.130.3.136:53281'
        }, {
            'http': '51.15.227.220:3128',
            'https': '51.15.227.220:3128'
        }]
    };
}

Crawler.prototype.request = function (options) {
    var that = this;

    var retries = 3;

    var headers = options.headers || that.config.headers;

    if (!headers.hasOwnProperty('User-Agent')) {
        headers['User-Agent'] = that.config.userAgents[Math.ceil(Math.random(1) * that.config.userAgents.length)];
    }

    var requestOptions = {
        uri: options.url,
        method: 'GET',
        gzip: true,
        headers: headers,
        // proxy: that.config.proxies[Math.ceil(Math.random(1) * that.config.proxies.length) - 1].http
    };

    if (options.encoding) {
        requestOptions.encoding = options.encoding;
    }

    if (options.payload) {
        requestOptions.method = 'POST';
        requestOptions.body = options.payload;
        requestOptions.encoding = 'binary';
    }

    var handler = function (err, response, data) {
        response = response || {};

        if (err || response.statusCode !== 200 || !data) {
            if (retries) {
                var timeout = Math.ceil(Math.random(1) * 10000);

                retries--;

                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching url failed. Retry in %s msec. Retries left %s', that.config.site, options.url, timeout, retries, err));
                }
                else if (response.statusCode !== 200) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Fetching url failed. Retry in %s msec. Retries left %s', that.config.site, options.url, response.statusCode, timeout, retries));
                }
                else {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Fetching url failed. No data received. Retry in %s msec. Retries left %s', that.config.site, options.url, response.statusCode, timeout, retries));
                }

                setTimeout(function () {
                    response = null;
                    data = null;

                    // requestOptions.proxy = that.config.proxies[Math.ceil(Math.random(1) * that.config.proxies.length) - 1].http;

                    request(requestOptions, handler);
                }, timeout);
            }
            else {
                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Fetching url failed', that.config.site, options.url, response.statusCode));

                retries = null;
                return options.onError(new Error('Error fetching page. No retries left.'));
            }
        }
        else {
            response = null;

            var parsingFinishedCallback = function (err, result) {
                data = null;

                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Parsing page body failed %s', that.config.site, options.url, err));
                    return options.onError(err);
                }

                return options.onSuccess(null, result);
            };

            if (options.json) {
                that.parseJSONResponseBody(data, options, parsingFinishedCallback);
            } else {
                that.parseHtmlResponseBody(data, options, parsingFinishedCallback);
            }
        }
    };

    try {
        request(requestOptions, handler);
    }
    catch (err) {
        return options.onError(err);
    }
};

Crawler.prototype.parseJSONResponseBody = function (data, options, callback) {
    var that = this;

    LOG.debug('Parsing response', data);

    try {
        if (data && typeof data === 'string') {
            data = JSON.parse(data);
        }
    }
    catch (ex) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Parsing page body failed %s', that.config.site, options.url, ex));
    }

    try {
        return callback(null, data);
    }
    catch (ex) {
        LOG.error(util.format('[STATUS] [Failure] Parse response body failed %s', ex));
        callback(new Error(ex.message));
    }
};

Crawler.prototype.parseHtmlResponseBody = function (data, options, callback) {
    var that = this;

    // TODO Warning: tidy uses 32 bit binary instead of 64, https://github.com/vavere/htmltidy/issues/11
    // TODO Needs manual update on production for libs

    tidy(data, {
        doctype: 'html5',
        indent: false,
        bare: true,
        breakBeforeBr: false,
        hideComments: false,
        fixUri: false,
        wrap: 0
    }, function (err, body) {
        data = null;

        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Cleanup response body failed', that.config.site, options.url, err));
            return callback(err);
        }

        var dom = cheerio.load(body, {
            normalizeWhitespace: true,
            lowerCaseTags: true,
            lowerCaseAttributeNames: true,
            recognizeCDATA: true,
            recognizeSelfClosing: true,
            decodeEntities: false
        });

        body = null;

        return callback(null, dom);
    });
};


module.exports = Crawler;
