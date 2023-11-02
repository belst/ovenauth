import { Link } from "@solidjs/router";
import { Component, For } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";
import Thumbnail from "./Thumbnail";
import Title from "./Title";
import ViewCount from "./ViewCount";

const Home: Component = () => {
    const authService = useService(AuthService);
    let t: HTMLElement;

    return <>
        <Title value="Home" />
        <Layout>
            <div class="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
                <For each={authService().users}>
                    {(user) =>
                        <div ref={(e) => t = e} class="aspect-video card shadow-xl card-bordered image-full">
                            <Thumbnail hover={t} interval={10000} name={user.username}></Thumbnail>
                            <div class="justify-end card-body">
                                <h2 class="card-title">{user.username}</h2>
                                <ViewCount interval={10000} name={user.username}></ViewCount>
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
