import "./index.css";
import { render } from "solid-js/web";
import { Router } from '@solidjs/router';

import App from "./App";
import { ServiceRegistry } from "solid-services";
import { routes } from "./routes";

render(
  () => (
    <ServiceRegistry>
      <Router root={App}>
        {routes}
      </Router>
    </ServiceRegistry>
  ),
  document.getElementById("root")
);
