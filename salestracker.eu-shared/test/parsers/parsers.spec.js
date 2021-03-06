'use strict';

var expect = require('chai').expect;
var _ = require("lodash")._;
var fs = require("fs");
var cheerio = require("cheerio");

var sites = {
    'www.barbora.ee': {
        // 'https://www.barbora.ee/toode/valge-sok-mee-mandlitega-toblerone-100-g': true,
    },
    'www.selver.ee': {
        // 'https://www.selver.ee/siider-kopparberg-metsamarja-500-ml-purk-1': true,
    },
    'www.zoomaailm.ee': {
        // 'https://www.zoomaailm.ee/ee/koerad/kausid/alusel-kausid-koertele/keraamilised-kausid-edition-komplekt-alusega-2tkx0-3l-12cm-35x22cm': true,
    },
    'www.euronics.ee': {
        'https://www.euronics.ee/t/81165/telefonid/nutitelefon-samsung-galaxy-j3-(2017)-dual-sim/sm-j330fzkdseb': true,
    }
};

_.each(_.keys(sites), function (site) {

    var Parser = require('../../lib/parsers/' + site + '.parser.ts');
    var parser = new Parser();

    describe('Checking ' + parser.config.site + ' ...', function () {

        _.each(_.keys(sites[site]), function (url) {
            const offerHref = new URL(url);

            var filename = _.last(offerHref.pathname.split('/'));

            describe(url, function () {
                it("Getting content succeeded", function () {

                });

                it("All offer properties parsed successfully", function (done) {
                    var data = JSON.parse(fs.readFileSync(__dirname + '/' + site + '/' + filename + '.data.json', 'utf8'));

                    var dom = cheerio.load(data.content, {
                        normalizeWhitespace: true,
                        lowerCaseTags: true,
                        lowerCaseAttributeNames: true,
                        recognizeCDATA: true,
                        recognizeSelfClosing: true,
                        decodeEntities: false
                    });

                    parser.parse(dom, function (err, offer) {
                        delete data.content;
                        delete data.href;

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