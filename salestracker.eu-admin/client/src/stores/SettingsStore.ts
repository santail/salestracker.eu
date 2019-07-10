const _ = require('lodash');
import { StoreBase, AutoSubscribeStore, autoSubscribe } from 'resub';

export interface IOffersRequestResult {
    sites: string;
    categories: string;
};

export interface ISite {
    name: string;
    href: string;
    active?: boolean;
};

export interface ICategory {
    category: string;
    tags: string[];
};

export interface ISettings {
    sites: ISite[];
    categories: ICategory[];
};

@AutoSubscribeStore
export class SettingsStore extends StoreBase {
    private _sites: string = '';
    private _categories: string = '';

    loadSettings = (): void => {
        const sitesSettingsPromise = this._requestSitesSettings();
        const categoriesSettingsPromise = this._requestCategoriesSettings();

        Promise.all([sitesSettingsPromise, categoriesSettingsPromise])
            .then(() => {
                console.log('Settings loaded');
            })
            .catch(err => {
                console.log('Settings loading failed', err);
            });
    };

    saveSettings = (settings: any) => {
        const sitesSettingsPromise = this._saveSitesSettings(settings.sites);
        const categoriesSettingsPromise = this._saveCategoriesSettings(settings.categories);

        Promise.all([sitesSettingsPromise, categoriesSettingsPromise])
            .then(() => {
                console.log('Settings saved');
            })
            .catch(err => {
                console.log('Settings save failed', err);
            });
    };

    private _requestSitesSettings = () => {
        return fetch(`/api/sites`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        })
        .then((response) => response.json())
        .then((responseJson) => {
            this._sites = responseJson;
            this.trigger();
        })
        .catch((error) => {
            console.error(error);
        });
    }

    private _requestCategoriesSettings = () => {
        return fetch(`/api/categories`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        })
        .then((response) => response.json())
        .then((responseJson) => {
            this._categories = responseJson;
            this.trigger();
        })
        .catch((error) => {
            console.error(error);
        });
    }

    private _saveSitesSettings = (sites: any) => {
        return fetch(`/api/sites`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sites)
        })
        .then((response) => response.json())
        .then((responseJson) => {
            this._sites = JSON.stringify(responseJson.ops, undefined, 4);
            this.trigger();
        })
        .catch((error) => {
            console.error(error);
        });
    }

    private _saveCategoriesSettings = (categories: any) => {
        return fetch(`/api/categories`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(categories)
        })
        .then((response) => response.json())
        .then((responseJson) => {
            this._categories = JSON.stringify(responseJson.ops, undefined, 4);
            this.trigger();
        })
        .catch((error) => {
            console.error(error);
        });
    }

    @autoSubscribe
    getSites() {
        return _.clone(this._sites);
    }

    @autoSubscribe
    getCategories() {
        return _.clone(this._categories);
    }
}

export default new SettingsStore();
