import * as React from 'react';
import { StatelessComponent } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { Routes } from './components/Routes';
import Header = require('./components/Header');

export const App: StatelessComponent = () => {
  return (
    <Router>
      <div>
        <Header />

        <div className="page-container container-fluid">

          <div className="sidebar collapse">
            <ul className="navigation">
              <li><Link to='/'><i className="fa fa-search"></i> Поиск</Link></li>
              <li><Link to='/offers'><i className="fa fa-tshirt"></i> Товары</Link></li>
              <li><Link to='/bundles'><i className="fa fa-newspaper"></i> Публикации</Link></li>
              <li><Link to='/archive'><i className="fa fa-archive"></i> Архив</Link></li>
              <li><Link to='/users'><i className="fa fa-config"></i> Пользователи</Link></li>
              <li><Link to='/settings'><i className="fa fa-config"></i> Настройки</Link></li>
            </ul>
          </div>

          <Routes />

        </div>
      </div>
    </Router>
  );
}