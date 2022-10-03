import { Component, createResource, ErrorBoundary, onCleanup, onMount, Show } from "solid-js";
import { useService } from "solid-services";
import { StatService } from "./store/StatService";

interface ViewCountProps {
    name: string;
    interval?: number | boolean;
    token: string;
    user: string;
}

const ViewCount: Component<ViewCountProps> = (props) => {
    const statService = useService(StatService);

    const fetcher = (name: string) => statService().getViewers(name, props.token, props.user, props.name);

    const [vc, { refetch }] = createResource(() => props.name, fetcher);

    const viewers = () => {
        let count = vc();
        return count == -404 ? 'Offline' : count == -500 ? '?' : count === 1 ? count + ' Viewer' : count + ' Viewers';
    };

    onMount(() => {
        if (props.interval !== false && typeof props.interval === 'number') {
            const interval = setInterval(() => refetch(), props.interval);
            onCleanup(() => clearInterval(interval));
        }
    });

    return (<h5>
        <Show when={!vc.loading || typeof vc() === 'number'} fallback={'Loading....'}>
            {viewers()}
        </Show>
    </h5>);
}

export default ViewCount;
