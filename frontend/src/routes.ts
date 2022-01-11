import { lazy } from 'solid-js';
export const routes = [
    {
        path: "/:user",
        component: lazy(() => import("./Stream")),
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
