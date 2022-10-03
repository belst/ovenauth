import {createSignal} from 'solid-js';
import {IUser, UserPermission} from '../types/user.interface';
import {ovenAuthClient} from './api';

let UNINIT = "uninit";

export function AuthService() {
  const [getUser, setUser] = createSignal<IUser>();
  const [users, setUsers] = createSignal([]);
  const [token, setToken] = createSignal(UNINIT);
  const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
  const client = ovenAuthClient(endpoint);

  const guest : IUser = {
    id: 0,
    username: "guest",
    hidden: true,
    public: true
  }

  function authMe() {
    return client.auth.me().then(setUser).catch(() => setUser(() => guest))
  }

  function refreshToken() {
    setToken(UNINIT);
    return client.auth.refreshToken().then(setToken).catch(() => setToken("guest_token"))
  }

  authMe().then(() => refreshToken())
  loadUsers();

  function loadUsers() {
    client.common.users().then(setUsers).catch(() => setUsers([]));
  }

  return {

    loaded() {
      return getUser() && token() !== UNINIT
    },

    loggedIn() {
      return getUser() && getUser().id != 0
    },

    refreshToken() {
      refreshToken();
    },

    authMe() {
      authMe();
    },

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
      refreshToken();
      return user;
    },

    async logout(): Promise<void> {
      await client.auth.logout();
      setUser(guest);
      setToken("guest_token");
    },

    async register(creds): Promise<IUser> {
      const user = await client.auth.register(creds);
      setUser(user);
      return user;
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
    },

    async setPublic(isPublic: boolean): Promise<void> {
      return await client.auth.setPublic(isPublic)
    },

    get token() {
      return token();
    },
  }
}
