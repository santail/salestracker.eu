import * as React from 'react';
import { ControlLabel, FormGroup, FormControl, FormControlProps } from 'react-bootstrap';
import { ComponentBase } from 'resub';

import { IOffer } from '../../stores/OfferStore';
import BasketStore from '../../stores/BasketStore';
import BundlesStore, { IBundleItem } from '../../stores/BundlesStore';

interface OfferItemProps extends React.Props<any> {
    item: IBundleItem;
}

interface OfferItemState {
    caption?: string;
    offerInBasket: boolean;
}

class OfferItem extends ComponentBase<OfferItemProps, OfferItemState> {
    protected _buildState(props: OfferItemProps, initialBuild: boolean): Partial<OfferItemState> {
        let newState: Partial<OfferItemState> = {
            offerInBasket: BasketStore.checkBasketContainsOffer(props.item.offer)
        }

        if (initialBuild) {
            newState.caption = props.item.caption || '';
        }

        return newState;
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
                    <div className="form-group col-sm-10">
                        <FormGroup>
                            <ControlLabel>Описание:</ControlLabel>
                            <FormControl rows={10} cols={50} componentClass="textarea" value={ this.state.caption } onChange={ this._handleCaptionChange } />
                        </FormGroup>
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

    private _handleCaptionChange = (e: React.FormEvent<FormControlProps>): void => {
        this.setState({
            caption: '' + e.currentTarget.value
        });
    }
}

export = OfferItem;


