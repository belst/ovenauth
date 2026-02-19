alter table options
add column if not exists emote_id text;

alter table options
alter column name drop not null;
