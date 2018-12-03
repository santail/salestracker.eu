const path = require('path');

import * as React from 'react';
import { ComponentBase } from 'resub';

import { IOffer } from '../../stores/OfferStore';
import BasketStore from '../../stores/BasketStore';

interface OfferItemProps extends React.Props<any> {
    offer: IOffer;
}

interface OfferItemState {
    offerInBasket: boolean;
}

class OfferItem extends ComponentBase<OfferItemProps, OfferItemState> {
    protected _buildState(props: OfferItemProps, initialBuild: boolean): Partial<OfferItemState> {
        return {
            offerInBasket: BasketStore.checkBasketContainsOffer(props.offer)
        };
    }

    render() {
        const offer = this.props.offer;

        const optionalControls = this.state.offerInBasket ? (
            <div className="thumb-options">
                <span>
                    <a href="#" className="btn btn-icon btn-default" onClick={this._onRemoveFromBasket}><i className="fa fa-times"></i></a>
                </span>
            </div>
        ) : undefined;

        const imagePath = '/img/offers/' + offer.downloads.pictures[0];

        return (
            <div className="widget">
                <div className="thumbnail">
                    <div className="thumb">
                        <a href="#" title="" className="caption-title" onClick={this._onAddToBasket}>
                            <img alt="" src={imagePath} />
                        </a>
                        {optionalControls}
                    </div>
                    <div className="caption">
                        <a href="#" title="" className="caption-title" onClick={this._onAddToBasket}>{offer.title}</a>
                        { offer.price.current }&nbsp;{offer.price.original}%)
                    </div>
                </div>
            </div>
        );
    }

    private _onRemoveFromBasket = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        BasketStore.removeOffer(this.props.offer);

        event.preventDefault();
        event.stopPropagation();
    }

    private _onAddToBasket = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        BasketStore.addOffer(this.props.offer);

        window.open(this.props.offer.origin_href, '_blank');

        event.preventDefault();
        event.stopPropagation();
    }
}

export = OfferItem;