import {IStreamOption, IUser, Recording, VodInfo} from "../types/user.interface";
import stream from "../Stream";

function httpClient(endpoint: string, request: typeof fetch) {
    // let auth = "";

    async function makeRequest(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        url: string,
        body?: any,
        key?: string,
        username?: string,
        token?: string
    ) {
        const usrname = username ? { username: `${username}` } : {};
        const tken = token ? { token: `${token}` } : {};

        const opts: RequestInit = {
            method,
            body: body ? JSON.stringify(body) : null,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                credentials: 'same-origin',
                ...usrname,
                ...tken
            },
        };

        const cleanURL = endpoint + url.replace(/\?$/, '');

        const response = await request(cleanURL, opts);
        const json = await response.json();
        if (response.status >= 400 || "errors" in json) {
            throw json.errors || new Error(response.statusText);
        }

        return key ? json[key] : json;
    }

    return {
        get(url: string, params: Record<string, string | number> = {}, username?: string, token?: string) {
            return (key = "") =>
                makeRequest(
                    'GET',
                    `${url}?${new URLSearchParams(params as any)}`,
                    undefined,
                    key,
                    username,
                    token
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
        post(url: string, body: Record<string, unknown> = {}, username?: string, token?: string) {
            return (key = "") => makeRequest('POST', url, body, key, username, token);
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
            viewerCount(user: string, token: string, loggedInUser: string): Promise<number> {
                const url = '/viewers/' + user + "?username=" + loggedInUser + "&token=" + token + "&streamname=" + user;
                return client.get(url)('response').then(response => {
                    return response.totalConnections
                }).catch(e => {
                    if (e.toString() === "Error: Not Found") {
                        return -404;
                    } else {
                        return -500;
                    }
                });
            }
        },
        common: {
            users(): Promise<IUser[]> {
                return client.get('/users')('users');
            },
            allowedUsers(): Promise<IUser[]> {
                return client.get('/allowedViewers')('users');
            },
            options(): Promise<IStreamOption> {
                return client.get('/options')('options');
            },
            reset(): Promise<void> {
                return client.post('/reset')();
            }
        },

        auth: {
            login(user: { username: string, password: string }): Promise<IUser> {
                return client.post('/login', { user })('user');
            },

            register(user: { username: string, password: string, password_confirmation: string, secret_code: string }): Promise<IUser> {
                return client.post('/register', { user })('user');
            },

            me(): Promise<IUser> {
                return client.get('/user')('user');
            },

            logout(): Promise<void> {
                return client.post('/logout')('user');
            },
            refreshToken(): Promise<string> {
                return client.put('/generateToken')("token").catch(_ => "guest_token")
            },
            allowedViewers(): Promise<IUser[]> {
                return client.get('/allowedViewers')('users').catch(_ => []);
            },
            setViewerPermission(user: string, allowed: boolean): Promise<void> {
                return client.get(`/setViewerPermission?username=${user}&allowed=${allowed}`)("ok");
            },
            allowedToWatch(stream: string): Promise<boolean> {
                return client.get(`/allowedToWatch?stream=${stream}`)("whitelisted");
            },
            setPublic(state: boolean): Promise<void> {
                return client.get(`/setPublic?is_public=${state}`)("ok")
            }

        }
    }
}
