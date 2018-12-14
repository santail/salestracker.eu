const _ = require('lodash');

import SyncTasks = require('synctasks');

import { StoreBase, AutoSubscribeStore, autoSubscribe, autoSubscribeWithKey } from 'resub';
import { IOffer } from './OfferStore';

export interface ISite {
    site?: string;
};

export interface IJob {
    searchCriterion?: string;
    site?: string;
    limit?: number | null;
};

export interface IJobResponse {
    success?: string;
    message?: string;
};

@AutoSubscribeStore
export class JobsStore extends StoreBase {

    private _jobs: IJob[] = [];


    @autoSubscribe
    getJobs() {
        return this._jobs;
    }

    addJob = (job: IJob): void => {
        this._jobs.push(job);
        this.trigger();
    }

    updateJob = (index: number, job: IJob): void => {
        this._jobs[index] = job;
        this.trigger();
    }

    executeJobs = (): void => {
        _.each(this._jobs, function (job: IJob) {
            fetch('/api/jobs/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(job)
            })
                .then((response) => response.json())
                .then((responseJson) => {

                })
                .catch((error) => {
                    console.error(error);
                });
        });

        this._jobs = [{}];
        this.trigger();
    }

    processSite = (site: ISite): void => {
        const job = {
            'site': site.site,
            'should_cleanup': true,
            'cleanup_uploads': true
        };

        fetch('/api/jobs/process/site', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(job)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    processOfferContent = (offer: IOffer): void => {
        const job = {
            'site': offer.site,
            'language': offer.language,
            'href': offer.href,
            'origin_href': offer.origin_href
        };

        fetch('/api/jobs/process/offer/content', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(job)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    processOfferData = (offer: IOffer): void => {
        const job = {
            'site': offer.site,
            'language': offer.language,
            'href': offer.href,
            'origin_href': offer.origin_href
        };

        fetch('/api/jobs/process/offer/data', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(job)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    processOfferPictures = (options: any): void => {
        fetch('/api/jobs/process/offer/pictures', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    stopProcessOfferPictures = (options: any): void => {
        fetch('/api/jobs/process/offer/pictures', {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    processOfferCategories = (offer: IOffer): void => {
        const job = {
            'site': offer.site,
            'language': offer.language,
            'href': offer.href,
            'origin_href': offer.origin_href
        };

        fetch('/api/jobs/process/offer/categories', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(job)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    processOfferIndex = (offer: IOffer): void => {
        const job = {
            'site': offer.site,
            'language': offer.language,
            'href': offer.href,
            'origin_href': offer.origin_href
        };

        fetch('/api/jobs/index/offer', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(job)
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    initJobs = (): void => {
        this._jobs = [{}];
        this.trigger();
    }
}

export default new JobsStore();
