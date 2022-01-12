import { createEffect, createSignal } from "solid-js";

const setThemeDom = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
};

export const [theme, setTheme] = createSignal(localStorage.getItem('theme'));

createEffect(() => {
    const themev = theme() || 'dark';
    setThemeDom(theme());
    localStorage.setItem('theme', themev);
});
