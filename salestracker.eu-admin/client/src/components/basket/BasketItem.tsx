const path = require('path');

import * as React from 'react';
import { ComponentBase } from 'resub';

import { IOffer } from '../../stores/OfferStore';
import BasketStore from '../../stores/BasketStore';
import BundlesStore, { IBundleItem } from '../../stores/BundlesStore';

interface OfferItemProps extends React.Props<any> {
    item: IBundleItem;
}

interface OfferItemState {
    offerInBasket: boolean;
}

class OfferItem extends ComponentBase<OfferItemProps, OfferItemState> {
    protected _buildState(props: OfferItemProps, initialBuild: boolean): Partial<OfferItemState> {
        return {
            offerInBasket: BasketStore.checkBasketContainsOffer(props.item.offer)
        };
    }

    render() {
        const offer = this.props.item.offer;

        let optionalImage = offer.downloads && offer.downloads.pictures ? (
            <img alt="" src={ '/img/offers/' + offer.downloads.pictures[0] } />
        ) : undefined;

        return (
            <div className="widget">
                <div className="thumbnail">
                    <div className="thumb">
                        { optionalImage }
                        <div className="thumb-options">
                            <span>
                                <a href="#" className="btn btn-icon btn-default" onClick={this._onRemoveFromBundle(offer)}><i className="fa fa-times"></i></a>
                            </span>
                        </div>
                    </div>
                    <div className="caption">
                        <a href="#" title="" className="caption-title" onClick={this._onOfferClick(offer)}>{offer.title}</a>
                    </div>
                    <div className="form-group">
                        <label className="col-sm-2 control-label text-right">Описание: </label>
                        <div className="col-sm-10">
                            <textarea rows={2} cols={5} className="form-control"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _onRemoveFromBundle = (offer: IOffer) => {
        return (event: React.MouseEvent<HTMLAnchorElement>): void => {
            BasketStore.removeOffer(offer);

            event.preventDefault();
            event.stopPropagation();
        };
    }

    private _onOfferClick = (offer: IOffer) => {
        return (event: React.MouseEvent<HTMLAnchorElement>): void => {
            window.open(offer.origin_href, '_blank');

            event.preventDefault();
            event.stopPropagation();
        }
    }
}

export = OfferItem;


