import _ = require('lodash');
import * as React from 'react';
import { ComponentBase } from 'resub';
import ReactPaginate from 'react-paginate';

import OfferStore, { IOffer } from '../../stores/OfferStore';

import OfferItem = require('./OfferItem');

interface OffersPageProps extends React.Props<any> {
}

interface OffersPageState {
    offers: IOffer[];
    total: number;
    activePage: number;
    pageSize: number;
    site?: string;
    pagesTotal: number;
}

class OffersPage extends ComponentBase<OffersPageProps, OffersPageState> {

    protected _buildState(props: OffersPageProps, initialBuild: boolean): Partial<OffersPageState> {
        const offersWithPaging = OfferStore.getOffersWithPaging();
        const paging = offersWithPaging.paging;

        let newState: OffersPageState = {
            offers: offersWithPaging.offers,
            total: offersWithPaging.total,
            activePage: paging.activePage,
            pageSize: paging.pageSize,
            pagesTotal: paging.pagesTotal,
        };

        if (initialBuild) {
            newState.activePage = 0;
        }

        return newState;
    }

    render() {
        let widgetsRows: JSX.Element[] = [];
        let offerWidgets: JSX.Element[] = [];

        this.state.offers.map((offer, i) => {
            offerWidgets.push(
                <div className="col-lg-3 col-md-6 col-sm-6" key={'offer-widget_' + i}>
                    <OfferItem key={i} offer={offer} />
                </div>
            );

            if (i !== 0 && (i + 1) % 4 === 0) {
                widgetsRows.push(
                    <div className="row" key={'offer-widgets-row_' + i}>
                        {offerWidgets}
                    </div>
                );

                offerWidgets = [];
            }
        });

        widgetsRows.push(
            <div className="row" key={'offer-widgets-row_last'}>
                {offerWidgets}
            </div>
        );

        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Товары <small>Список найденых товаров</small></h5>
                </div>

                <ul className="row stats">
                    <li className="col-xs-3"><a href="#" className="btn btn-default">{this.state.total}</a> <span>товаров найдено</span></li>
                </ul>

<ul className="nav nav-tabs nav-justified" id="myTab" role="tablist">
  <li className="nav-item">
    <a className="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">General</a>
  </li>
  <li className="nav-item">
    <a className="nav-link" id="profile-tab" data-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">Cosmetics</a>
  </li>
  <li className="nav-item">
    <a className="nav-link" id="contact-tab" data-toggle="tab" href="#contact" role="tab" aria-controls="contact" aria-selected="false">Alcohol</a>
  </li>
  <li className="nav-item">
    <a className="nav-link" id="fashion-tab" data-toggle="tab" href="#fashion" role="tab" aria-controls="fashion" aria-selected="false">Fashion</a>
  </li>
  <li className="nav-item">
    <a className="nav-link" id="toys-tab" data-toggle="tab" href="#toys" role="tab" aria-controls="toys" aria-selected="false">Toys</a>
  </li>
  <li className="nav-item">
    <a className="nav-link" id="pets-tab" data-toggle="tab" href="#pets" role="tab" aria-controls="pets" aria-selected="false">Pets</a>
  </li>
</ul>
<div className="tab-content" id="myTabContent">
  <div className="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">...</div>
  <div className="tab-pane fade" id="profile" role="tabpanel" aria-labelledby="profile-tab">...</div>
  <div className="tab-pane fade" id="contact" role="tabpanel" aria-labelledby="contact-tab">...</div>
  <div className="tab-pane fade" id="fashion" role="tabpanel" aria-labelledby="fashion-tab">...</div>
  <div className="tab-pane fade" id="toys" role="tabpanel" aria-labelledby="toys-tab">...</div>
  <div className="tab-pane fade" id="pets" role="tabpanel" aria-labelledby="pets-tab">...</div>
</div>

                <div className="row paging">
                    <div className="col-md-2">
                        <select className="form-control" value={this.state.site} onChange={this._onSiteChange}>
                            <option value="">All</option>
                            <option value="www.barbora.ee">www.barbora.ee</option>
                            <option value="www.ecoop.ee">www.ecoop.ee</option>
                            <option value="www.minuvalik.ee">www.minuvalik.ee</option>
                            <option value="www.selver.ee">www.selver.ee</option>
                            <option value="www.zoomaailm.ee">www.zoomaailm.ee</option>
                        </select>
                    </div>
                    <div className="col-md-1">
                        <select className="form-control" value={this.state.pageSize} onChange={this._onPageSizeChange}>
                            <option value="20">20</option>
                            <option value="72">72</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                    </div>
                    <div className="col-md-9">
                        <ReactPaginate
                            pageCount={this.state.pagesTotal}
                            forcePage={this.state.activePage}
                            pageRangeDisplayed={10}
                            marginPagesDisplayed={2}
                            onPageChange={this._onPageChange}
                            containerClassName={'pagination'}
                        />
                    </div>
                </div>

                {widgetsRows}

                <div className="row paging">
                    <div className="col-md-1">
                        <select className="form-control" value={this.state.pageSize} onChange={this._onPageSizeChange}>
                            <option value="20">20</option>
                            <option value="72">72</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                    </div>

                    <div className="col-md-11">
                        <ReactPaginate
                            pageCount={this.state.pagesTotal}
                            forcePage={this.state.activePage}
                            pageRangeDisplayed={10}
                            marginPagesDisplayed={2}
                            onPageChange={this._onPageChange}
                            containerClassName={'pagination'}
                        />
                    </div>
                </div>
            </div>
        );
    }

    componentDidMount() {
        super.componentDidMount();

        OfferStore.loadOffers({
            activePage:0, 
            pageSize: 72
        });
    }

    private _onPageChange = (selectedItem: { selected: number; }): void => {
        this.setState({ activePage: selectedItem.selected });

        OfferStore.loadOffers({
            activePage: selectedItem.selected, 
            pageSize: this.state.pageSize,
            site: this.state.site
        });
    }

    private _onSiteChange = (e: React.FormEvent<HTMLSelectElement>): void => {
        this.setState({ site: e.currentTarget.value });

        OfferStore.loadOffers({
            activePage: this.state.activePage, 
            pageSize: this.state.pageSize,
            site: e.currentTarget.value
        });
    }

    private _onPageSizeChange = (e: React.FormEvent<HTMLSelectElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        const pageSize = parseInt(e.currentTarget.value, 10);

        this.setState({ pageSize: pageSize });

        OfferStore.loadOffers({
            activePage: this.state.activePage, 
            pageSize: pageSize,
            site: this.state.site
        });
    }
}

export default OffersPage;