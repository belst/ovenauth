import { Navigate, useNavigate } from "solid-app-router";
import { Component, createMemo, createResource, createSignal, For, Show } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";
import { IToken } from "./types/user.interface";

const Dashboard: Component = () => {

    const authService = useService(AuthService);
    const [tokens] = createResource(() => {
        return authService().client.common.tokens();
    });

    const [selectedToken, setSelectedToken] = createSignal<IToken>();
    const navigate = useNavigate();


    // createMemo(() => {
    //     if (!authService().isLoggedIn) {
    //         navigate('/login', { replace: true, state: { redirectTo: '/dashboard' } });
    //     }
    // });

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
                            <Show when={selectedToken()} fallback="Please select a token">
                                {selectedToken().token}
                            </Show>
                        </div>
                    </div>
                    <div class="drawer-side">
                        <label for="my-drawer-2" class="drawer-overlay"></label>
                        <ul class="menu p-4 overflow-y-auto w-80 bg-base-100 text-base-content">
                            <For each={tokens()}>
                                {(token) => (
                                    <li classList={{ bordered: token.token === selectedToken()?.token }}>
                                        <a onclick={(_e) => setSelectedToken(token)}>{token.name}</a>
                                    </li>
                                )}
                            </For>

                        </ul>
                    </div>
                </div>
            </Layout>
        </>
    );
}

export default Dashboard;
