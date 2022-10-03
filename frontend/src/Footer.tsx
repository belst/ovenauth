import { Component, For } from "solid-js";
import { theme, setTheme } from "./utils/theme";

const Footer: Component = () => {

    const themes = [
        'light',
        'dark',
        'cupcake',
        'bumblebee',
        'emerald',
        'corporate',
        'synthwave',
        'retro',
        'cyberpunk',
        'valentine',
        'halloween',
        'garden',
        'forest',
        'aqua',
        'lofi',
        'pastel',
        'fantasy',
        'wireframe',
        'black',
        'luxury',
        'dracula',
        'cmyk',
    ];

    return (
        <footer class="items-center mt-4 p-4 footer bg-neutral text-neutral-content bottom-0">
            <div class="items-center grid-flow-col">
                <select class="select select-bordered text-base-content w-full max-w-xs" oninput={(e) => setTheme(e.currentTarget.value)}>
                    <For each={themes}>
                        {(th) => <option selected={theme() === th} value={th}>{th}</option>}
                    </For>
                </select>
            </div>
            <div class="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
                <p>{import.meta.env.VITE_PAGE_TITLE}</p>
            </div>
        </footer>
    );
}

export default Footer;
