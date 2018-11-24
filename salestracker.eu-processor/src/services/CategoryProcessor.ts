var _ = require('lodash');
var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

const CATEGORIES = {
    'alcohol': ['Sauvignon', 'Bordeaux', 'Pinot', 'Mojito', 'Captain Morgan', 'Bacardi', 'Beefeater', 'Fresita', 'Veuve du Vernay', 'A.LE COQ'],
    'cosmetics': [],
    'children': ['Pampers', 'HUGGIES'],
    'toys': ['LEGO FRIENDS'],
    'fashion': []
}

class CategoryProcessor {

    process(data, done) {
        LOG.info(util.format('[OK] [%s] Offer category processing started %s', data.site, data.origin_href));

        SessionFactory.getDbConnection().offers.findOne({
            origin_href: data.origin_href
        }, (err, foundOffer) => {
            if (err) {
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return done(err);
            }

            if (!foundOffer) {
                // TODO Mark somehow failed offer and re-run harvesting
                LOG.error(util.format('[ERROR] Offer category processing failed. Offer not found %', data.origin_href));
                return done(new Error('Offer not found for update: ' + data.origin_href));
            }

            let categories = this._findCategories(foundOffer.translations.est.title);

            if (!categories.length) {
                return done();
            }

            SessionFactory.getDbConnection().offers.update({
                origin_href: data.origin_href
            }, {
                $set: {
                    category: categories
                }
            }, function (err) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer category processing failed', data.site, data.href, err));
                    return done(err);
                }

                return done();
            });
        });
    }

    private _findCategories = (title: string) => {
        LOG.info(util.format('[OK] [%s] Offer categories search', title));

        let categories = _.filter(_.keys(CATEGORIES), (category) => {
            LOG.info(util.format('[OK] [%s] Offer categories search', category));

            let tags = CATEGORIES[category];

            return _.some(tags, tag => {
                LOG.info(util.format('[OK] [%s] Offer categories search', tag));

                return title.toLowerCase().indexOf(tag.toLowerCase()) >= 0;
            });
        });

        LOG.info(util.format('[OK] [%s] Offer categories search', categories));

        return categories;
    }
}

export default new CategoryProcessor();