import "./index.css";
import { render } from "solid-js/web";
import { Router } from '@solidjs/router';

import App from "./App";
import { ServiceRegistry } from "solid-services";
import { TheaterProvider } from "./store/shownav";

render(
    () => (
        <ServiceRegistry>
            <Router>
                <TheaterProvider>
                    <App />
                </TheaterProvider>
            </Router>
        </ServiceRegistry>
    ),
    document.getElementById("root")
);
