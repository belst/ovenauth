import { ovenAuthClient } from './api';

export function StatService() {
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
    const client = ovenAuthClient(endpoint);

    return {
        getViewers(user: string): Promise<number> {
            return client.stats.viewerCount(user);
        }
    }
}
