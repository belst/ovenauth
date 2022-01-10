import { createSignal } from 'solid-js';
import { IUser } from '../types/user.interface';
import { ovenAuthClient } from './api';

export function AuthService() {
  const [getUser, setUser] = createSignal();
  const [users, setUsers] = createSignal([]);
  const client = ovenAuthClient('http://localhost:8080');

  client.auth.me().then(setUser);
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

    async login(creds): Promise<IUser> {
      const user = await client.auth.login(creds);
      setUser(user);
      return user;
    }
  }
}
