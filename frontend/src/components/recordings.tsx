import {Component, createResource, createSignal, JSX, onCleanup, Show} from "solid-js";
import {useService} from "solid-services";
import {RecordService} from "../store/RecordService";
import {Recording} from "../types/user.interface";
import {AuthService} from "../store/AuthService";
import {PlayerProps} from "../Player";
import Vod from "./vod";

export interface RecordingProps {
    token: string,
}

const Recordings: Component<PlayerProps & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {

    const recordService = useService(RecordService)
    const authService = useService(AuthService)

    const [firstRecordStart, setFirstRecordStart] = createSignal("first");

    const [status, { refetch }] = createResource(() => {
        return recordService().status(authService().user.username, authService().token)
            .then((result) => {
                if (result.length == 0 || (result.length === 1 && result[0].state === "stopped")) {
                    setFirstRecordStart("stopped");
                } else {
                    setFirstRecordStart("recording");
                }
                return result;
            })
    });


    const [vods, { }] = createResource(firstRecordStart, () => {
        return recordService().vods(authService().user.username, props.token);
    });

    const i = setInterval(() => refetch(), 5000);
    onCleanup(() => clearInterval(i));

    function msToHMS( ms: number ) {
        // 1- Convert to seconds:
        let seconds = ms / 1000;
        // 2- Extract hours:
        const hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
        seconds = seconds % 3600; // seconds remaining after extracting hours
        // 3- Extract minutes:
        const minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
        // 4- Keep only seconds not extracted to minutes:
        seconds = seconds % 60;
        return hours+"Stunden "+minutes+"Minuten "+seconds.toFixed(0)+"Sekunden";
    }

    const start = <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onclick={ () => recordService().startRecord(authService().user.username, authService().token).then(() => refetch())}>Start Recording</button>;

    return (
        <>

            <Show when={status()}>
                { () => {
                    const st: Recording = status()[0];
                    return <ul>
                        <li>State: {st.state}</li>
                        <Show when={st.totalRecordTime != undefined}>
                            <li>Recordingtime: {msToHMS(st.totalRecordTime)}</li>
                        </Show>
                        <Show when={st.totalRecordBytes != undefined}>
                            <li>Size: {(st.totalRecordBytes * (8) / (8*1024*1024)).toFixed(2)  } MiB </li>
                        </Show>
                    </ul>;
                }}
            </Show>

            <span>
                <Show when={status()} fallback={start}>
                    <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onclick={ () => recordService().stopRecord(authService().user.username, authService().token).then(() => refetch())}>Stop Recording</button>
                </Show>
            </span>
            <div class="items-center">
                <Show when={vods()}>
                    <div class="flex justify-center">
                        <div class="bg-default-400 shadow-xl rounded-lg">
                            <ul class="divide-y divide-default-800">
                                {vods().map(vod => <Vod vod={vod}></Vod>)}
                            </ul>
                        </div>
                    </div>

                </Show>
            </div>
        </>
    );
};

export default Recordings;