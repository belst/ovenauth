import { Component, createEffect, createSignal, JSX, onCleanup, onMount, splitProps } from "solid-js";
import OvenPlayer from 'ovenplayer';

export interface PlayerProps {
    url: string,
    autoplay: boolean,
    instance: string,
}

// TODO: make this a directive instead of a component
const Stream: Component<PlayerProps & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
    let ref: HTMLDivElement;

    const [playerProps, divProps] = splitProps(props, ['url', 'autoplay', 'instance']);

    onMount(() => {
        const [volume, setVolume] = createSignal(+(localStorage.getItem(`volume_${playerProps.instance}`) || 100));

        createEffect(() => localStorage.setItem(`volume_${playerProps.instance}`, volume().toString(10)));

        const player = OvenPlayer.create(ref, {
            volume: volume(),
            autoStart: playerProps.autoplay ?? false,
            webrtcConfig: {
                timeoutMaxRetry: 1000000,
                connectionTimeout: 5000
            },
            sources: [
                {
                    type: 'webrtc',
                    file: playerProps.url,
                }
            ]
        });
        let timeout: number;
        player.once('ready', () => player.play());
        player.on('volumeChanged', n => setVolume(n.volume));
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
        <div {...divProps}>
            <div ref={ref}></div>
        </div>
    );
};

export default Stream;
