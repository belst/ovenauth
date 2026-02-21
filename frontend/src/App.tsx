import { Component } from "solid-js";
import { Router } from "@solidjs/router";
import Navbar from "./Navbar";
import { TheaterProvider } from "./store/shownav";

import { routes } from "./routes";

const App: Component = (props) => {

  return (
    <TheaterProvider>
      <div class="flex flex-col h min-h-screen">
        <Navbar />
        {props.children}
      </div>
    </TheaterProvider>
  );
};

export default App;
