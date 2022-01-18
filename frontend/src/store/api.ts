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
        if (response.status >= 400 || "errors" in json) {
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
        common: {
            users(): Promise<IUser[]> {
                return client.get('/users')('users');
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
        },
    }
}