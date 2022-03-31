import { Link } from "solid-app-router";
import { Component, For, Match } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";
import { StatService } from "./store/StatService";
import Title from "./Title";
import { lazy, Suspense } from "solid-js";
import ViewCount from "./ViewCount";

const Home: Component = () => {
    const authService = useService(AuthService);
    const statService = useService(StatService);
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL;


    return <>
        <Title value="Home" />
        <Layout>
            <div class="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
                <For each={authService().users}>
                    {(user) =>
                        <div class="aspect-video card shadow-xl card-bordered image-full">
                            <figure class="aspect-video">
                                <img src={`${endpoint}/thumbs/${user.username}/thumb.png`} />
                            </figure>
                            <div class="justify-end card-body">
                                <h2 class="card-title">{user.username}</h2>
                                <ViewCount name={user.username}></ViewCount>
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
