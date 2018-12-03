var _ = require('lodash');
var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

const CATEGORIES = {
    'alcohol': [
        'Sauvignon', 'Bordeaux', 'Pinot', 'Mojito', 'Captain Morgan', 'Bacardi', 
        'Beefeater', 'Fresita', 'Veuve du Vernay', 'St. Remy', 'Moet & Chandon', 'Shiraz',
        'A.LE COQ', 'Vana Tallinn', 'Riesling', 'Cabernet', 'Chardonnay', 'Merlot', 'Hennessy', 'Cognac',
        'Liviko Liköör', 'Caribba Blanco', 'Freixenet Cordon', 'Caribba Negro', 'Larsen V.S', 'Saaremaa Vodka', 
        'Russian Standart', 'Baileys', 'Calvados Coquerel', 'Ballantine\'s', 'Scotch Whisky', 'Pinot Grigio', 
        'Jack Daniel\'s', 'Jim Beam', 'Jägermeister', 'Leffe Blonde', 'Tullamore Dew', 'Törley', 'Krusovice',
        'Pipra Naps', 'Gran Reserva', 'Nederburg Winemasters', 'Somersby Orchard', 'J. P. Chenet', 'Metsis Handcrafted',
        'Prosecco', 'Cointreau', 'Veuve Clicquot', 'St.Remy', 'Martell V.S', 'J.P.Chenet', 'Ibis brändi X.O.',
        'Sierra Tequila', 'Russian Standard', 'Beluga Noble', 'Carlsberg ', 'Aramis V', 'Gran Castillo',
        'Old Tbilisi', 'Rigol Cava', 'Torres', 'Napoleon VS', 'Rigol Cava', 'Torres'
    ],
    'cosmetics': ['Himalaya', 'Garnier', 'Vuokkoset'],
    'children': ['Pampers', 'HUGGIES'],
    'toys': ['LEGO FRIENDS'],
    'fashion': [],
    'pets': ['KITEKAT']
}

class CategoryProcessor {

    process(options, done) {
        LOG.info(util.format('[OK] [%s] Offer category processing started %s', options.site, options.origin_href));

        SessionFactory.getDbConnection().offers.findOne({
            origin_href: options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return done(err);
            }

            if (!foundOffer) {
                // TODO Mark somehow failed offer and re-run harvesting
                LOG.error(util.format('[ERROR] Offer category processing failed. Offer not found %', options.origin_href));
                return done(new Error('Offer not found for update: ' + options.origin_href));
            }

            let categories = this._findCategories(foundOffer);

            if (!categories.length) {
                return done();
            }

            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, {
                $set: {
                    category: categories
                }
            }, function (err) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer category processing failed', options.site, options.href, err));
                    return done(err);
                }

                return done();
            });
        });
    }

    private _findCategories = (offer: any) => {
        let title = offer.translations.est ? offer.translations.est.title : offer.translations.eng.title;

        return _.filter(_.keys(CATEGORIES), (category) => {
            let tags = CATEGORIES[category];

            return _.some(tags, tag => {
                return title.toLowerCase().indexOf(tag.toLowerCase()) >= 0;
            });
        });
    }
}

export default new CategoryProcessor();