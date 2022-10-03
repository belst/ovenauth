import {Component, createSignal, Show} from "solid-js";
import LoadingSpinner from "./loadingSpinner";
import {useService} from "solid-services";
import {AuthService} from "../store/AuthService";
import {VodInfo} from "../types/user.interface";

export interface VodProps {
    vod: VodInfo,
}

const Vod: Component<VodProps> = (props) => {

    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
    const [loading, setLoading] = createSignal(false)
    const authService = useService(AuthService)

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes'

        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    function downloadVOD (vodpath, user, token) {
        setLoading(true)
        fetch(vodpath, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/mp2t',
                "username": user,
                "token": token
            },
        })
            .then((response) => {
                if (response.status != 200) {
                    setLoading(false)
                    throw "error"
                }
                return response.blob()
            })
            .then((blob) => {
                // Create blob link to download
                const url = window.URL.createObjectURL(
                    new Blob([blob]),
                );
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute(
                    'download',
                    `${vodpath.substring(vodpath.lastIndexOf('/')+1)}`
                );

                // Append to html link element page
                document.body.appendChild(link);

                // Start download
                link.click();
                setLoading(false)

                // Clean up and remove the link
                link.parentNode.removeChild(link);
            });
    }

    return (
        <div style={{ padding: '1rem', display: 'flex', "align-items": 'center'}}>
            <Show when={loading()}>
                <LoadingSpinner></LoadingSpinner>
            </Show>
            <li onclick={() =>downloadVOD(`${endpoint}/vods/${authService().user.username}/${props.vod.name}`, authService().user.username, authService().token)} class="hover:bg-default-50 cursor-pointer" style={{ "padding-left" : "8px" }}>
                {props.vod.name} - ({formatBytes(props.vod.size)})
                <Show when={loading()}>
                </Show>
            </li>
        </div>
    );
}

export default Vod;