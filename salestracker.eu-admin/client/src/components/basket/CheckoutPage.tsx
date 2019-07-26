import _ = require('lodash');

import * as React from 'react';
import { Checkbox } from 'react-bootstrap';
import { ComponentBase } from 'resub';

import BasketStore from '../../stores/BasketStore';
import BundlesStore, { IBundle } from '../../stores/BundlesStore';
import PublicationService from '../../services/PublicationService';

interface CheckoutPageState {
    bundle: IBundle;
    withImages?: boolean;
    messageContent: { [type: string]: string };
}

class CheckoutPage extends ComponentBase<{}, CheckoutPageState> {

    protected _buildState(props: {}, initialBuild: boolean): Partial<CheckoutPageState> {
        let newState: Partial<CheckoutPageState> = {
            bundle: BasketStore.getBundle(),
            messageContent: BasketStore.getCompiledMessages()
        }

        if (initialBuild) {
            newState.withImages = BasketStore.showWithImages()
        }

        return newState;
    }

    render() {
        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Готовая публикация</h5>
                </div>

                <ul className="row stats">
                    <li className="col-xs-3"><a href="#" className="btn btn-default">{this.state.bundle.items.length}</a> <span>вещей добавлено в публикацию</span></li>
                </ul>

                <div className="row">
                    <div className="col-md-12">
                        <div className="widget">
                            <h5 className="heading-underline"><i className="fa fa-columns"></i> Подготовленная публикация</h5>
                            <div className="tabbable">
                                <ul className="nav nav-tabs nav-justified">
                                    <li className="active">
                                        <a href="#tab-telegram" data-toggle="tab">
                                            <i className="fa fa-user"></i>
                                            Telegram
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#tab-email" data-toggle="tab">e-mail</a>
                                    </li>
                                    <li><a href="#tab-instagram" data-toggle="tab">Instagram</a></li>
                                    <li>
                                        <a href="#tab-youtube" data-toggle="tab">
                                            <i className="fa fa-youtube"></i>
                                            Youtube
                                        </a>
                                    </li>
                                    <li><a href="#tab-blog" data-toggle="tab">Blog</a></li>
                                </ul>

                                <div className="tab-content has-padding">
                                    <div className="tab-pane fade in active" id="tab-telegram">
                                        <div className="alert alert-info fade in widget-inner">
                                            <div className="checkbox">
                                                <label>
                                                    <Checkbox inline checked={ this.state.withImages } onChange={this._handleShowPicturesChange}>Публиковать с картинками</Checkbox>
                                                </label>
                                            </div>
                                        </div>

                                        {this.state.messageContent['telegram']}
                                    </div>

                                    <div className="tab-pane fade" id="tab-email">
                                        <textarea rows={20} cols={5} className="form-control">
                                            {this.state.messageContent['email']}
                                        </textarea>
                                    </div>

                                    <div className="tab-pane fade" id="tab-instagram">
                                        <textarea rows={20} cols={5} className="form-control">
                                            {this.state.messageContent['instagram']}
                                        </textarea>
                                    </div>

                                    <div className="tab-pane fade" id="tab-youtube">
                                        <textarea rows={20} cols={5} className="form-control">
                                            {this.state.messageContent['youtube']}
                                        </textarea>
                                    </div>

                                    <div className="tab-pane fade" id="tab-blog">
                                        <textarea rows={20} cols={5} className="form-control">
                                            {this.state.messageContent['blog']}
                                        </textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <form action="#" role="form">
                    <div className="form-actions text-right">
                        <button type="submit" className="btn btn-primary" onClick={this._onPublicate}>Опубликовать</button>
                    </div>
                </form>
            </div>
        );
    }

    private _handleShowPicturesChange = (e: React.FormEvent<Checkbox>): void => {
        this.setState({
            withImages: e.target.checked
        });
    }

    private _onPublicate = (event: React.MouseEvent<HTMLButtonElement>): void => {
        PublicationService.publicateBundle(this.state.bundle);

        event.preventDefault();
        event.stopPropagation();
    }

}

export = CheckoutPage;
