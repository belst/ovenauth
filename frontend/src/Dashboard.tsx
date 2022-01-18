import { Navigate } from "solid-app-router";
import { Component, createResource, Show } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";

const Dashboard: Component = () => {

  const authService = useService(AuthService);
  const [options, { refetch }] = createResource(() => {
    return authService().client.common.options();
  });

  const reset = () =>
    authService().client.common.reset()
      .then(refetch);

  return (
    <>
      <Show when={authService().user === null}>
        <Navigate href="/login" state={{ redirectTo: '/dashboard' }} />
      </Show>
      <Layout>
        <div class="rounded-lg shadow bg-base-200 drawer drawer-mobile h-52">
          <input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
          <div class="flex flex-col items-center justify-center drawer-content">
            <label for="my-drawer-2" class="mb-4 btn btn-primary drawer-button lg:hidden">open menu</label>
            <div class="text-xs text-center">
              <div class="form-control">
                <div class="relative">
                  <input class="input input-bordered w-[50ex]" type="text" readonly value={options()?.token || 'Create Token'} />
                  <button onclick={reset} class="absolute top-0 right-0 rounded-l-none btn btn-primary">{options() ? 'reset' : 'create'}</button>
                </div>
              </div>
            </div>
          </div>
          <div class="drawer-side">
            <label for="my-drawer-2" class="drawer-overlay"></label>
            <ul class="menu p-4 overflow-y-auto w-80 bg-base-100 text-base-content">
              <li>
                <a classList={{ active: true }}>
                  Stream Token
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Layout>
    </>
  );
}

export default Dashboard;
