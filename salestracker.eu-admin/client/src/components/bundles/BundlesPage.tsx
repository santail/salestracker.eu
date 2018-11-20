import _ = require('lodash');
import * as React from 'react';
import { ComponentBase } from 'resub';
import * as ReactPaginate from 'react-paginate';

import BundlesStore, { IBundle } from '../../stores/BundlesStore';
import BundleItem = require('./BundleItem');


interface BundlesPageState {
    bundles: IBundle[];
    total: number;
    activePage: number;
    pageSize: number;
    pagesTotal: number;
}

class BundlesPage extends ComponentBase<{}, BundlesPageState> {
    protected _buildState(props: {}, initialBuild: boolean): Partial<BundlesPageState> {
        const offersWithPaging = BundlesStore.getBundlesWithPaging();
        const paging = offersWithPaging.paging;

        let newState: BundlesPageState = {
            bundles: offersWithPaging.bundles,
            total: offersWithPaging.total,
            activePage: paging.activePage,
            pageSize: paging.pageSize,
            pagesTotal: paging.pagesTotal
        };

        return newState;
    }

    render() {
        let offerWidgets: JSX.Element[] = [];

        this.state.bundles.map((bundle, i) => {
            offerWidgets.push(
                <div className="col-lg-3 col-md-6 col-sm-6" key={'offer-widget_' + i}>
                    <BundleItem key={i} bundle={bundle} />
                </div>
            );
        });

        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Публикации <small>Готовые публикации</small></h5>
                </div>

                <ul className="row stats">
                    <li className="col-xs-3"><a href="#" className="btn btn-default">{this.state.bundles.length}</a> <span>вещей добавлено в публикацию</span></li>
                </ul>

                <div className="row">
                    {offerWidgets}
                </div>
            </div>
        );
    }
}

export = BundlesPage;