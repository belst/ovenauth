import { Show, type Component, createMemo, createResource, createEffect } from 'solid-js';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
import { DateTime } from 'luxon';
import color from '../utils/colors';
import { useParams, useRouteData } from '@solidjs/router';
import StreamData from '../Stream.data';
import { IUser } from '../types/user.interface';
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
    reply: (_: string) => void,
};

function parseEmotes(msg: string, emotes: any[], user?: IUser) {
    const ret = msg.split(/\s+/).map(w => {
        const e = emotes.find(e => e.name === w);
        const isMention = user && w.match(`@?${user.username}`);
        let r: Element | string;

        if (isMention && isMention.length && isMention[0]) {
            r = <><span class="bg-primary-focus bg-opacity-50">{w}</span>{' '}</> as Element;
        } else if (e) {
            r = <div class="inline-grid align-middle m-[-theme(spacing.2)] mx-0 overflow-clip">
                <img srcset={`${e.data.host.url}/1x.webp 1x, ${e.data.host.url}/2x.webp 2x, ${e.data.host.url}/3x.webp 3x`}
                    class="font-extrabold object-contain m-auto border-0 max-w-full"
                    style="grid-column: 1; grid-row: 1;"
                    alt={e.name}
                    loading="lazy"
                    decoding="async" />
            </div> as Element;
        } else {
            r = w + ' ';
        }
        return r;
    });
    // trim trailing space
    if (ret.length && typeof ret[ret.length - 1] === 'string') {
        ret[ret.length - 1] = ('' + ret[ret.length - 1]).trim();
    } else if (ret.length && Array.isArray(ret[ret.length - 1])) {
        ret[ret.length - 1] = ret[ret.length - 1][0];
    }
    return ret;
}

// TODO: Lots of interactivitiy, mentions
// - Add avatars to user profiles
// - Tag with ID so u can scrollto easily
const ChatMessage: Component<Props> = (props) => {
    const authService = useService(AuthService);
    const datetime = createMemo(() => DateTime.fromISO(props.message.timestamp));

    const { emoteSet } = useRouteData<typeof StreamData>();

    const message = createMemo(() => {
        return parseEmotes(props.message.content, emoteSet()?.emotes ?? [], authService().user);
    });

    const repliedMsg = createMemo(() => {
        return props.repliedmsg ? parseEmotes(props.repliedmsg.content, emoteSet()?.emotes ?? [], authService().user) : undefined;
    });

    function highlight(id: string) {
        const el = document.getElementById(id);
        if (!el) return;

        const keyframes = {
            filter: ['brightness(1.5)', 'brightness(1)'],
            easing: ['ease-in'],
        };
        if (typeof (el as any).scrollIntoViewIfNeeded !== 'undefined') {
            (el as any).scrollIntoViewIfNeeded({ behavior: 'smooth' });
        } else {
            el.scrollIntoView({ behavior: 'smooth' });
        }

        el.animate(keyframes, 1000);
    }

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
            <div class="chat-bubble hover:bg-neutral-focus w-[unset] break-words" classList={{
                'first-msg': props.position === 'start',
                'middle-msg': props.position === 'middle',
                'end-msg': props.position === 'end'
            }}>
                <div class="flex justify-between items-baseline">
                    <span class="font-semibold" style={{ color: color(props.message.author) }}>{props.message.author}</span>
                    <Show when={authService().user}>
                        <span class="opacity-[var(--reply-opacity,0)] text-xs cursor-pointer" onclick={() => props.reply(props.message.message_id)}>Reply</span>
                    </Show>
                </div>
                <Show when={props.repliedmsg}>
                    <blockquote class="border-l-2 px-1 cursor-pointer" style={{ 'border-color': color(props.repliedmsg.author) }} onclick={() => highlight(props.repliedmsg.message_id)}>
                        <div class="font-semibold" style={{ color: color(props.repliedmsg.author) }}>{props.repliedmsg.author}</div>
                        <div class="truncate max-w-full">{repliedMsg()}</div>
                    </blockquote>
                </Show>
                {message()}
                <time class="opacity-0 text-xs">{datetime().toLocaleString(DateTime.TIME_SIMPLE)}</time>
                <time class="opacity-50 text-xs absolute right-2 bottom-2">{datetime().toLocaleString(DateTime.TIME_SIMPLE)}</time>
            </div>
        </div>
    );
}

export default ChatMessage;

