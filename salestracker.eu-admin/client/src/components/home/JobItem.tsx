const path = require('path');

import * as React from 'react';
import { ComponentBase } from 'resub';

import JobsStore, { IJob } from '../../stores/JobsStore';

interface JobItemProps extends React.Props<any> {
    job: IJob;
    index: number;
}

interface JobItemState {
    searchCriterion: string;
    limit?: number | null;
    site?: string;
}

class JobItem extends ComponentBase<JobItemProps, JobItemState> {
    protected _buildState(props: JobItemProps, initialBuild: boolean): Partial<JobItemState> {
        const job = props.job;

        if (initialBuild) {
            return {
                searchCriterion: '',
                limit: 72,
                site: ''
            }
        }
        
        return {
            searchCriterion: job.searchCriterion,
            limit: job.limit,
            site: job.site
        }
    }

    render() {
        return (
            <div className="form-group">
                <label className="col-sm-2 control-label">Искать:</label>
                <div className="col-sm-10">
                    <div className="row">
                        <div className="col-sm-2">
                            <select className="form-control" value={this.state.site} onChange={this._onSiteChange}>
                                <option value=""></option>
                                <option value="www.asos.com">www.asos.com</option>
                                <option value="www.nordstrom.com">www.nordstrom.com</option>
                                <option value="www.houseoffraser.co.uk">www.houseoffraser.co.uk</option>
                                <option value="www.yoox.com">www.yoox.com</option>
                            </select>
                            <span className="help-block">Сайт</span>
                        </div>
                        <div className="col-sm-4">
                            <input type="text" className="form-control" value={this.state.searchCriterion} onChange={this._onSearchCriterionChange} />
                            <span className="help-block">Название продукта</span>
                        </div>
                        <div className="col-sm-1">
                            <input type="text" className="form-control" value={this.state.limit ? this.state.limit : ''} onChange={this._onLimitChange} />
                            <span className="help-block">Лимит</span>
                        </div>
                        <div className="col-sm-1">
                            <button type="button" className="btn btn-icon btn-info" onClick={this._onAddNewJob}><i className="fa fa-plus"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _onSiteChange = (event: React.FormEvent<HTMLSelectElement>): void => {
        const value = event.currentTarget.value;
        const job = this.props.job;

        this.setState({ site: value })

        job.site = value;

        JobsStore.updateJob(this.props.index, job);
    }

    private _onSearchCriterionChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const value = e.target.value;
        const job = this.props.job;

        this.setState({ searchCriterion: value })

        job.searchCriterion = value;

        JobsStore.updateJob(this.props.index, job);
    }

    private _onLimitChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const value = parseInt(e.target.value, 10);
        const limit = isNaN(value) ? null : value;

        const job = this.props.job;

        this.setState({ limit: value });

        job.limit = limit;

        JobsStore.updateJob(this.props.index, job);
    }

    private _onAddNewJob = (e: React.MouseEvent<HTMLButtonElement>): void => {
        JobsStore.addJob({});

        e.preventDefault();
    }

}

export = JobItem;

