// Libraries
import React from "react";
import {observer} from "mobx-react";
import {Route, Switch, withRouter, Redirect} from "react-router-dom";
import ReactGA from 'react-ga';

// Components
import Help from "./Help";
import HelpItem from "./HelpItem";
import Home from "./Home";
import NotFound from "./NotFound";
import Terms from "./Terms";

@withRouter
@observer
class App extends React.Component {
  componentDidUpdate = prevProps => {
    if (this.props.location.pathname !== prevProps.location.pathname) {
      window.scrollTo(0, 0);
    }
    ReactGA.pageview(this.props.location.pathname);
  }

  render() {
    return (
      <Switch>
        <Route exact path="/help" title="CDP Portal: Help" component={ Help } />
        <Route path="/help/:helpId" title="CDP Portal: Help" component={ HelpItem } />
        <Route exact path="/terms" title="CDP Portal: Terms of Service" render={() => <Terms />} />
        <Route exact path="/" title="CDP Portal" component={ Home } />
        <Route component={() => <Redirect to="/" />} />
      </Switch>
    )
  }
}

export default App;
