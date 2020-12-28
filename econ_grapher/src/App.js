import React from 'react';
import {BrowserRouter, Route} from 'react-router-dom';

import './styles/App.css';

import NavPanel from './components/NavPanel';
import SolowModelScreen from './screens/SolowModelScreen';
import ADASModelScreen from './screens/ADASModelScreen';
import SIModelScreen from './screens/SIModelScreen';
import CumulativeScreen from './screens/CumulativeScreen';

const App = () => {
    return (
        <BrowserRouter>
        <div className="App">
            <NavPanel/>
            <main>
              <Route path="/" exact={true} component={SolowModelScreen}/>
              <Route path="/solow-model" exact={true} component={SolowModelScreen}/>
              <Route path="/ad-as-model" exact={true} component={ADASModelScreen}/>
              <Route path="/saving-investment-model" exact={true} component={SIModelScreen}/>
              <Route path="/cumulative-graphs" exact={true} component={CumulativeScreen}/>
            </main>
        </div>
        </BrowserRouter>
    );
}

export default App;
