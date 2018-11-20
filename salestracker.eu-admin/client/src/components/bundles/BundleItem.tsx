const path = require('path');

import * as React from 'react';
import { ComponentBase } from 'resub';

import { IOffer } from '../../stores/OfferStore';
import BundlesStore, { IBundle } from '../../stores/BundlesStore';


interface BundleItemProps extends React.Props<any> {
    bundle: IBundle;
}

interface BundleItemState {
}

class BundleItem extends ComponentBase<BundleItemProps, BundleItemState> {
    protected _buildState(props: BundleItemProps, initialBuild: boolean): Partial<BundleItemState> {
        return {
        };
    }

    render() {
        const bundle = this.props.bundle;

        return (
            <div className="widget">
                <div className="thumbnail">
                    <div className="thumb">

                    </div>
                    <div className="caption">
                        <a href="#" title="" className="caption-title" onClick={this._onItemClick}>{bundle.title}</a>
                    </div>
                </div>
            </div>
        );
    }

    private _onRemoveFromBundle = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        BundlesStore.removeBundle(this.props.bundle);

        e.preventDefault();
    }

    private _onItemClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {

        e.preventDefault();
    }
}

export = BundleItem;