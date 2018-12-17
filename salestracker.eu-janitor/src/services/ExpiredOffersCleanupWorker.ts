import { ObjectId } from 'bson';
var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');


class ExpiredOffersCleanupWorker {

    startUp = (): any => {
        this._processSiteOffers();
    };

    private _processSiteOffers() {
        var currentTime = new Date().getTime();
        
        SessionFactory.getDbConnection().offers.findOne({ 
                expires: { 
                    "$lt":  new Date(currentTime - 6 * 60 * 60 * 1000) 
                }
            }, (err, foundOffer) => {            
                if (err) {
                    LOG.error(util.format('[ERROR] Expired offers not found. Waiting processing.'), err);

                    this._deleteNextExpiredOffer(10 * 60 * 1000);
                    return;
                }

                if (!foundOffer) {
                    LOG.info(util.format('[OK] Expired offers not found. Waiting processing.'));

                    this._deleteNextExpiredOffer(10 * 60 * 1000);
                    return;
                }

                LOG.info(util.format('[OK] [%s] [%s] Expired offer found. Removing.', foundOffer.site, foundOffer.origin_href));

                // remove pictures
                SessionFactory.getDbConnection().offers.remove({ 
                    _id: new ObjectId(foundOffer._id)
                }, err => {            
                    if (err) {
                        // TODO reclaim event processing
                        LOG.error(util.format('[ERROR] Expired offers clean-up failed.'), err);
                        return;
                    }
        
                    LOG.info(util.format('[OK] [%s] [%s] Expired offer removed.', foundOffer.site, foundOffer.origin_href));
        
                    this._deleteNextExpiredOffer();
                });
            });
    };

    private _deleteNextExpiredOffer(timeout = 0) {
        setTimeout(() => {
            this._processSiteOffers();
        }, timeout)
    }
}

export default new ExpiredOffersCleanupWorker();