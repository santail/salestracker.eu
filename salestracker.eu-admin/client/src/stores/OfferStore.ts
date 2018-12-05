const _ = require('lodash');
const querystring = require('querystring');

import { StoreBase, AutoSubscribeStore, autoSubscribe } from 'resub';

export interface IOffer {
    site: string;
    title: string;
    language: string;
    href: string;
    origin_href: string;
    downloads: {
        pictures: string[];
    },
    price: {
        current: Number,
        original: Number,
        discount: {
            amount: Number,
            percents: Number
        }
    }
};

export interface IPaging {
    pageSize: number;
    activePage: number;
    pagesTotal: number;
};

export interface OffersSearchOptions {
    activePage: number;
    pageSize: number;
    site?: string;
    category?: string;
}
export interface IOffersRequestResult {
    offers: IOffer[];
    total: number;
    paging: IPaging;
};

@AutoSubscribeStore
export class OfferStore extends StoreBase {
    private _result: IOffersRequestResult = { 
        offers: [], 
        total: 0, 
        paging: { 
            pageSize: 0, 
            activePage: 0, 
            pagesTotal: 0 
        } 
    };

    @autoSubscribe
    getOffersWithPaging() {
        return this._result;
    }

    loadOffers = (options: OffersSearchOptions): void => {
        const params = {
            'count': options.pageSize,
            'page': options.activePage,
        } as any;

        if (options.site) {
            params.site = options.site;
        }

        if (options.category && options.category !== 'all') {
            params.category = options.category;
        }

        fetch(`/api/offers/?${querystring.stringify(params)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        })
            .then((response) => response.json())
            .then((responseJson) => {
                const total = responseJson.total;
                let offers: IOffer[] = [];

                _.each(responseJson.results, (offer: any) => {
                    if (offer.translations.eng) {
                        offer.title = offer.translations.eng.title;
                        offer.href = offer.translations.eng.href;
                        offer.language = 'eng';
                    } 
                    else if (offer.translations.est) {
                        offer.title = offer.translations.est.title;
                        offer.href = offer.translations.est.href;
                        offer.language = 'est';
                    } 
                    else if (offer.translations.rus) {
                        offer.title = offer.translations.rus.title;
                        offer.href = offer.translations.rus.href;
                        offer.language = 'rus';
                    }

                    if (!offer.downloads || !offer.downloads.pictures) {
                        offer.downloads = { pictures: []}
                    }

                    offers.push(offer as IOffer);
                });

                this._result.offers = offers;
                this._result.total = total;

                this._result.paging = {
                    pageSize: options.pageSize,
                    activePage: options.activePage,
                    pagesTotal: (total % options.pageSize > 0 ? 1 : 0) + Math.floor(total / options.pageSize)
                };

                this.trigger();
            })
            .catch((error) => {
                console.error(error);
            });
    }
}

export default new OfferStore();
