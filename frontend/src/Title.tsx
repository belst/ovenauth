import { Component, createEffect } from "solid-js";

// TODO: replace with solid-meta
const Title: Component<{ value: string }> = (props) => {
    createEffect(() => document.title = props.value ? `Fluss - ${props.value}` : 'Flussen statt Zucken');

    return <></>;
};

export default Title;
