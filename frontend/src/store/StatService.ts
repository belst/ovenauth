import { ovenAuthClient } from './api';

export function StatService(user: string) {
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
    const client = ovenAuthClient(endpoint);

    return {
        getViewers(user: string, token: string, loggedInUser: string): Promise<number> {
            return client.stats.viewerCount(user, token, loggedInUser);
        }
    }
}
