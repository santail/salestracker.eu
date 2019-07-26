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
        const bundleItem = {
            offer: offer,
            caption: this._compileBundleItemCaption(offer)
        };

        this._bundle.items.push(bundleItem);

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
            offerWidgetsHTML += this._compileBundleItemCaption(item.offer);
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

    private _compileBundleItemCaption(offer: IOffer) {
        return '<a href="' + offer.origin_href + '">' + offer.title + '</a>' + "\r\n" +
            "\r\n" +
            '<strong>' + offer.price.current + '€</strong> / ' + offer.price.original + '€ (you win ' + offer.price.discount.amount + '€ or ' + offer.price.discount.percents + '%)'
    }

}

export default new BasketStore();
