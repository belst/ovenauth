import "./index.css";
import { render } from "solid-js/web";
import { Router } from 'solid-app-router';

import App from "./App";
import { ServiceRegistry } from "solid-services";

render(
    () => (
        <ServiceRegistry>
            <Router>
                <App />
            </Router>
        </ServiceRegistry>
    ),
    document.getElementById("root")
);
