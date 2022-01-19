import { Link } from "solid-app-router";
import { Component, For } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";

const Home: Component = () => {
    const authService = useService(AuthService);
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL;

    return <>
        <Layout>
            <div class="flex space-x-4">
                <For each={authService().users}>
                    {(user) =>
                        <div class="basis-1/4 aspect-video card shadow-xl card-bordered image-full">
                            <figure class="aspect-video">
                                <img src={`${endpoint}/thumbs/${user.username}/thumb.png`} />
                            </figure>
                            <div class="justify-end card-body">
                                <h2 class="card-title">{user.username}</h2>
                                <div class="card-actions">
                                    <Link href={`/${user.username}`} class="btn btn-primary">Watch</Link>
                                </div>
                            </div>
                        </div>
                    }
                </For>
            </div>
        </Layout>
    </>;
};

export default Home;
