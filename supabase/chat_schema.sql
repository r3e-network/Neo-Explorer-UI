create extension if not exists pgcrypto;

create table if not exists chat_challenges (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  nonce text not null,
  message text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_challenges_address on chat_challenges(address, created_at desc);
create index if not exists idx_chat_challenges_expires on chat_challenges(expires_at desc);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  participant_low_address text not null,
  participant_high_address text not null,
  participant_low_label text,
  participant_high_label text,
  last_message_preview text,
  last_sender_address text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_low_address, participant_high_address)
);

create index if not exists idx_chat_rooms_last_message on chat_rooms(last_message_at desc nulls last);
create index if not exists idx_chat_rooms_participant_low on chat_rooms(participant_low_address);
create index if not exists idx_chat_rooms_participant_high on chat_rooms(participant_high_address);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  sender_address text not null,
  recipient_address text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint chat_messages_nonempty_body check (char_length(btrim(body)) > 0),
  constraint chat_messages_body_length check (char_length(body) <= 2000)
);

create index if not exists idx_chat_messages_room on chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_recipient_read on chat_messages(recipient_address, read_at, created_at desc);

comment on table chat_rooms is 'Canonical 1:1 NeoChat rooms keyed by sorted participant addresses.';
comment on table chat_messages is 'Persistent peer-to-peer NeoChat messages with read markers.';
