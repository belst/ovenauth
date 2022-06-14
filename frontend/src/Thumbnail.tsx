import { Component, createEffect, createResource, createSignal, ErrorBoundary, onCleanup, onMount } from "solid-js";

const Thumbnail: Component<{ name: string, interval?: number, hover?: HTMLElement }> = (props) => {
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL;

    const fbpx = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const [intervalDuration, setIntervalDuration] = createSignal(props.interval ?? 10000);

    const fetcher = async (name: string) => {
        const res = await fetch(`${endpoint}/thumbs/${name}/thumb.png?t=${Date.now()}`);
        if (!res.ok) {
            throw new Error(res.statusText);
        }
        return URL.createObjectURL(await res.blob());
    }

    const [img, { refetch }] = createResource(() => props.name, fetcher);

    let timeout;

    const update = () => {
        refetch();
        timeout = setTimeout(update, intervalDuration());
    }

    let oldintervaldur = intervalDuration();

    let enter = (e: MouseEvent) => {
        oldintervaldur = intervalDuration();
        setIntervalDuration(1000);
    }
    let leave = (e) => {
        setIntervalDuration(oldintervaldur);
    }

    onMount(() => {
        if (props.hover) {
            props.hover.addEventListener('mouseenter', enter);
            props.hover.addEventListener('mouseleave', leave);
        }

        onCleanup(() => {
            if (props.hover) {
                props.hover.removeEventListener('mouseenter', enter);
                props.hover.removeEventListener('mouseleave', leave);
            }
        })
    });

    createEffect(() => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            update();
        }, intervalDuration());

        onCleanup(() => clearTimeout(timeout));
    });

    createEffect(() => {
        if (img.error) {
            setIntervalDuration(60000);
        } else {
            setIntervalDuration(props.interval ?? 10000);
        }
    });

    return (
        <figure class="aspect-video">
            <ErrorBoundary fallback={<img class="bg-gradient-to-tl from-neutral-content to-neutral" src={fbpx} />}>
                <img class="bg-gradient-to-tl from-neutral-content to-neutral" src={img()} />
            </ErrorBoundary>
        </figure>
    )
}

export default Thumbnail;
