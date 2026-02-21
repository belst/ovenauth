import { Component, JSX } from "solid-js";
import Navbar from "./Navbar";
import { TheaterProvider } from "./store/shownav";
import { RouteSectionProps } from "@solidjs/router";


const App: Component<RouteSectionProps<unknown>> = (props) => {
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
