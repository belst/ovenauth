import { Link } from "solid-app-router";
import {Component, createResource, For, onMount, Show} from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";
import Title from "./Title";
import ViewCount from "./ViewCount";

const Home: Component = () => {
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL;
    const pxtransparent = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const fallbackimage = (el) => el.target.src = pxtransparent;

    const fallbackImage = <img class="bg-gradient-to-tl from-neutral-content to-neutral" src={pxtransparent} />

    const authService = useService(AuthService);

    const [token, { }] = createResource(() => {
        return authService().getToken().catch(error => {console.log("error", error)});
    });

    onMount(() => {
        authService().loadUsers()
    })

    return <>
        <Title value="Home"/>

        <Layout>
            <div class="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
                <For each={authService().users}>
                    {(user) =>
                        <div class="aspect-video card shadow-xl card-bordered image-full">
                            <figure class="aspect-video">
                                <Show when={(!token.loading || typeof token() === 'string') && token() !== 'error' &&  authService().user !== null} fallback={fallbackImage}>
                                    <img class="bg-gradient-to-tl from-neutral-content to-neutral" src={`${endpoint}/thumbs/${user.username}/thumb.png?username=${authService().user.username}&token=${token()}&streamname=${user.username}`} onError={fallbackimage} />
                                </Show>
                            </figure>
                            <div class="justify-end card-body">
                                <h2 class="card-title">{user.username}</h2>
                                <Show when={(!token.loading || typeof token() === 'string') && token() !== 'error' &&  authService().user !== null} fallback={"?"}>
                                    <ViewCount interval={10000} name={user.username} user={authService().user.username} token={token()}/>
                                </Show>
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
