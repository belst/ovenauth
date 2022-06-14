import { createSignal } from 'solid-js';
import {IUser, UserPermission} from '../types/user.interface';
import { ovenAuthClient } from './api';

export function AuthService() {
  const [getUser, setUser] = createSignal<IUser>();
  const [users, setUsers] = createSignal([]);
  const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
  const client = ovenAuthClient(endpoint);

  client.auth.me().then(setUser).catch(() => setUser(null));
  loadUsers();

  function loadUsers() {
    client.common.users().then(setUsers).catch(() => setUsers([]));
  }

  return {

    loadUsers() {
      loadUsers();
    },

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

    async getToken(): Promise<String> {
      const token = await client.auth.getToken();
      return token;
    },

    async allowedUsers(): Promise<Array<UserPermission>> {
      const viewers = await client.auth.allowedViewers();
      const all = await client.common.users();
      return all.map(u => {
        return { user: u, permitted: viewers.filter(us => us.id === u.id).length > 0 }
      });
    },

    async setViewerPermission(user: string, allowed: boolean): Promise<void> {
      return await client.auth.setViewerPermission(user, allowed);
    },

    async allowedToWatch(stream: string): Promise<boolean> {
      return await client.auth.allowedToWatch(stream);
    }
  }
}
