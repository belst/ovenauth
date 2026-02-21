import { lazy } from 'solid-js';
import { preloadStreamData } from './Stream.data';

export const routes = [
    {
        path: '**',
        component: lazy(() => import("./Home")),
    },
    {
        path: "/:user",
        component: lazy(() => import("./Stream")),
        preload: preloadStreamData
    },
    {
        path: "/chat/:user",
        component: lazy(() => import("./chat/Chat")),
        preload: preloadStreamData
    },
    {
        path: "/viewers/:user",
        component: lazy(() => import("./ViewCountPage")),
    },
    {
        path: '/login',
        component: lazy(() => import("./Login")),
    },
    {
        path: '/register',
        component: lazy(() => import("./Register")),
    },
    {
        path: '/dashboard',
        component: lazy(() => import("./Dashboard")),
    }
];
