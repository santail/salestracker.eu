
import { autoSubscribe, AutoSubscribeStore, StoreBase } from 'resub';

export interface Offer {
    name: string;
}

@AutoSubscribeStore
export class OfferStore extends StoreBase {

    private _offers: Offer[] = [];

    @autoSubscribe
    getOffers(): Offer[] {
        return this._offers;
    }

    setOffers(offers: Offer[]) {
        this._offers = offers;

        this.trigger();
    }
}

export default new OfferStore();
