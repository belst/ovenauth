import { createResource, createEffect, onCleanup } from "solid-js";
import { useService  } from "solid-services";
import { StatService } from "../store/StatService";
import { AuthService } from "../store/AuthService";

export function viewCounter(el, value) {
    const [user, loggedInUser, interval, token] = value();

    const statService = useService(StatService);

    const fetcher = (name: string) => statService().getViewers(name, token, loggedInUser);

    const [vc, { refetch }] = createResource(() => user, fetcher);

    const getViewCount = () => {
        let count = vc();
        return count == -404 ? 'Offline' : count == -500 ? '?' : count ;
    };

    createEffect( () => {
        let vc = getViewCount();
        document.title = (typeof vc === 'number' ? " 👁" + vc : " Offline") + " - "  + user;
    })

    if (interval !== false && typeof interval === 'number') {
            const i = setInterval(() => refetch(), interval);
            onCleanup(() => clearInterval(i));
    }

};
