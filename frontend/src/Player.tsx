import { Component, createEffect, createSignal, JSX, onCleanup, onMount, splitProps } from "solid-js";
import Hls from 'hls.js';
import OvenPlayer from 'ovenplayer';

// Needed for hls playback Sadge
(window as any).Hls = Hls;

export interface PlayerProps {
    user: string,
    autoplay: boolean,
    instance: string,
    scroll?: boolean,
}

// TODO: make this a directive instead of a component
const Stream: Component<PlayerProps & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
    let ref: HTMLDivElement;

    const [playerProps, divProps] = splitProps(props, ['user', 'autoplay', 'instance', 'scroll']);
    const endpoint = import.meta.env.VITE_BASEURL;
    const rtcurl = () => `wss://${endpoint}/ws/${props.user}`;
    onMount(() => {
        const [volume, setVolume] = createSignal(+(localStorage.getItem(`volume_${playerProps.instance}`) || 100));

        createEffect(() => localStorage.setItem(`volume_${playerProps.instance}`, volume().toString(10)));

        if (playerProps.scroll) {
            const doscroll = () => setTimeout(() => ref.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            }), 0);
            window.addEventListener('resize', doscroll);
            doscroll();

            onCleanup(() => window.removeEventListener('resize', doscroll));
        }
        const player = OvenPlayer.create(ref.firstElementChild as HTMLDivElement, {
            volume: volume(),
            autoStart: playerProps.autoplay ?? false,
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
                    file: `/app/${props.user}/llhls.m3u8`,
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

        onCleanup(() => {
            clearTimeout(timeout);
            player.remove();
        });
    });

    return (
        <div ref={ref} {...divProps}>
            <div></div>
        </div>
    );
};

export default Stream;
