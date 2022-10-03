import { ovenAuthClient } from './api';
import {Recording, VodInfo} from "../types/user.interface";

export function RecordService() {
    const endpoint = import.meta.env.VITE_PROTOCOL + import.meta.env.VITE_BASEURL + (import.meta.env.VITE_APIPATH || '');
    const client = ovenAuthClient(endpoint);

    return {
        startRecord(stream: string, token: string): Promise<void> {
            return client.record.startRecord(stream, token);
        },
        stopRecord(stream: string, token: string): Promise<void> {
            return client.record.stopRecord(stream, token);
        },
        status(stream: string, token: string): Promise<Recording[]> {
            return client.record.status(stream, token);
        },
        vods(stream: string, token: string): Promise<VodInfo[]> {
            return client.record.getVods(stream, token);
        }
    }
}
