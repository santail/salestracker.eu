const path = require('path');

import _ = require('lodash');

import * as React from 'react';
import { ComponentBase } from 'resub';
import * as ReactPaginate from 'react-paginate';
import { Redirect } from 'react-router'

import BasketStore from '../../stores/BasketStore';
import { IOffer } from '../../stores/OfferStore';
import { IBundle, IBundleItem } from '../../stores/BundlesStore';

import BasketItem = require('./BasketItem');

interface BasketPageState {
    bundle: IBundle;
    navigateCheckout?: boolean;
}

class BasketPage extends ComponentBase<{}, BasketPageState> {
    protected _buildState(props: {}, initialBuild: boolean): Partial<BasketPageState> {
        let newState: BasketPageState = {
            bundle: BasketStore.getBundle()
        };

        return newState;
    }

    render() {
        let offerWidgets: JSX.Element[] = [];

        if (this.state.navigateCheckout) {
            return <Redirect to="/checkout" push={true} />
        }

        this.state.bundle.items.map((item, i) => {
            offerWidgets.push(
                <div className="row" key={'offer-row_' + i}>
                    <div className="col-lg-3 col-md-6 col-sm-6" key={'offer-widget_' + i}>
                        <BasketItem item={ item } />
                    </div>
                </div>
            );
        });

        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Корзина <small>Вещи готовые к публикации</small></h5>
                </div>

                <ul className="row stats">
                    <li className="col-xs-3"><a href="#" className="btn btn-default">{this.state.bundle.items.length}</a> <span>вещей добавлено в публикацию</span></li>
                </ul>

                <form className="form-horizontal" action="#" role="form">
                    <div className="panel panel-default">
                        <div className="panel-heading"><h6 className="panel-title">Редактировать публикацию</h6></div>
                        <div className="panel-body">
                            {offerWidgets}
                        </div>
                    </div>
                </form>

                <div className="row">
                    <div className="col-md-12">
                        <div className="panel panel-default">
                            <div className="panel-heading"><h6 className="panel-title"><i className="fa fa-pencil"></i> Статья</h6></div>
                            <div className="panel-body">
                                <form action="#" role="form">
                                    <div className="form-actions text-right">
                                        <button type="submit" className="btn btn-primary" onClick={this._onCheckoutProceed}>Checkout</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    shouldComponentUpdate(nextProps: {}, nextState: BasketPageState, nextContext: any): boolean {
        return _.isEqual(this.state.bundle, nextState.bundle) || super.shouldComponentUpdate(nextProps, nextState, nextContext);
    }

    private _onCheckoutProceed = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this.setState({ navigateCheckout: true });

        event.preventDefault();
        event.stopPropagation();
    }

}

export = BasketPage;