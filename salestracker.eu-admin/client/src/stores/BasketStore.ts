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
        var foundBundleItem = _.find(this._bundle.items, (item: IBundleItem) => {
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
            const imagePath = '/img/offers/' + path.basename(item.offer.downloads.pictures[0]);
            let optionalImage: string = '';

            if (this._withImages) {
                optionalImage = '<p><img alt="' + item.offer.category + '" src="' + imagePath + '" /></p>';
            }

            offerWidgetsPlain += optionalImage + "\r\n" + "\r\n" +
                item.offer.origin_href + "\r\n" +
                item.offer.brand + "\r\n" +
                item.offer.category;

            offerWidgetsHTML += '<div>' + "\r\n" +
                optionalImage + "\r\n" +
                '<p><a href=' + item.offer.origin_href + ' title=' + item.offer.category + ' class="caption-title">' + item.offer.brand + '</a></p>' + "\r\n" +
                '<p>' + item.offer.category + '</p>' + "\r\n" +
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
