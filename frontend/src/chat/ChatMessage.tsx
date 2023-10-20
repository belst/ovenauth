import type { Component } from 'solid-js';
import { useService } from 'solid-services';
import { AuthService } from '../store/AuthService';
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

// TODO: Lots of interactivitiy, eg responding, showing responses, emotes, parsing of content
// - dateparsing and showing (show relative, with absolute on hover)
// - Add avatars to user profiles
// - maybe pass chat-end/chat-start as prop
// - Tag with ID so u can scrollto easily
const ChatMessage: Component<{message: IncomingMessage}> = (props) => {
    const authService = useService(AuthService);
    return (
        <div class="chat" classList={{
                'chat-start': authService().user?.username === props.message.author,
                'chat-end': authService().user?.username !== props.message.author,
            }}>
            <div class="chat-image avatar placeholder">
                <div class="w-10 rounded-full bg-neutral-focus text-neutral-content">
                    <span>{props.message.author.substring(0, 2)}</span>
                </div>
            </div>
            <div class="chat-header">
                {props.message.author}
                <time class="text-xs opacity-50">{props.message.timestamp}</time>
            </div>
            <div class="chat-bubble">
                {props.message.content}
            </div>
        </div>
    );
}

export default ChatMessage;

