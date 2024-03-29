import { useParams, useRouteData, useSearchParams } from "@solidjs/router";
import { Component, Show, Suspense, useContext } from "solid-js";
import Title from "./Title";
import player from "./Player";
import Chat from "./chat/Chat";
import StreamData from "./Stream.data";
import { TheaterContext } from "./store/shownav";
player;

const Stream: Component = () => {
    const params = useParams();
    const [search, setSearch] = useSearchParams();
    const { streamInfo: data } = useRouteData<typeof StreamData>();

    const [theater] = useContext(TheaterContext);
    const sidebaropen = () => !search.sidebar;
    const setSidebaropen = (value: boolean) => setSearch({ sidebar: value ? '' : '1' });
    const showIcon = (
        <svg fill="currentColor" version="1.1" class="h-6 w-6 -scale-x-100" viewBox="0 0 20 20" x="0px" y="0px" aria-hidden="true">
            <path d="M4 16V4H2v12h2zM13 15l-1.5-1.5L14 11H6V9h8l-2.5-2.5L13 5l5 5-5 5z"></path>
        </svg>
    );
    return (
        <Suspense>
            <Title value={params.user} />
            <div classList={{
                'h-screen': theater(),
                'h-[calc(100dvh-theme(spacing.40))]': !theater(),
                'mt-12': !theater()
            }}>
                <div class="md:h-full grid items-center" classList={{
                    'w-full md:w-[calc(100%-theme(spacing.80))]': sidebaropen(),
                    'w-full': !sidebaropen(),
                    'bg-black': theater(),
                }}>
                    <div use: player={{
                        user: params.user,
                        autoplay: true,
                        scroll: false
                    }}></div>
                </div>
                <Show when={!theater()}>
                    <div class="md:flex hidden flex-col pt-1 pl-1" classList={{ 'mr-80': sidebaropen() }}>
                        <div class="flex flex-row">
                            <div class="avatar placeholder">
                                <div class="w-24 mask mask-squircle bg-neutral-focus text-neutral-content">
                                    <span class="text-3xl">{params.user.substring(0, 2)}</span>
                                </div>
                            </div>
                            <h1 class="p-8 text-xl">{data.latest.name ?? 'No Stream title'}</h1>
                        </div>
                    </div>
                </Show>
                <Show when={sidebaropen()}
                    fallback={<button
                        class="fixed right-0 btn btn-square btn-outline btn-sm m-2"
                        classList={{
                            "top-12": !theater(),
                            "top-0": theater(),
                        }}
                        onclick={() => setSidebaropen(true)}>
                        {showIcon}
                    </button>}
                >
                    <div class="md:w-80 md:fixed md:right-0 md:bottom-0" classList={{
                        "md:top-12": !theater(),
                        "md:top-0": theater(),
                    }}>
                        <Chat toggleSidebar={() => setSidebaropen(!sidebaropen())} />
                    </div>
                </Show>
            </div>
        </Suspense>
    );
};

export default Stream;
