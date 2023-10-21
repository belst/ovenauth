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
        'autumn',
        'business',
        'acid',
        'lemonade',
        'night',
        'coffee',
        'winter',
    ];

    return (
        <footer class="items-center mt-4 p-2 footer bg-neutral text-neutral-content bottom-0">
            <div class="items-center grid-flow-col">
                <select class="select select-sm select-bordered text-base-content w-full max-w-xs" oninput={(e) => setTheme(e.currentTarget.value)}>
                    <For each={themes}>
                        {(th) => <option selected={theme() === th} value={th}>{th}</option>}
                    </For>
                </select>
            </div>
            <div class="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
                <p>Flussen statt Zucken</p>
            </div>
        </footer>
    );
}

export default Footer;
