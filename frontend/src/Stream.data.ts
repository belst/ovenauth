import { createResource } from "solid-js";

export type PublicStreamOptions = {
  name?: string,
  emote_id?: string,
};

type Owner = {
  id: string,
  username: string,
  display_name: string,
  avatar_url: string,
  style: unknown,
  roles: Array<string>
};

type File = {
  name: string,
  static_name: string,
  width: number,
  height: number,
  frame_count: number,
  size: number,
  format: 'AVIF' | 'WEBP'
};

type EmoteData = {
  id: string,
  name: string,
  state: Array<string>,
  listed: boolean,
  animated: boolean,
  owner: Owner,
  host: {
    url: string,
    files: Array<File>
  }
};

type Emote = {
  id: string,
  name: string,
  flags: number,
  timestamp: number,
  actor_id: unknown,
  data: EmoteData
};

export type EmoteSet = {
  id: string,
  name: string,
  flags: number,
  tags: Array<unknown>,
  immutable: boolean,
  privileged: boolean
  emotes: Array<Emote>,
  emote_count: number,
  capacity: number,
  owner: Owner,
};

async function getEmotes(streamInfo: PublicStreamOptions): Promise<EmoteSet> {
  if (streamInfo.emote_id) {
    return await fetch(`https://7tv.io/v3/emote-sets/${streamInfo.emote_id}`)
      .then(b => b.json());
  }
  return ({
    id: '',
    name: '',
    flags: 0,
    tags: [],
    immutable: false,
    privileged: false,
    emotes: [],
    emote_count: 0,
    capacity: 1000,
    owner: {
      id: '',
      username: '',
      display_name: '',
      avatar_url: '',
      style: {},
      roles: []
    }
  })
}

async function getStreamInfo(user: string): Promise<PublicStreamOptions> {
  const url = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + import.meta.env.VITE_APIPATH + '/stream/' + user;

  return await fetch(url).then(r => r.json());
}
export default function StreamData({ params }) {
  const [streamInfo] = createResource(() => params.user, getStreamInfo);
  const [emoteSet] = createResource(streamInfo, getEmotes);
  const [globalEmoteSet] = createResource(() => getEmotes({ emote_id: 'global' }));

  return { streamInfo, emoteSet, globalEmoteSet };
}

