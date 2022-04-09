import { useParams } from "solid-app-router";
import { Component, createEffect, onCleanup, onMount } from "solid-js";
import OvenPlayer from 'ovenplayer';
import { useRegistry } from "solid-services";
import Title from "./Title";

const Stream: Component = () => {
    const params = useParams();
    let ref;

    const endpoint = import.meta.env.VITE_BASEURL;

    let player;

    onMount(() => {
        player = OvenPlayer.create(ref, {
            sources: [
                {
                    type: 'webrtc',
                    file: `wss://${endpoint}/ws/${params.user}`,
                }
            ]
        });
        player.play();
    });

    onCleanup(() => {
        player?.remove();
    });

    return (
        <>
            <Title value={params.user} />
            <div style="margin: 0 auto; height: calc(100vh - 48px - 16px - 16px); width: calc((100vh - 48px - 16px - 16px) * 1.77777777778) max-width: 100%">
                <div id="player" ref={ref}></div>
            </div>
        </>
    );
};

export default Stream;

