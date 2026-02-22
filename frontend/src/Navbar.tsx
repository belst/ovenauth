import { useNavigate, A } from "@solidjs/router";
import { Component, Switch, Match, createSignal, Show, useContext } from "solid-js";
import { useService } from "solid-services";
import { AuthService } from "./store/AuthService";
import { TheaterContext } from "./store/shownav";

const Navbar: Component = () => {
    const authService = useService(AuthService);
    const [theater] = useContext(TheaterContext);

    const logout = async () => {
        await authService().logout();
    };

    const [navbarOpen, setNavbarOpen] = createSignal(false);

    const navigate = useNavigate();

    return (
        <Show when={!theater()}>
            <div class="navbar bg-base-100 shadow-sm">
                <div class="flex-1">
                    <a class="btn btn-ghost text-xl" href="/">{import.meta.env.VITE_PAGE_TITLE}</a>
                </div>
                <div class="flex-none">
                    <ul class="menu menu-horizontal px-1">
                        <Switch>
                            <Match when={authService().user}>
                                <li>
                                    <A activeClass="menu-active" href="/dashboard">
                                        {authService().user.username}
                                    </A>
                                </li>
                                <li>
                                    <button onClick={logout} class="btn btn-ghost btn-sm rounded-btn">
                                        Logout
                                    </button>
                                </li>
                            </Match>
                            <Match when={!authService().user}>
                                <li>
                                    <A activeClass="menu-active" href="/login">
                                        Login
                                    </A>
                                </li>
                                <li>
                                    <A activeClass="menu-active" href="/register">
                                        Register
                                    </A>
                                </li>
                            </Match>
                        </Switch>

                    </ul>
                </div>
            </div>
        </Show>
    )
}

export default Navbar;
