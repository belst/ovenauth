import { NavLink } from "solid-app-router";
import { Component, Match, Switch } from "solid-js";
import { useService } from "solid-services";
import { AuthService } from "./store/AuthService";


const Navbar: Component = () => {

    const authService = useService(AuthService);

    const logout = async () => {
        await authService().logout();
    };

    return (
        <div class="navbar mb-2 shadow-lg bg-neutral text-neutral-content">
            <div class="flex-none px-2 mx-2">
                <span class="text-lg font-bold">
                    Flussen statt Zucken
                </span>
            </div>
            <div class="flex-1 px-2 mx-2">
                <div class="items-stretch hidden lg:flex">
                    <NavLink href="/" class="btn btn-ghost btn-sm rounded-btn">
                        Home
                    </NavLink>
                </div>
            </div>
            <Switch>
                <Match when={authService().user}>
                    <div class="flex-none">
                        <div class="items-strech hidden lg:flex">
                            <NavLink href="/dashboard" class="btn btn-ghost btn-sm rounded-btn">
                                {authService().user.username}
                            </NavLink>
                        </div>
                    </div>
                    <div class="flex-none">
                        <div class="items-strech hidden lg:flex">
                            <button onClick={logout} class="btn btn-ghost btn-sm rounded-btn">
                                Logout
                            </button>
                        </div>
                    </div>
                </Match>
                <Match when={!authService().user}>
                    <div class="flex-none">
                        <div class="items-strech hidden lg:flex">
                            <NavLink href="/login" class="btn btn-ghost btn-sm rounded-btn">
                                Login
                            </NavLink>
                        </div>
                    </div>
                    <div class="flex-none">
                        <div class="items-strech hidden lg:flex">
                            <NavLink href="/register" class="btn btn-ghost btn-sm rounded-btn">
                                Register
                            </NavLink>
                        </div>
                    </div>
                </Match>
            </Switch>

        </div>
    )
}

export default Navbar;
