import {Component, createResource, createSignal, For, Show} from "solid-js";
import { AuthService } from "../store/AuthService";
import {useService} from "solid-services";
import LoadingSpinner from "./loadingSpinner";

const ViewerAccess: Component = () => {

    const authService = useService(AuthService);

    const [viewers, { refetch }] = createResource(() => {
        return authService().allowedUsers();
    });

    const [loading, setLoading] = createSignal(false)
    const [error, setError] = createSignal(false)

    function togglePermission(el, viewer) {
        const checked = el.target.checked;
        authService().setViewerPermission(viewer.username, checked)
            .then(_ => refetch())
            .then(() => setLoading(false))
            .catch(() => {
                setLoading(false)
                setError(true);
            });
    }

    function togglePublic(el) {
        const checked = el.target.checked;
        authService().setPublic(checked)
            .then(_ => authService().authMe())
            .then(() => setLoading(false))
            .then(() => el.target.removeAttribute('disabled'))
            .catch(e => {
                console.error(e);
                setLoading(false);
                setError(true);
            })
    }

    const errorFallback = <div>Error</div>

    const fallback = <Show when={error() == false} fallback={errorFallback}>
        <div style={{'text-align': 'center', 'font-size': '5rem'}} />
    </Show>;

    return (
        <>
            <div>

                <Show when={loading()}>
                    <div class="flex items-center justify-center w-full mb-4">
                        <LoadingSpinner></LoadingSpinner>
                    </div>
                </Show>

                <label class="flex items-center cursor-pointer">
                    <div class="relative">
                        <input type="checkbox" class="sr-only" checked={authService().user.public}
                               onclick={(el) => {
                                   el.target.setAttribute('disabled', '');
                                   setLoading(true);
                                   togglePublic(el)
                               }}/>

                        <div class="block bg-gray-600 w-14 h-8 rounded-full"/>
                        <div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"/>
                    </div>

                    <div class="ml-3 text-default-700 font-medium">
                        Public Stream
                    </div>
                </label>

                <p class="text-lg font-light leading-relaxed mt-6 mb-4 text-default-800">
                            Nichts ausgewählt: Für alle zugreifbar
                    <br />
                            Mindestens ein user ausgewählt: Nur für ausgewählte Accounts zugreifbar
                </p>
                    <Show when={(!viewers.loading || typeof viewers() === 'string') && error() == false} fallback={fallback}>

                        <div>
                            <For each={viewers()}>
                                {(viewer) =>
                                    <div>

                                        <div class="flex items-start justify-start w-full mb-4">

                                            <label class="flex items-center cursor-pointer">

                                                <div class="relative">
                                                    <input type="checkbox" class="sr-only" checked={viewer.permitted}
                                                           onclick={(el) => {
                                                               el.target.setAttribute('disabled', '');
                                                               setLoading(true);
                                                               togglePermission(el, viewer.user);
                                                           }}/>

                                                    <div class="block bg-gray-600 w-14 h-8 rounded-full"></div>

                                                    <div
                                                        class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                                                </div>

                                                <div class="ml-3 text-default-700 font-medium">
                                                    {viewer.user.username}
                                                </div>
                                            </label>

                                        </div>

                                    </div>
                                }
                            </For>
                        </div>
                    </Show>
            </div>
        </>
    );

}

export default ViewerAccess;