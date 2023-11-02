import { IStreamOption, IUser } from "../types/user.interface";

function httpClient(endpoint: string, request: typeof fetch) {
  // let auth = "";

  async function makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: any,
    key?: string
  ) {
    // const authHeader = auth ? { authorization: `Token ${auth}` } : {};

    const opts: RequestInit = {
      method,
      body: body ? JSON.stringify(body) : null,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        credentials: 'same-origin',
        // ...authHeader,
      },
    };

    const cleanURL = endpoint + url.replace(/\?$/, '');

    const response = await request(cleanURL, opts);
    const json = await response.json();
    if (response.status >= 400 || (typeof json === 'object' && !!json && "errors" in json)) {
      throw json.errors || new Error(response.statusText);
    }

    return key ? json[key] : json;
  }

  return {
    get(url: string, params: Record<string, string | number> = {}) {
      return (key = "") =>
        makeRequest(
          'GET',
          `${url}?${new URLSearchParams(params as any)}`,
          undefined,
          key
        );
    },
    delete(url: string, params: Record<string, string | number> = {}) {
      return (key = "") =>
        makeRequest(
          'DELETE',
          `${url}?${new URLSearchParams(params as any)}`,
          undefined,
          key
        );
    },
    post(url: string, body: Record<string, unknown> = {}) {
      return (key = "") => makeRequest('POST', url, body, key);
    },
    put(url: string, body: Record<string, unknown> = {}) {
      return (key = "") => makeRequest('PUT', url, body, key);
    },
  };
}

export function ovenAuthClient(endpoint: string, request = fetch) {
  const client = httpClient(endpoint, request);

  return {
    stats: {
      async viewerCount(user: string): Promise<number> {
        return client.get('/viewers/' + user)('response').then(response => {
          return response.totalConnections
        }).catch(_ => -1);
      }
    },
    common: {
      users(): Promise<IUser[]> {
        return client.get('/user/users')('users');
      },
      options(): Promise<IStreamOption> {
        return client.get('/user/options')('options');
      },
      reset(): Promise<IStreamOption> {
        return client.put('/user/options', { token: true })();
      },
      set_emote_id(emote_id: string): Promise<IStreamOption> {
        return client.put('/user/options', { emote_id })();
      },
      set_public(p: boolean): Promise<IStreamOption> {
        return client.put('/user/options', { p})();
      },
      set_name(name: string): Promise<IStreamOption> {
        return client.put('/user/options', { name })();
      }
    },

    auth: {
      login(user: { username: string, password: string }): Promise<IUser> {
        return client.post('/user/login', user)('user');
      },

      register(user: { username: string, password: string, password_confirmation: string, secret_code: string }): Promise<IUser> {
        return client.post('/user/register', user)('user');
      },

      me(): Promise<IUser> {
        return client.get('/user/me')('user');
      },

      logout(): Promise<void> {
        return client.post('/user/logout')('user');
      },
    },
  }
}
