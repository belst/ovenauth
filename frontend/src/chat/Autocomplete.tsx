import { Component, For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Emote } from "../Stream.data";

type Props = {
    globalEmotes: Array<Emote>;
    customEmotes: Array<Emote>;
    input: HTMLInputElement;
}

const Autocomplete: Component<Props> = (props) => {
    const [inputVal, setInputVal] = createSignal('');
    const [caretPosition, setCaretPosition] = createSignal(0);
    const [selectedEmoteIndex, setSelectedEmoteIndex] = createSignal(-1);
    const [showAutocomplete, setShowAutocomplete] = createSignal(false);

    createEffect(() => {
        if (!showAutocomplete()) {
            setSelectedEmoteIndex(-1);
        }
    });


    const checkCaret = (e: any) => {
        setCaretPosition(e.currentTarget.selectionStart);
    };

    const w = () => {
        const inputv = inputVal().substring(0, caretPosition());
        const words = inputv.split(/\s+/);
        const w = words.length > 0 ? words[words.length - 1].toLowerCase() : "";
        return w;
    }
    const filteredGlobal = createMemo(() => {
        const word = w();

        return props.globalEmotes.filter(e => e.name.toLowerCase().startsWith(word));
    });
    const filteredCustom = createMemo(() => {
        const word = w();

        return props.customEmotes.filter(e => e.name.toLowerCase().startsWith(word));
    });
    const emoteCountTotal = () => filteredCustom().length + filteredGlobal().length;
    const selectedEmoteName = () => {
        let index = selectedEmoteIndex();
        if (index < 0 || index >= emoteCountTotal()) {
            return '';
        }
        if (index < filteredGlobal().length) {
            return filteredGlobal()[index].name;
        } else {
            index = index - filteredGlobal().length;
            return filteredCustom()[index].name;
        }
    };

    const setEmote = () => {
        setInputVal(inputVal().substring(0, caretPosition() - w().length) + selectedEmoteName() + ' ' + inputVal().substring(caretPosition()))
        setShowAutocomplete(false);
    };

    const keyDownHandler = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
            e.preventDefault();
            if (!showAutocomplete() && emoteCountTotal() > 0) {
                setShowAutocomplete(true);
                setSelectedEmoteIndex(0);
                return;
            }
            if (selectedEmoteName().length > 0) {
                setEmote();
            }
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedEmoteIndex(old => Math.min(emoteCountTotal() - 1, old + 1));
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedEmoteIndex(old => Math.max(0, (old - 1)));
        }
        if (e.key === "Enter" && showAutocomplete()) {
            e.preventDefault();
            setEmote();
        }
    };

    onMount(() => {
        const setModel = (e: InputEvent) => { setInputVal((e.currentTarget as HTMLInputElement).value) };
        createEffect(() => {
            props.input.value = inputVal();
        });
        props.input.addEventListener('input', setModel);
        props.input.addEventListener('keydown', keyDownHandler);
        props.input.addEventListener('keypress', checkCaret); // Every character written
        props.input.addEventListener('mousedown', checkCaret); // Click down
        props.input.addEventListener('touchstart', checkCaret); // Mobile
        props.input.addEventListener('input', checkCaret); // Other input events
        props.input.addEventListener('paste', checkCaret); // Clipboard actions
        props.input.addEventListener('cut', checkCaret);
        props.input.addEventListener('mousemove', checkCaret); // Selection, dragging text
        props.input.addEventListener('select', checkCaret); // Some browsers support this event
        props.input.addEventListener('selectstart', checkCaret); // Some browsers support this event

        onCleanup(() => {
            props.input.removeEventListener('input', setModel);
            props.input.removeEventListener('keydown', keyDownHandler);
            props.input.removeEventListener('keypress', checkCaret);
            props.input.removeEventListener('mousedown', checkCaret);
            props.input.removeEventListener('touchstart', checkCaret);
            props.input.removeEventListener('input', checkCaret);
            props.input.removeEventListener('paste', checkCaret);
            props.input.removeEventListener('cut', checkCaret);
            props.input.removeEventListener('mousemove', checkCaret);
            props.input.removeEventListener('select', checkCaret);
            props.input.removeEventListener('selectstart', checkCaret);
        });
    });

    return (
        <Show when={showAutocomplete()}>
            <div class="absolute top-0 -translate-y-full">
                <Show when={filteredGlobal().length > 0}>
                    <ul class="menu bg-base-200 w-56 rounded-box">
                        <For each={filteredGlobal()}>
                            {(e, i) => <li>
                                <a classList={{
                                    'active': i() === selectedEmoteIndex()
                                }}
                                    onclick={_ => {
                                        setSelectedEmoteIndex(i());
                                        setEmote();
                                    }}>{e.name}</a>
                            </li>}
                        </For>
                    </ul>
                </Show>
                <Show when={filteredCustom().length > 0}>
                    <ul class="menu bg-base-200 w-56 rounded-box">
                        <For each={filteredCustom()}>
                            {(e, i) => <li>
                                <a classList={{
                                    'active': i() === (selectedEmoteIndex() - filteredGlobal().length)
                                }}
                                    onclick={_ => {
                                        setSelectedEmoteIndex(i());
                                        setEmote();
                                    }}>{e.name}</a>
                            </li>}
                        </For>
                    </ul>
                </Show>
            </div>
        </Show>
    );
};

export default Autocomplete;
