export interface IUser {
    id: number;
    username: string;
    hidden: boolean;
    public: boolean;
}

export interface UserPermission {
    user: IUser,
    permitted: boolean
}

export interface IStreamOption {
    token: string;
    user_id: number;
    name: string;
}

export interface Recording {
    app: string,
    createdTime: string,
    finishTime: string,
    id: string,
    outputFilePath?: string,
    outputInfoPath?: string,
    schedule: string,
    segmentationRule: string,
    sequence?: number,
    startTime?: string,
    state: string,
    stream: Stream,
    totalRecordBytes?: number,
    totalRecordTime?: number,
    vhost: string
}

export interface Stream {
    name: string,
    tracks: string[]
}

export interface VodInfo {
    name: string,
    type: string,
    mtime: string,
    size: number
}
