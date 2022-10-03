import { NavLink, useNavigate } from "solid-app-router";
import { Component, Switch, Match, createSignal } from "solid-js";
import { useService } from "solid-services";
import { AuthService } from "./store/AuthService";


const Navbar: Component = () => {

    const navigate = useNavigate();

    const authService = useService(AuthService);

    const logout = async () => {
        await authService().logout();
    };

    const [navbarOpen, setNavbarOpen] = createSignal(false);

    return (
        <nav class="flex items-center justify-between flex-wrap  bg-neutral text-neutral-content p-6">
            <div class="flex-none px-2 mx-2" onclick={ () => navigate("/", { replace: true })}
                 onTouchEnd={ () => navigate("/", { replace: true }) } >
                <span class="text-lg font-bold">
                {import.meta.env.VITE_PAGE_TITLE}
                </span>
            </div>
            <div class="flex-1 px-2 mx-2">
                <div class="items-stretch hidden lg:flex">
                    <NavLink activeClass="btn-active" end href="/" class="btn btn-ghost btn-sm rounded-btn">
                        Home
                    </NavLink>
                </div>
            </div>
            <div class="block lg:hidden">
                <button data-collapse-toggle="mobile-menu-4" class="flex items-center px-3 py-2 border rounded text-default-200 border-white-400 hover:text-white hover:border-white"  onclick={ () => { setNavbarOpen(!navbarOpen());}}>
                    <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><title>Menu</title><path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"/></svg>
                </button>
            </div>

            <div class="w-full block lg:flex lg:items-end lg:w-auto" className={(navbarOpen() ? " flex" : " hidden")}>
                <div class="text-sm lg:flex-grow">
                    <Switch>
                        <Match when={authService().user != undefined && authService().user.id > 0}>
                            <div class="block mt-4 lg:inline-block lg:mt-0 text-default-200 hover:text-white mr-4">
                                <NavLink activeClass="btn-active" href="/dashboard" class="btn btn-ghost btn-sm rounded-btn">
                                    {authService().user.username}
                                </NavLink>
                            </div>
                            <div class="block mt-4 lg:inline-block lg:mt-0 text-default-200 hover:text-white mr-4">
                                <button onClick={logout} class="btn btn-ghost btn-sm rounded-btn">
                                    Logout
                                </button>
                            </div>
                        </Match>
                        <Match when={authService().user != undefined && authService().user.id == 0}>
                            <div class="block mt-4 lg:inline-block lg:mt-0 text-default-200 hover:text-white mr-4">
                                <NavLink activeClass="btn-active" href="/login" class="btn btn-ghost btn-sm rounded-btn">
                                    Login
                                </NavLink>
                            </div>
                            <div class="block mt-4 lg:inline-block lg:mt-0 text-default-200 hover:text-white mr-4">
                                    <NavLink activeClass="btn-active" href="/register" class="btn btn-ghost btn-sm rounded-btn">
                                        Register
                                    </NavLink>
                            </div>
                        </Match>
                    </Switch>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;
