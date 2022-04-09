import { useParams } from "solid-app-router";
import { Component } from "solid-js";
import Title from "./Title";
import Player from "./Player";

const Stream: Component = () => {
    const params = useParams();

    const endpoint = import.meta.env.VITE_BASEURL;

    const css = {
        'aspect-ratio': '16 / 9',
        'max-width': '100%',
        'max-height': 'calc(100vh - 48px - 16px - 16px)',
    };

    return (
        <>
            <Title value={params.user} />
            <div style={css}>
                <Player url={`wss://${endpoint}/ws/${params.user}`} instance={params.user} autoplay={true} id="player"></Player>
            </div>
        </>
    );
};

export default Stream;
