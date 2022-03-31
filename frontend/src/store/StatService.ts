import { createSignal } from 'solid-js';
import { ovenAuthClient } from './api';

export function StatService() {
  const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
  const client = ovenAuthClient(endpoint);

  return { 
    async getViewers(user: string): Promise<number> {
          return await client.stats.viewerCount(user);
      }
  }
}