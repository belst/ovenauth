import { createEffect, createSignal, onCleanup, onMount, useContext } from "solid-js";
import Hls from 'hls.js';
import OvenPlayer from 'ovenplayer';
import { TheaterContext } from "./store/shownav";

// Needed for hls playback Sadge
(window as any).Hls = Hls;

export interface PlayerProps {
    user: string,
    autoplay: boolean,
    instance: string,
    scroll?: boolean,
}

declare module "solid-js" {
    namespace JSX {
        interface Directives {
            player: PlayerProps;
        }
    }
}

function player(el: Element, props: () => PlayerProps) {
    const [theater, { toggleTheaterMode }] = useContext(TheaterContext);
    const endpoint = import.meta.env.VITE_BASEURL;
    const rtcurl = () => `wss://${endpoint}/ws/${props().user}`;
    onMount(() => {
        const [volume, setVolume] = createSignal(+(localStorage.getItem(`volume_${props().instance}`) || 100));

        createEffect(() => localStorage.setItem(`volume_${props().instance}`, volume().toString(10)));

        if (props().scroll) {
            const doscroll = () => setTimeout(() => el.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            }), 0);
            window.addEventListener('resize', doscroll);
            doscroll();

            onCleanup(() => window.removeEventListener('resize', doscroll));
        }
        const player = OvenPlayer.create(el, {
            volume: volume(),
            autoStart: props().autoplay ?? false,
            webrtcConfig: {
                timeoutMaxRetry: 1000000,
                connectionTimeout: 5000
            },
            sources: [
                {
                    label: 'WebRTC',
                    type: 'webrtc',
                    file: rtcurl(),
                },
                {
                    label: 'LL-HLS',
                    type: 'hls',
                    file: `/app/${props().user}/llhls.m3u8`,
                }
            ],
        });
        let timeout: number;
        player.once('ready', () => player.play());
        player.on('volumeChanged', n => setVolume(n));
        player.on('stateChanged', s => {
            if (['playing', 'loading'].includes(s.prevstate) && s.newstate === 'error') {
                timeout = setTimeout(() => player.play(), 1000);
            }
        });

        player.once('ready', () => setTimeout(() => {
            // todo: custom icon
            const theaterbutton = (
                <div class="theater-holder op-navigators op-clear">
                    <button onclick={toggleTheaterMode} class="op-button op-theater-button">
                        <i class="op-con op-playlist-icon"></i>
                    </button>
                </div>
            );
            player.getContainerElement().querySelector('.setting-holder.op-navigators.op-clear')
                .after(theaterbutton as Node);
        }));

        onCleanup(() => {
            clearTimeout(timeout);
            player.remove();
        });
    });
};

export default player;
