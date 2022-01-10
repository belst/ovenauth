import { useParams } from "solid-app-router";
import { Component, createEffect } from "solid-js";
import OvenPlayer from 'ovenplayer';

const Stream: Component = () => {
    const params = useParams();
    let ref;

    const endpoint = import.meta.env.VITE_BASEURL;

    createEffect(() => {
        const player = OvenPlayer.create(ref.id, {
            sources: [
                {
                    type: 'webrtc',
                    file: `wss://${endpoint}/ws/${params.user}`,
                }
            ]
        });
    });

    return (
        <div style="margin: 0 auto; height: calc(100vh - 48px - 16px - 16px); width: calc((100vh - 48px - 16px - 16px) * 1.77777777778)">
            <div id="player" ref={ref}></div>
        </div>
    );
};

export default Stream;