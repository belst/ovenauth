import { Navigate } from "@solidjs/router";
import { Component, createMemo, createResource, createSignal, Show } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";
import Title from "./Title";

const Dashboard: Component = () => {

  const authService = useService(AuthService);
  const [options, { refetch, mutate }] = createResource(() => {
    return authService().client.common.options();
  });

  const [inputtype, setInputtype] = createSignal('password');

  const toggletype = () => inputtype() === 'password' ? setInputtype('text') : setInputtype('password');

  const reset = () =>
    authService().client.common.reset()
      .then(refetch);
  
  const [emoteIdLoading, setEmoteIdLoading] = createSignal(false);
  const update_emote_id = async () => {
    setEmoteIdLoading(true);
    await authService().client.common.set_emote_id(emote_id_input.value.trim());
    setEmoteIdLoading(false);
  }

  const set_visibility = (e: Event) => authService().client.common.set_public((e.currentTarget as HTMLInputElement).checked).then(mutate);
  const update_title = () => authService().client.common.set_name(title_input.value.trim()).then(mutate);

  const visibleicon = (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );

  const visibleofficon = (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">
      <path d="M0 0h24v24H0zm0 0h24v24H0zm0 0h24v24H0zm0 0h24v24H0z" fill="none" />
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </svg>
  );

  const icon = createMemo(() => {
    return inputtype() === 'password' ? visibleicon : visibleofficon;
  });

  let tokeninput: HTMLInputElement;
  let emote_id_input: HTMLInputElement;
  let title_input: HTMLInputElement;

  const copy = () => {
    navigator.clipboard.writeText(tokeninput.value);
  }

  return (
    <>
      <Show when={authService().user === null}>
        <Navigate href="/login" state={{ redirectTo: '/dashboard' }} />
      </Show>
      <Title value="Dashboard" />
      <Layout>
        <div class="rounded-box p-4 shadow bg-base-200 grid grid-cols-1 lg:grid-cols-2 items-center gap-1">

          <h3 class="text-xl py-4">Stream Token</h3>
          <div class="join">
            <input ref={tokeninput} class="input font-mono box-content input-bordered join-item w-[38ex]" type={inputtype()} readonly value={options()?.token || 'Create Token'} />
            <button type="button" onclick={toggletype} class="join-item btn btn-primary">{icon()}</button>
            <button type="button" onclick={copy} class="join-item btn btn-primary">Copy</button>
            <button type="button" onclick={reset} class="join-item btn btn-primary">{options() ? 'reset' : 'create'}</button>
          </div>

          <h3 class="text-xl py-4">7TV.APP Emote Set ID</h3>
          <div class="join">
            <input ref={emote_id_input} class="input input-bordered join-item box-content" placeholder="7TV Emoteset ID" value={options()?.emote_id ?? ''} />
            <button type="button" onclick={update_emote_id} disabled={emoteIdLoading()} class="join-item btn btn-primary">Save</button>
          </div>

          <h3 class="text-xl py-4">Stream Title</h3>
          <div class="join">
            <input ref={title_input} class="input input-bordered join-item box-content w-full" placeholder="Stream Title" value={options()?.name ?? ''} />
            <button type="button" onclick={update_title} class="join-item btn btn-primary">Save</button>
          </div>

          <h3 class="text-xl py-4">Public?</h3>
          <input type="checkbox" class="toggle toggle-primary toggle-lg" onchange={set_visibility} checked={options()?.public ?? true} />
        </div>
      </Layout>
    </>
  );
}

export default Dashboard;
