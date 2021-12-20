create table tokens (
    user_id integer not null references users (id) on delete cascade on update cascade,
    token text not null primary key,
    name text not null
);
