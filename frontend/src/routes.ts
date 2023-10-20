import { lazy } from 'solid-js';
export const routes = [
    {
        path: "/:user",
        component: lazy(() => import("./Stream")),
    },
    {
        path: "/chat/:user",
        component: lazy(() => import("./chat/Chat")),
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
