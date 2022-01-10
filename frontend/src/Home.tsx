import { Link } from "solid-app-router";
import { Component, For } from "solid-js";
import { useService } from "solid-services";
import { AuthService } from "./store/AuthService";

const Home: Component = () => {
    const authService = useService(AuthService);

    return <>
        <div class="container mx-auto">
            <For each={authService().users}>
                {(user) =>
                    <div class="card lg:card-side card-bordered">
                        <div class="card-body">
                            <h2 class="card-title">{user.username}</h2>
                            <p>A very cool Fluss</p>
                            <div class="card-actions">
                                <Link href={`/${user.username}`} class="btn btn-primary">Watch</Link>
                            </div>
                        </div>
                    </div>
                }
            </For>
        </div>
    </>;
};

export default Home;
