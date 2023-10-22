import { createResource } from "solid-js";

export type PublicStreamOptions = {
    name: string,
    username: string,
};

export default function StreamData({ params }) {
    const [streamInfo] = createResource(() => params.user, async (user): Promise<PublicStreamOptions> => {
        const url = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + import.meta.env.VITE_APIPATH + '/stream/' + user;

        return await fetch(url).then(r => r.json());
    });

    return streamInfo;
}

