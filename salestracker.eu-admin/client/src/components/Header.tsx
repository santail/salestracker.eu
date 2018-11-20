import _ = require('lodash');
import * as React from 'react';

import { ComponentBase } from 'resub';
import { Link } from 'react-router-dom';

import { IOffer } from '../stores/OfferStore';
import BasketStore from '../stores/BasketStore';
import { IBundle } from '../stores/BundlesStore';

interface HeaderState {
    bundle: IBundle;
}

class Header extends ComponentBase<{}, HeaderState> {
    protected _buildState(props: {}, initialBuild: boolean): Partial<HeaderState> {
        let newState: HeaderState = {
            bundle: BasketStore.getBundle()
        };

        return newState;
    }

    render() {
        return (
            <div className="container-fluid">
                <div className="page-header">
                    <div className="logo"><a href="index.html" title=""><img src="images/logo.png" alt="" /></a></div>

                    <ul className="middle-nav">
                        <li>
                            <Link to='/basket' className="btn btn-default"><i className="fa fa-shopping-basket"></i> <span>Корзина</span></Link>
                            <div className="label label-info"> {this.state.bundle.items.length} </div>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

    shouldComponentUpdate(nextProps: {}, nextState: HeaderState, nextContext: any): boolean {
        return _.isEqual(this.state.bundle, nextState.bundle) || super.shouldComponentUpdate(nextProps, nextState, nextContext);
    }
}

export = Header;
