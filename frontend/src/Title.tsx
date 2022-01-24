import { Component, createEffect } from "solid-js";

const Title: Component<{ value: string }> = (props) => {
    createEffect(() => document.title = props.value ? `Fluss - ${props.value}` : 'Flussen statt Zucken');

    return <></>;
};

export default Title;
