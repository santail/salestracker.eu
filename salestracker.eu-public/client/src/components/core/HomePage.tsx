const _ = require('lodash');
const axios = require('axios');

import * as React from 'react';
import { FormEvent } from 'react';
import { ComponentBase } from 'resub';


interface HomePageProps extends React.Props<any> {
}

interface HomePageState {
  users: any[],
  loading: boolean;
  res: string;
  errors: any[];
}

class HomePage extends ComponentBase<HomePageProps, HomePageState> {

  protected _buildState(props: HomePageProps, initialBuild: boolean): Partial<HomePageState> {
    return {
        res: '',
        users: []
    }
  }

  render() {
    return (
    	<div>
            <form onSubmit={this._onFormSubmit}>
                <label htmlFor="username">Enter username</label>
                <input id="username" name="username" type="text" />

                <label htmlFor="email">Enter your email</label>
                <input id="email" name="email" type="email" />

                <label htmlFor="birthdGate">Enter your birth date</label>
                <input id="birthdate" name="birthdate" type="text" />

                <button>Send data!</button>
            </form>
            
            {this.state.res && (
                <div className="res-block">
                <h3>Data to be sent:</h3>
                <pre>FormData {this.state.res}</pre>
                </div>
            )}

            <div>
                {!this.state.loading ? (
                    this.state.users.map(user => {
                        const { username, name, email, image } = user;
                        return (
                            <div key={username}>
                                <p>{name}</p>
                                <div>
                                <img src={image} alt={name} />
                                </div>
                                <p>{email}</p>
                                <hr />
                            </div>
                        );
                    })
                ) : (
                    <p>Loading...</p>
                )}
            </div>
    	</div>
    );
  }

  componentDidMount() {
    super.componentDidMount();

    this.setState({users: [], loading: false});
  }

  private _onFormSubmit = (e: FormEvent<HTMLFormElement>):void => {
    e.preventDefault();

    const data = new FormData(e.target);
    
    this.setState({
      res: this._stringifyFormData(data),
    });

    axios
        .get("https://randomuser.me/api/?results=5")
        .then(response =>
            response.data.results.map(user => ({
                name: `${user.name.first} ${user.name.last}`,
                username: `${user.login.username}`,
                email: `${user.email}`,
                image: `${user.picture.thumbnail}`
            }))
        )
        .then(users => {
            this.setState({
                users,
                loading: false
            });
        })
        .catch(errors => this.setState({ errors, loading: false }));
  };

  private _stringifyFormData = (fd: any): string => {
    const data = {};
      for (let key of fd.keys()) {
        data[key] = fd.get(key);
    }
    return JSON.stringify(data, null, 2);
  }
}

export = HomePage;