const _ = require('lodash');

import SyncTasks = require('synctasks');

import { StoreBase, AutoSubscribeStore, autoSubscribe, autoSubscribeWithKey } from 'resub';

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

    initJobs = (): void => {
        this._jobs = [{}];
        this.trigger();
    }
}

export default new JobsStore();
