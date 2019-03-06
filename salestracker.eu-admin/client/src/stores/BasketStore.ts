const _ = require('lodash');
const path = require('path');

import { StoreBase, AutoSubscribeStore, autoSubscribe, autoSubscribeWithKey } from 'resub';

import { IOffer } from './OfferStore';
import { IBundle, IBundleItem } from './BundlesStore';

enum TriggerKeys {
    AddedToBasket
}

@AutoSubscribeStore
export class BasketStore extends StoreBase {

    private _bundle: IBundle = { items: [] };
    private _withImages: boolean;

    @autoSubscribe
    getBundle() {
        return this._bundle;
    }

    @autoSubscribeWithKey(TriggerKeys.AddedToBasket)
    checkBasketContainsOffer(offer: IOffer): boolean {
        return _.some(this._bundle.items, (item: IBundleItem) => {
            return item.offer.origin_href === offer.origin_href;
        });
    }

    addOffer = (offer: IOffer): void => {
        this._bundle.items.push({
            offer: offer
        });

        this.trigger(TriggerKeys.AddedToBasket);
        this.trigger();
    }

    removeOffer = (offer: IOffer): void => {
        _.remove(this._bundle.items, (item: IBundleItem) => {
            return item.offer.origin_href === offer.origin_href;
        });

        this.trigger();
    }

    updateOffer = (offer: IOffer, values: { [key: string]: any }): void => {
        let foundBundleItem = _.find(this._bundle.items, (item: IBundleItem) => {
            return item.offer.origin_href === offer.origin_href;
        });

        foundBundleItem = _.extend(foundBundleItem, values);

        this.trigger();
    }

    @autoSubscribe
    getCompiledMessages() {
        let offerWidgetsPlain: string = '';
        let offerWidgetsHTML: string = '';

        this._bundle.items.map((item, i) => {
            const offer = item.offer;

            let optionalImage: string = '';

            if (offer.downloads && offer.downloads.pictures) {
                offerWidgetsPlain += '​​​​​​​​​​​[​​​​​​​​​​​](http://159.89.24.202:8000/img/offers/' + offer.downloads.pictures[0] + ') ' + offer.title;
            }

            if (item.comment) {
                offerWidgetsPlain += "\r\n\r\n" + item.comment;
            }

            offerWidgetsHTML += '<div>' + "\r\n" +
                optionalImage + "\r\n" +
                '<p><a href=' + item.offer.origin_href + ' title=' + item.offer.title + ' class="caption-title">' + item.offer.title + '</a></p>' + "\r\n" +
                '<p>' + item.offer.title + '</p>' + "\r\n" +
                '</div>';
        });

        return {
            'telegram': offerWidgetsPlain,
            'blog': offerWidgetsHTML
        }
    }

    @autoSubscribe
    showWithImages() {
        return this._withImages;
    }

    toggleWithImages() {
        this._withImages = !this._withImages;
        this.trigger();
    }

}

export default new BasketStore();
