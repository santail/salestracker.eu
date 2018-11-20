const _ = require('lodash');
const querystring = require('querystring');

import { StoreBase, AutoSubscribeStore, autoSubscribe } from 'resub';

import { IOffer } from './OfferStore';

export interface IBundleItem {
    offer: IOffer;
    comment?: string;
    title?: string;
};

export interface IBundle {
    items: IBundleItem[];
    title?: string;
};

export interface IPaging {
    pageSize: number;
    activePage: number;
    pagesTotal: number;
};

export interface IBundlesRequestResult {
    bundles: IBundle[];
    total: number;
    paging: IPaging;
};

@AutoSubscribeStore
export class BundlesStore extends StoreBase {
    private _result: IBundlesRequestResult = { bundles: [], total: 0, paging: { pageSize: 0, activePage: 0, pagesTotal: 0 } };

    @autoSubscribe
    getBundlesWithPaging() {
        return this._result;
    }

    loadBundles = (paging: IPaging): void => {

    }
    
    removeBundle = (bundle: IBundle): void => {
        this.trigger();
    }

    getArchiveBundles = (): IBundle[] => {
        return [];
    }

    sendBundle = (): void => {
        
    }
}

export default new BundlesStore();
