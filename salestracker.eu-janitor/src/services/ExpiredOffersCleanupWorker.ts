import _ from "lodash";
import util from "util";

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';


class ExpiredOffersCleanupWorker {

    startUp = (): any => {
        this._processSiteOffers();
    };

    private _processSiteOffers() {
        let currentTime = new Date().getTime();

        SessionFactory.getDbConnection().offers.findOne({
            expires: {
                "$lt": new Date(currentTime - 6 * 60 * 60 * 1000)
            }
        }, (err, foundOffer) => {
            if (err) {
                LOG.error(util.format('[ERROR] Expired offers not found. Waiting processing.', err));

                this._deleteNextExpiredOffer(10 * 60 * 1000);
                return;
            }

            if (!foundOffer) {
                LOG.info(util.format('[OK] Expired offers not found. Waiting processing.'));

                this._deleteNextExpiredOffer(10 * 60 * 1000);
                return;
            }

            LOG.info(util.format('[OK] [%s] [%s] Expired offer found. Removing.', foundOffer.site, foundOffer.origin_href));

            let promises = _.map(['est', 'eng', 'rus'], language => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] Clearing index', foundOffer.site, foundOffer.origin_href, language));

                const index = 'salestracker-' + language;

                return SessionFactory.getElasticsearchConnection().deleteByQuery({
                    index: index,
                    type: 'offers',
                    body: {
                        query: {
                            term: { origin_href: foundOffer.origin_href }
                        }
                    }
                })
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Removing expired offer from index finished', foundOffer.site, foundOffer.origin_href, index));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Removing expired offer from index failed', foundOffer.site, foundOffer.origin_href, index, err));
                });
            });

            Promise.all(promises)
                .then(() => {

                    // remove pictures
                    SessionFactory.getDbConnection().offers.remove({
                        origin_href: foundOffer.origin_href
                    }, err => {
                        if (err) {
                            // TODO reclaim event processing
                            LOG.error(util.format('[ERROR] Expired offers clean-up failed.', err));

                            this._deleteNextExpiredOffer(10 * 60 * 1000);
                            return;
                        }

                        LOG.info(util.format('[OK] [%s] [%s] Expired offer removed from database', foundOffer.site, foundOffer.origin_href));

                        this._deleteNextExpiredOffer();
                    });

                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Removing expired document index failed', foundOffer.site, foundOffer.origin_href, err));
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