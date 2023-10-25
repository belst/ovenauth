import { Show, type Component, createMemo } from 'solid-js';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
import { DateTime } from 'luxon';
import color from '../utils/colors';
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

type Props = {
    message: IncomingMessage,
    position: MessagePosition,
    repliedmsg?: IncomingMessage,
    reply: (_: string) => void
};

// TODO: Lots of interactivitiy, eg responding, showing responses, emotes, parsing of content
// - Add avatars to user profiles
// - Tag with ID so u can scrollto easily
const ChatMessage: Component<Props> = (props) => {
    const authService = useService(AuthService);
    const datetime = createMemo(() => DateTime.fromISO(props.message.timestamp));

    return (
        <div class="chat hover:[--reply-opacity:0.5]" id={props.message.message_id} classList={{
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
            <div class="chat-bubble hover:bg-neutral-focus w-[unset]" classList={{
                'first-msg': props.position === 'start',
                'middle-msg': props.position === 'middle',
                'end-msg': props.position === 'end'
            }}>
                <div class="flex justify-between items-baseline">
                    <span class="font-semibold" style={{ color: color(props.message.author) }}>{props.message.author}</span>
                    <span class="opacity-[var(--reply-opacity,0)] text-xs cursor-pointer" onclick={() => props.reply(props.message.message_id)}>Reply</span>
                </div>
                <Show when={props.repliedmsg}>
                    <blockquote class="border-l-2 px-1 max-w-full" style={{ 'border-color': color(props.repliedmsg.author) }}>
                        <div class="font-semibold" style={{ color: color(props.repliedmsg.author) }}>{props.repliedmsg.author}</div>
                        <div class="truncate max-w-full">{props.repliedmsg.content}</div>
                    </blockquote>
                </Show>
                {props.message.content}
                <time class="opacity-0 text-xs">{datetime().toLocaleString(DateTime.TIME_SIMPLE)}</time>
                <time class="opacity-50 text-xs absolute right-2 bottom-2">{datetime().toLocaleString(DateTime.TIME_SIMPLE)}</time>
            </div>
        </div>
    );
}

export default ChatMessage;

