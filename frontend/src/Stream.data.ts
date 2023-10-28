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

    const [emoteSet] = createResource(() => params.user, async (_user) => {
        return await fetch('https://7tv.io/v3/emote-sets/60ead4ed1bc42372a0f58a0b')
            .then(b => b.json());
    });

    return { streamInfo, emoteSet };
}

