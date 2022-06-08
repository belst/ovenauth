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
