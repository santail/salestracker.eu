
import * as React from 'react';
import { Button, InputGroup, Tabs, Tab, FormGroup, FormControl, FormControlProps } from 'react-bootstrap';
import { ComponentBase } from 'resub';
import { Redirect } from 'react-router'

import SettingsStore from '../../stores/SettingsStore';

enum SettingsOption {
    Sites = 'sites',
    Categories = 'categories'
};

interface SettingsPageState {
    sites: string;
    categories: string;
    setting: string;
}

class SettingsPage extends ComponentBase<{}, SettingsPageState> {
    protected _buildState(props: {}, initialBuild: boolean): Partial<SettingsPageState> {
        const sites = SettingsStore.getSites();
        const categories = SettingsStore.getCategories();

        return {
            sites,
            categories
        };
    }

    render() {
        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Настройки <small>Конфигурация</small></h5>
                </div>

                <Tabs
                    id={ 'settingsGrid' }
                    activeKey={ this.state.setting }
                    className={ "nav nav-tabs nav-justified" }
                >
                    <Tab eventKey={ 'sites' } title="Сайты">
                        <textarea rows={20} cols={5} className="form-control" value={ this.state.sites }
                            onChange={ this._onSitesChange }>
                        </textarea>
                    </Tab>
                    <Tab eventKey={ 'categories' } title="Категории">
                        <textarea rows={20} cols={5} className="form-control" value={ this.state.categories }>
                        </textarea>
                    </Tab>
                </Tabs>

                <Button onClick={ this._onSaveSettings }>
                    { 'Сохранить' }
                </Button>
            </div>
        );
    }

    componentDidMount() {
        super.componentDidMount();

        SettingsStore.loadSettings();
    }

    private _onSitesChange = (e: React.FormEvent<HTMLTextAreaElement>) => {
        this.setState({sites: e.currentTarget.value });
    };

    private _onSaveSettings = () => {
        SettingsStore.saveSettings({
            categories: JSON.parse(this.state.categories),
            sites: JSON.parse(this.state.sites)
        });
    }
}


export = SettingsPage;