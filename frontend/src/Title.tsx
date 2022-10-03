import { Component, createEffect, onMount, createResource, onCleanup} from "solid-js";

interface TitleProps {
    interval?: number | boolean;
    name: string;

}

const Title: Component<TitleProps> = (props) => {

    const title = import.meta.env.VITE_PAGE_TITLE as string;

    createEffect(() => {
        document.title = title;
    });

    return <></>;
};


export default Title;
