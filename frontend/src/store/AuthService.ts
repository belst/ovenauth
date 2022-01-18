import { createSignal } from 'solid-js';
import { IUser } from '../types/user.interface';
import { ovenAuthClient } from './api';

export function AuthService() {
  const [getUser, setUser] = createSignal<IUser>();
  const [users, setUsers] = createSignal([]);
  const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
  const client = ovenAuthClient(endpoint);

  client.auth.me().then(setUser).catch(() => setUser(null));
  client.common.users().then(setUsers);

  return {
    get user() {
      return getUser();
    },

    setUser(user) {
      setUser(user);
    },

    get users() {
      return users();
    },

    get client() {
      return client;
    },

    async login(creds): Promise<IUser> {
      const user = await client.auth.login(creds);
      setUser(user);
      return user;
    },

    async logout(): Promise<void> {
      await client.auth.logout();
      setUser(null);
    },

    async register(creds): Promise<IUser> {
      const user = await client.auth.register(creds);
      setUser(user);
      return user;
    },
  }
}
