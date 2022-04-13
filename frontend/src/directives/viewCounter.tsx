import { createResource, createEffect, onCleanup } from "solid-js";
import { useService } from "solid-services";
import { StatService } from "../store/StatService";

export function viewCounter(el, value) {
    
    const [user, interval] = value();

    const statService = useService(StatService);

    const fetcher = (name: string) => statService().getViewers(name);

    const [vc, { refetch }] = createResource(() => user, fetcher);

    const getViewCount = () => {
        let count = vc();
        return count < 0 ? 'Offline' : count ;
    };

    createEffect( () => {
        let vc = getViewCount();
        document.title = "Fluss - " + user + " - " + (typeof vc === 'number' ? " 👁 " + vc : " Offline");
    })

    if (interval !== false && typeof interval === 'number') {
            const i = setInterval(() => refetch(), interval);
            onCleanup(() => clearInterval(i));
    }

};
