import { useParams, useRouteData } from "@solidjs/router";
import { Component, Show, createSignal, useContext } from "solid-js";
import Title from "./Title";
import Player from "./Player";
import Chat from "./chat/Chat";
import StreamData from "./Stream.data";
import { TheaterContext } from "./store/shownav";

const Stream: Component = () => {
    const params = useParams();
    const data = useRouteData<typeof StreamData>();

    const [theater] = useContext(TheaterContext);
    const [sidebaropen, setSidebaropen] = createSignal(true);

    return (
        <Show when={data()}>
            <Title value={data().username} />
            <div classList={{
                'h-[calc(100vh-theme(spacing.12)]': theater(),
                'h-[calc(100vh-theme(spacing.12)-theme(spacing.12)]': !theater(),
                'mt-12': !theater()
            }}>
                <div classList={{
                    'w-[calc(100%-theme(spacing.80))]': sidebaropen(),
                    'w-full': !sidebaropen()
                }}>
                    <Player
                        user={data().username}
                        instance={params.user} autoplay={true}
                        scroll={false}
                        id="player"></Player>
                    <div class="flex flex-col pt-1 pl-1">
                        <div class="flex flex-row">
                            <div class="avatar placeholder">
                                <div class="w-24 mask mask-squircle bg-neutral-focus text-neutral-content">
                                    <span class="text-3xl">{data().username.substring(0, 2)}</span>
                                </div>
                            </div>
                            <h1 class="p-8 text-xl">{data().name ?? 'No Stream title'}</h1>
                        </div>
                    </div>
                </div>
                <Show when={sidebaropen()}>
                    <div class="w-80 fixed right-0 bottom-0 top-12">
                        <Chat />
                    </div>
                </Show>
            </div>
        </Show>
    );
};

export default Stream;
