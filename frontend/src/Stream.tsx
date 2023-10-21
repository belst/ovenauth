import { useParams } from "@solidjs/router";
import { Component, Show, createSignal } from "solid-js";
import Title from "./Title";
import Player from "./Player";
import Chat from "./chat/Chat";

const Stream: Component = () => {
    const params = useParams();

    const endpoint = import.meta.env.VITE_BASEURL;
    const [sidebaropen, setSidebaropen] = createSignal(true);

    return (
        <>
            <Title value={params.user} />
            <div class="relative min-h-[calc(100vh-theme(spacing.12)]">
                <div class="absolte left-0 top-0 aspect-video w-[calc(100%-theme(spacing.80))] max-h-[calc(100vh-16rem)]">
                    <Player
                        url={`wss://${endpoint}/ws/${params.user}`}
                        instance={params.user} autoplay={true}
                        scroll={true}
                        id="player"></Player>
                </div>
                <Show when={sidebaropen}>
                    <div class="w-80 fixed right-0 bottom-0 top-12">
                        <Chat />
                    </div>
                </Show>
            </div>
        </>
    );
};

export default Stream;
