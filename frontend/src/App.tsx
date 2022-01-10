import { useRoutes } from "solid-app-router";
import { Component, lazy } from "solid-js";
// import Login from "./Login";
import Navbar from "./Navbar";

const routes = [
  {
    path: "/:user",
    component: lazy(() => import("./Stream")),
  },
  {
    path: '**',
    component: lazy(() => import("./Home")),
  }
]

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
