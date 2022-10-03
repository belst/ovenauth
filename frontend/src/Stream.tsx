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

    authService().refreshToken()

    const loginFallback = <div style={{'text-align': 'center', 'font-size': '5vh'}}>Du musschd di jedzd abr scho no neilogga weischt?</div>
    const whitelistFallback = <div style={{'text-align': 'center', 'font-size': '5vh'}}>Du bisch leidr ned whidelischded :(</div>


    const [allowedResource, {  }] = createResource(() => {
        return authService().allowedToWatch(params.user).catch(() => false);
    });

    const allowed = () => {
        return allowedResource();
    };

    return (
        <>
            <Show when={(authService().token !== 'uninit') || allowed()} fallback={loginFallback}>
                <div use:viewCounter={[params.user, authService().user.username, 10000, authService().token]}></div>
                <div>
                    <Show when={!allowedResource.loading && allowed()} fallback={whitelistFallback}>
                        <Player
                            style={css}
                            url={`wss://${endpoint}/ws/${params.user}`}
                            name={params.user}
                            instance={params.user} autoplay={true}
                            scroll={true}
                            token={authService().token}
                            user={authService().user.username}
                            id="player">
                        </Player>
                    </Show>
                </div>
            </Show>
        </>
    );
};

export default Stream;
