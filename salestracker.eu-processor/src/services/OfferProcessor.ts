var _ = require('lodash');
var path = require('path');
var slugify = require('slugify');
var util = require('util');
import { URL } from 'url';

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require('../../lib/services/SessionFactory');

import ElasticIndexer from './ElasticIndexer';
import WorkerService from './WorkerService';


class OfferProcessor {

    process = (data, done): any => {
        var parser = parserFactory.getParser(data.site);
        var translations = parser.compileTranslations(data);

        if (!data.origin_href && parser.config.languages[data.language].main) {
            var offer = parser.compileOffer(data);
            offer.translations = translations;
            offer.origin_href = data.href;

            // should not process pictures if development environment and switched off
            var shouldProcessPictures = process.env.NODE_ENV !== 'development' || process.env.SHOULD_HARVEST_PICTURES !== 'false';

            if (data.pictures && data.pictures.length > 0) {
                var pictures: string[] = [];

                _.each(data.pictures, function (picture) {
                    if (shouldProcessPictures) {
                        WorkerService.scheduleImageProcessing({
                            'site': data.site,
                            'offerHref': data.href,
                            'href': picture
                        });
                    }

                    const offerHref = new URL(data.href);
                    picture = path.join(data.site + '/' + slugify(offerHref.pathname), path.basename(picture));

                    pictures.push(picture)
                });

                offer.pictures = pictures;
            }

            SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', data.site, data.id, err));
                    return done(err);
                }

                if (!saved) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', data.site, data.id, err));
                    return done(new Error('DB save query failed'));
                }

                LOG.info(util.format('[STATUS] [OK] [%s] Offer saved %s', data.site, data.href));

                _.each(_.keys(parser.config.languages), function (language) {
                    if (parser.config.languages[language].main || !parser.config.languages[language].exists) {
                        return;
                    }

                    WorkerService.scheduleOfferProcessing({
                        'site': data.site,
                        'language': language,
                        'href': parser.compileOfferHref(data.href, language),
                        'origin_href': offer.origin_href
                    });
                });

                offer = _.extend(offer, offer.translations[data.language]);
                offer.language = data.language;

                ElasticIndexer.indexOffer(offer, done);
            });
        } else if (data.origin_href) {
            SessionFactory.getDbConnection().offers.findOne({
                origin_href: data.origin_href
            }, function (err, foundOffer) {
                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] Checking offer failed', err));
                    return done(err);
                }

                if (!foundOffer) {
                    // TODO Mark somehow failed offer and re-run harvesting
                    LOG.error(util.format('[STATUS] [Failure] Checking offer failed. Offer not found %', data.origin_href));
                    return done(new Error('Offer not found for update: ' + data.origin_href));
                }

                SessionFactory.getDbConnection().offers.update({
                    origin_href: data.origin_href
                }, {
                    $set: {
                        translations: _.extend(foundOffer.translations, translations)
                    }
                }, function (err) {
                    if (err) {
                        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Updating offer failed', data.site, data.href, err));
                        return done(err);
                    }

                    foundOffer = _.extend(foundOffer, translations[data.language]);
                    foundOffer.language = data.language;

                    ElasticIndexer.indexOffer(foundOffer, done);
                });
            });
        }
    }
}

export default new OfferProcessor();