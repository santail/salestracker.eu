const _ = require('lodash');

import * as React from 'react';
import { FormEvent, InputHTMLAttributes } from 'react';
import { ComponentBase } from 'resub';

import JobItem = require('./JobItem');
import JobsStore, { IJob } from '../../stores/JobsStore';

interface HomePageProps extends React.Props<any> {
}

interface HomePageState {
  loading: boolean;
  jobs: IJob[]
}

class HomePage extends ComponentBase<HomePageProps, HomePageState> {

  protected _buildState(props: HomePageProps, initialBuild: boolean): Partial<HomePageState> {
    return {
      jobs: JobsStore.getJobs()
    }
  }

  render() {
    let searchJobs: JSX.Element[] = [];

    this.state.jobs.map((job, index) => {
      searchJobs.push(
        <JobItem key={'job_item_#' + index} job={job} index={ index } />
      );
    });

    return (
      <div className="page-content">

        <div className="page-title">
          <h5><i className="fa fa-picture-o"></i> Настройки поиска <small>Введи имя/категорию товара и нажми 'Начать'</small></h5>
        </div>

        <form className="form-horizontal" action="#" role="form" onSubmit={ this._onFormSubmit }>
          <div className="widget">
            <h4 className="heading-underline">Искать товары</h4>

            {searchJobs}

            <div className="form-actions text-right">
              <input type="submit" value="Начать" className="btn btn-primary" />
            </div>

          </div>
        </form>
      </div>
    );
  }

  componentDidMount() {
    super.componentDidMount();

    JobsStore.initJobs();
  }

  shouldComponentUpdate(nextProps: {}, nextState: HomePageState, nextContext: any): boolean {
    return _.isEqual(this.state.jobs, nextState.jobs) || super.shouldComponentUpdate(nextProps, nextState, nextContext);
  }

  private _onFormSubmit = (e: FormEvent<HTMLFormElement>):void => {
    this.setState({ loading: true });

    JobsStore.executeJobs();
    
    e.preventDefault();
  };
}

export = HomePage;