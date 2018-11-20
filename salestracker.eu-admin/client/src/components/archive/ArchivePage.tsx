import _ = require('lodash');
import * as React from 'react';
import { ComponentBase } from 'resub';
import * as ReactPaginate from 'react-paginate';

import BasketStore from '../../stores/BasketStore';
import BundlesStore, { IBundle } from '../../stores/BundlesStore';

interface ArchivePageState {
    bundles?: IBundle[];
}

class BundlesPage extends ComponentBase<{}, ArchivePageState> {
    protected _buildState(props: {}, initialBuild: boolean): Partial<ArchivePageState> {
        let newState: ArchivePageState = {};

        if (initialBuild) {
        }

        newState.bundles = BundlesStore.getArchiveBundles();

        return newState;
    }

    render() {
        let offerWidgets: JSX.Element[] = [];

        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Архив публикаций <small>Опубликованное</small></h5>
                </div>

                <div className="row">
                    {offerWidgets}
                </div>
            </div>
        );
    }
}

export = BundlesPage;