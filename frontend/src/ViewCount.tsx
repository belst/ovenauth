import { Component, createResource, onCleanup, onMount, Suspense } from "solid-js";
import { useService } from "solid-services";
import { StatService } from "./store/StatService";

interface ViewCountProps {
    name: string;
    interval?: number | boolean;
}

const ViewCount: Component<ViewCountProps> = (props) => {
    const statService = useService(StatService);

    const fetcher = (name: string) => statService().getViewers(name);

    const [vc, { refetch }] = createResource(() => props.name, fetcher);

    const viewers = () => {
        let count = vc.latest;
        return count < 0 ? 'Offline' : count === 1 ? count + ' Viewer' : count + ' Viewers';
    };

    onMount(() => {
        if (props.interval !== false && typeof props.interval === 'number') {
            const interval = setInterval(() => refetch(), props.interval);
            onCleanup(() => clearInterval(interval));
        }
    });

    return (<h5>
        <Suspense fallback={'Loading....'}>
            {viewers()}
        </Suspense>
    </h5>);
}

export default ViewCount;
