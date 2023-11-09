import { createSignal, type Component, createEffect, For, Show, onCleanup, useContext } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useNavigate, useParams, useLocation } from '@solidjs/router';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
import type { IncomingMessage, MessagePosition } from './ChatMessage';
import ChatMessage from './ChatMessage';
import { IUser } from '../types/user.interface';
import color from '../utils/colors';
import { TheaterContext } from '../store/shownav';

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

const Chat: Component<{ toggleSidebar?: () => void }> = (props) => {
    const authService = useService(AuthService);
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [chatState, setChatState] = createStore<IncomingMessage[]>([]);
    const [roomState, setRoomState] = createStore<string[]>([]);
    const [loading, setLoading] = createSignal(true);

    const [theater] = useContext(TheaterContext);

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
    const [replying, setReplying] = createSignal<boolean | string>(false);
    const replyto = () => chatState.find(m => m.message_id === replying());

    createEffect(() => {
        if (replying()) {
            input().focus();
        }
    });

    function submitChat(e: SubmitEvent, user: IUser) {
        e.preventDefault();
        const target = input();
        if (!target) return;
        const content = target.value.trim();
        if (!content.length) return;
        ws()?.send(JSON.stringify({ author: user.username, content: target.value, reply_to: replying() || undefined }));
        target.value = '';
        setReplying(false);
    }

    function calculatePos(i: number): MessagePosition {
        const current = chatState[i];
        const prevMsg = chatState[i + 1];
        const nextMsg = chatState[i - 1];
        if (prevMsg?.author === current.author && nextMsg?.author === current.author) return 'middle';
        if (prevMsg?.author === current.author && nextMsg?.author !== current.author) return 'end';
        if (prevMsg?.author !== current.author && nextMsg?.author === current.author) return 'start';
        if (prevMsg?.author !== current.author && nextMsg?.author !== current.author) return 'single';

        console.log('unreachable', prevMsg.author, current.author, nextMsg.author);
    }

    const hideIcon = (
        <svg fill="currentColor" version="1.1" class="h-6 w-6" viewBox="0 0 20 20" x="0px" y="0px" aria-hidden="true">
            <path d="M4 16V4H2v12h2zM13 15l-1.5-1.5L14 11H6V9h8l-2.5-2.5L13 5l5 5-5 5z"></path>
        </svg>
    );

    const toggleSidebar = () => {
        if (props.toggleSidebar) {
            props.toggleSidebar();
        }
    }

    const standalone = () => location.pathname.startsWith('/chat');

    const style = () => ({
        'h-screen': standalone(),
        'h-[calc(100dvh-56.2vw)]': theater(),
        'h-[calc(100dvh-56.2vw-theme(spacing.12))]': !theater()
    });

    return (
        <div class="flex flex-col md:h-full justify-end py-1 border-l border-l-neutral-800" classList={style()}>
            <div class="flex justify-between p-2 text-lg border-b border-b-neutral-700">
                <button onclick={toggleSidebar} class="btn btn-square btn-outline btn-sm">{hideIcon}</button>
                <span>Stream Chat</span>
                <span>Room</span>
            </div>
            <Show when={!loading()} fallback={<div class="text-3xl flex-grow grid place-items-center">Loading...</div>}>
                <div class="flex flex-col-reverse overflow-y-auto flex-grow pb-2">
                    <For each={chatState}>
                        {(cm, i) => (
                            <ChatMessage position={calculatePos(i())} message={cm as IncomingMessage} repliedmsg={chatState.find(m => m.message_id === cm.reply_to)} reply={setReplying} />
                        )}
                    </For>
                </div>
            </Show>
            <Show when={authService().user}>
                {user => (
                    <form onsubmit={e => submitChat(e, user())} class="flex flex-col gap-1">
                        <div class="join join-vertical">
                            <Show when={replyto()}>
                                {msg => (
                                    <div class="join-item bg-neutral px-4 py-2">
                                        <div class="flex justify-between">
                                            <span class="font-semibold" style={{ color: color(msg().author) }}>{msg().author}</span>
                                            <span onclick={() => setReplying(false)} class="cursor-pointer rounded-sm hover:bg-neutral-focus">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </span>
                                        </div>
                                        <div>{msg().content}</div>
                                    </div>
                                )}
                            </Show>
                            <input ref={setInput} type="text" placeholder="Chat here" class="join-item input input-bordered w-full max-w-xs" />
                        </div>
                        <input class="btn self-end" type="submit" value={replying() ? 'Reply' : 'Chat'} />
                    </form>)
                }
            </Show>
        </div>
    );

}

export default Chat;
