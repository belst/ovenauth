import { lazy } from 'solid-js';
import StreamData from './Stream.data';

export const routes = [
    {
        path: "/:user",
        component: lazy(() => import("./Stream")),
        data: StreamData
    },
    {
        path: "/chat/:user",
        component: lazy(() => import("./chat/Chat")),
    },
    {
        path: "/viewers/:user",
        component: lazy(() => import("./ViewCountPage")),
    },
    {
        path: '**',
        component: lazy(() => import("./Home")),
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
