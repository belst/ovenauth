import { useParams } from "solid-app-router";
import { Component, createResource, Show} from "solid-js";
import { useService } from "solid-services";
import Player from "./Player";
import {AuthService} from "./store/AuthService";
import { viewCounter } from "./directives/viewCounter"

viewCounter

const Stream: Component = () => {
    const params = useParams();

    const endpoint = import.meta.env.VITE_BASEURL;

    const css = {
        'aspect-ratio': '16 / 9',
        'max-width': '100%',
        'max-height': '100vh',
        margin: '0 auto'
    };

    const authService = useService(AuthService);

    const fallback = <h1 style={{'text-align': 'center', 'font-size': '5rem'}}>Logg dich nei!</h1>

    const [token, { refetch }] = createResource(() => {
        return authService().getToken();
    });

    const accessToken = () => {
        return token();
    };

    return (
        <>
            <div use:viewCounter={[params.user, 10000]}></div>
            <div>
                <Show when={(!token.loading || typeof token() === 'string') && token() !== 'error'} fallback={fallback}>
                    <Player
                        style={css}
                        url={`wss://${endpoint}/ws/${params.user}`}
                        instance={params.user} autoplay={true}
                        scroll={true}
                        token={accessToken()}
                        id="player"></Player>
                </Show>
            </div>
        </>
    );
};

export default Stream;
