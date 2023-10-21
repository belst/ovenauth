import { useRoutes } from "@solidjs/router";
import { Component } from "solid-js";
import Navbar from "./Navbar";

import { routes } from "./routes";

const App: Component = () => {

  const Router = useRoutes(routes);
  return (
    <div class="flex flex-col h min-h-screen">
      <Navbar />
      <Router />
    </div>
  );
};

export default App;
