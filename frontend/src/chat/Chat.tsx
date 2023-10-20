import { createSignal, type Component, createEffect, For, Show, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNavigate, useParams } from '@solidjs/router';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
import type { IncomingMessage } from './ChatMessage';
import ChatMessage from './ChatMessage';

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
    data: number[],
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

    const [chatState, setChatState] = createStore<Message[]>([]);
    const [roomState, setRoomState] = createStore<number[]>([]);

    let [ws, setWs] = createSignal<WebSocket>();
    createEffect(() => {
        if (!params.user) {
            navigate('/');
        }
        let wsurl = '';
        if (window.location.protocol === 'https:') {
            wsurl = 'wss://';
        } else {
            wsurl = 'ws://';
        }
        wsurl += window.location.host;
        if (window.location.port) {
            wsurl += `:${window.location.port}`
        }
        setWs(new WebSocket(`${wsurl}/chat/{params.user}`));
    });

    createEffect(() => console.log([...roomState]));

    createEffect(() => {
        if (!ws()) return;
        ws().onmessage = ({ data }) => {
            const msg = JSON.parse(data);
            if (msg.type === 'connect') {
                setRoomState(msg.data);
            } else if (msg.type === 'join' || msg.type === 'leave') {
                // unimplemented
            } else if (msg.type === 'msg') {
                setChatState(cs => [...cs, msg.data]);
            }
        };
    });

    onCleanup(() => {
        ws()?.close();
    });

    return <div>
        <For each={chatState}>
            {(cm) => (
                <Show when={cm.type === 'msg'}>
                    <ChatMessage message={cm.data as IncomingMessage} />
                </Show>
            )}
        </For>
        <Show when={authService().user}>
            {user => <div class="flex">
                <input type="text" placeholder="Chat here" class="input input-bordered w-full max-w-xs" onsubmit={e => {
                    ws()?.send(JSON.stringify({ author: user.name, content: e.currentTarget.value }));
                    e.currentTarget.value = '';
                }} />
            </div>}
        </Show>
    </div>;

}

export default Chat;
