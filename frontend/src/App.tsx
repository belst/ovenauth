import { useRoutes } from "solid-app-router";
import { Component } from "solid-js";
// import Login from "./Login";
import Navbar from "./Navbar";
import Footer from "./Footer";

import { routes } from "./routes";

const App: Component = () => {

  const Router = useRoutes(routes);
  return (
    <div class="flex flex-col h min-h-screen">
      <Navbar />
      <Router />
      <div class="flex-grow"></div>
      <Footer />
    </div>
  );
};

export default App;
