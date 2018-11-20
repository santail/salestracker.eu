import _ = require('lodash');

import * as React from 'react';
import { ComponentBase } from 'resub';

const Telegram = require('telegraf/telegram')

import BasketStore from '../../stores/BasketStore';
import BundlesStore, { IBundle } from '../../stores/BundlesStore';

interface CheckoutPageState {
    bundle: IBundle;
    withImages?: boolean;
    messageContent: { [type: string]: string };
}

class CheckoutPage extends ComponentBase<{}, CheckoutPageState> {

    private _TelegramBot: any;

    protected _buildState(props: {}, initialBuild: boolean): Partial<CheckoutPageState> {
        let newState: CheckoutPageState = {
            bundle: BasketStore.getBundle(),
            withImages: BasketStore.showWithImages(),
            messageContent: BasketStore.getCompiledMessages()
        };

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
                                                    <input type="checkbox" checked={this.state.withImages} onChange={this._toggleWithImages} />
                                                    Публиковать с картинками
                                            </label>
                                            </div>
                                        </div>

                                        <textarea rows={20} cols={5} className="form-control">
                                            {this.state.messageContent['telegram']}
                                        </textarea>
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

    componentDidMount() {
        super.componentDidMount();

        this._TelegramBot = new Telegram('527574719:AAE8yYNFlGnDhFfuh0Wx912UPUDfZ9i5ArY');
    }

    shouldComponentUpdate(nextProps: {}, nextState: CheckoutPageState, nextContext: any): boolean {
        return !_.isEqual(this.state.bundle, nextState.bundle)
            || this.state.withImages !== nextState.withImages
            || super.shouldComponentUpdate(nextProps, nextState, nextContext);
    }

    private _toggleWithImages = (event: React.ChangeEvent<HTMLInputElement>): void => {
        BasketStore.toggleWithImages();

        event.preventDefault();
        event.stopPropagation();
    }

    private _onPublicate = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._TelegramBot.sendMessage('@goodlooking_test', this.state.messageContent['telegram']);
        this._TelegramBot.sendMessage('@goodlooking_test', this.state.messageContent['blog']);

        event.preventDefault();
        event.stopPropagation();
    }

}

export = CheckoutPage;