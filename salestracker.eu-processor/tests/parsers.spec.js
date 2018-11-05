'use strict';

var expect = require('chai').expect;
var _ = require("lodash")._;
var fs = require("fs");
var tidy = require('htmltidy').tidy;
var cheerio = require("cheerio");

var sites = {
    'www.selver.ee': {
        'https://www.selver.ee/siider-kopparberg-metsamarja-500-ml-purk-1': true,
        'https://www.selver.ee/the-famous-grouse-smoky-black-70-cl': true
    }
};

_.each(_.keys(sites), function (site) {

    var Parser = require('./../lib/parsers/' + site + '.parser.ts');
    var parser = new Parser();

    describe('Checking ' + parser.config.site + ' ...', function () {

        _.each(_.keys(sites[site]), function (url) {
            const offerHref = new URL(url);

            var data = JSON.parse(fs.readFileSync(__dirname + '/' + site + '/' + offerHref.pathname + '.data.json', 'utf8'));
            var content = fs.readFileSync(__dirname + '/' + site + '/' + offerHref.pathname, 'utf8');

            describe(url, function () {

                it("All offer properties parsed successfully", function (done) {

                    tidy(content, {
                        doctype: 'html5',
                        indent: false,
                        bare: true,
                        breakBeforeBr: false,
                        hideComments: false,
                        fixUri: false,
                        wrap: 0
                    }, (err, body) => {
                        if (err) {
                            return done(err);
                        }

                        var dom = cheerio.load(body, {
                            normalizeWhitespace: true,
                            lowerCaseTags: true,
                            lowerCaseAttributeNames: true,
                            recognizeCDATA: true,
                            recognizeSelfClosing: true,
                            decodeEntities: false
                        });

                        parser.parse(dom, function (err, offer) {
                            expect(err).to.be.null;
                            expect(offer).to.not.be.empty;
                            expect(data).to.deep.equal(offer);

                            done();
                        });
                    });
                });
            });
        });
    });
});