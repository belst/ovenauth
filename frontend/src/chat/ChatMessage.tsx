import { Show, type Component } from 'solid-js';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
import { DateTime } from 'luxon';
//struct OutgoingMessage {
//    message_id: Ulid,
//    content: String,
//    author: String,
//    timestamp: chrono::DateTime<Utc>,
//    reply_to: Option<Ulid>,
//}
//
export type IncomingMessage = {
    message_id: string;
    content: string;
    author: string;
    timestamp: string;
    reply_to?: string;
};

export type MessagePosition = 'start' | 'middle' | 'end' | 'single';

// TODO: Lots of interactivitiy, eg responding, showing responses, emotes, parsing of content
// - dateparsing and showing (show relative, with absolute on hover)
// - Add avatars to user profiles
// - maybe pass chat-end/chat-start as prop
// - Tag with ID so u can scrollto easily
const ChatMessage: Component<{ message: IncomingMessage, position: MessagePosition }> = (props) => {
    const authService = useService(AuthService);
    return (
        <div class="chat" classList={{
            'chat-end': authService().user?.username === props.message.author,
            'chat-start': authService().user?.username !== props.message.author,
        }}>
            <div class="chat-image avatar placeholder">
                <Show fallback={<div class="w-10"></div>} when={props.position === 'end' || props.position === 'single'}>
                    <div class="w-10 rounded-full bg-neutral-focus text-neutral-content">
                        <span>{props.message.author.substring(0, 2)}</span>
                    </div>
                </Show>
            </div>
            <Show when={props.position === 'start' || props.position === 'single'}>
                <div class="chat-header">
                    {props.message.author}
                    <time class="text-xs opacity-50">{DateTime.fromISO(props.message.timestamp).toRelative()}</time>
                </div>
            </Show>
            <div class="chat-bubble" classList={{
                'first-msg': props.position === 'start',
                'middle-msg': props.position === 'middle',
                'end-msg': props.position === 'end'
            }}>
                {props.message.content}
            </div>
        </div>
    );
}

export default ChatMessage;

