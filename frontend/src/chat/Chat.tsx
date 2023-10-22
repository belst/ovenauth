import { createSignal, type Component, createEffect, For, Show, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useNavigate, useParams } from '@solidjs/router';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
import type { IncomingMessage, MessagePosition } from './ChatMessage';
import ChatMessage from './ChatMessage';
import { IUser } from '../types/user.interface';

export type JoinMessage = {
    type: "join",
    data: string,
};
export type LeaveMessage = {
    type: "leave",
    data: string,
};

export type ConnectMessage = {
    type: "connect",
    data: string[],
};

export type MsgMessage = {
    type: "msg",
    data: IncomingMessage,
}

export type Message = JoinMessage | LeaveMessage | ConnectMessage | MsgMessage;

const Chat: Component = () => {
    const authService = useService(AuthService);
    const params = useParams();
    const navigate = useNavigate();

    const [chatState, setChatState] = createStore<IncomingMessage[]>([]);
    const [roomState, setRoomState] = createStore<string[]>([]);
    const [loading, setLoading] = createSignal(true);

    const [ws, setWs] = createSignal<WebSocket>();
    createEffect(() => {
        if (!params.user) {
            navigate('/');
            return;
        }
        let wsurl = '';
        if (import.meta.env.VITE_PROTOCOL === 'https://') {
            wsurl = 'wss://';
        } else {
            wsurl = 'ws://';
        }
        wsurl += import.meta.env.VITE_BASEURL + import.meta.env.VITE_APIPATH;
        const url = `${wsurl}/chat/${params.user}`;
        const ws = new WebSocket(url);
        ws.onmessage = ({ data }) => {
            const msg = JSON.parse(data) as Message;
            if (msg.type === 'connect') {
                setRoomState(msg.data);
            } else if (msg.type === 'join') {
                const rs = roomState;
                rs.push(msg.data);
                rs.sort();
                setRoomState(produce(() => rs));
            } else if (msg.type === 'leave') {
                const rs = roomState.filter(r => r !== msg.data);
                setRoomState(rs);
            } else if (msg.type === 'msg') {
                // This order because we flip with flex direction reverse
                setChatState(cs => [msg.data, ...cs]);
            }
        };
        ws.onerror = (e) => console.log(e);
        ws.onopen = () => setLoading(false);
        ws.onclose = () => {
            setLoading(true);
            setWs(undefined);
        }
        setWs(ws);
    });

    onCleanup(() => {
        ws()?.close();
    });

    const [input, setInput] = createSignal<HTMLInputElement>();

    function submitChat(e: SubmitEvent, user: IUser) {
        e.preventDefault();
        const target = input();
        if (!target) return;
        const content = target.value.trim();
        if (!content.length) return;
        ws()?.send(JSON.stringify({ author: user.username, content: target.value }));
        target.value = '';
    }

    function calculatePos(i: number): MessagePosition {
        const current = chatState[i];
        const prevMsg = chatState[i+1];
        const nextMsg = chatState[i-1];
        if (prevMsg?.author === current.author && nextMsg?.author === current.author) return 'middle';
        if (prevMsg?.author === current.author && nextMsg?.author !== current.author) return 'end';
        if (prevMsg?.author !== current.author && nextMsg?.author === current.author) return 'start';
        if (prevMsg?.author !== current.author && nextMsg?.author !== current.author) return 'single';

        console.log('unreachable', prevMsg.author, current.author, nextMsg.author);
    }

    return (
        <div class="flex flex-col h-full justify-end py-1 border-l border-l-neutral-800">
            <div class="text-center p-2 text-lg border-b border-b-neutral-700">
                Stream Chat
            </div>
            <Show when={!loading()} fallback={<div class="text-3xl flex-grow grid place-items-center">Loading...</div>}>
                <div class="flex flex-col-reverse overflow-y-auto flex-grow pb-2">
                    <For each={chatState}>
                        {(cm, i) => (
                            <ChatMessage position={calculatePos(i())} message={cm as IncomingMessage} />
                        )}
                    </For>
                </div>
            </Show>
            <Show when={authService().user}>
                {user => (
                    <form onsubmit={e => submitChat(e, user())} class="flex flex-col gap-1">
                        <input ref={setInput} type="text" placeholder="Chat here" class="input input-bordered w-full max-w-xs" />
                        <input class="btn self-end" type="submit" value="Chat" />
                    </form>)
                }
            </Show>
        </div>
    );

}

export default Chat;
