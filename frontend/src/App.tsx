import { useRoutes } from "solid-app-router";
import { Component } from "solid-js";
// import Login from "./Login";
import Navbar from "./Navbar";

import { routes } from "./routes";

const App: Component = () => {
  const Router = useRoutes(routes)
  return (
    <div class="flex flex-col h">
      <Navbar />
      <Router />
    </div>
  );
};

export default App;
