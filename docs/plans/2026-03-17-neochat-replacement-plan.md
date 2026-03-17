# NeoChat Replacement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the external NGD NeoChat link with an in-product, Supabase-backed 1:1 chat system with one-time wallet-auth sessions, unread notifications, canonical rooms, and persistent history.

**Architecture:** Add a small Vercel API layer for one-time wallet challenge verification plus authenticated chat CRUD, store canonical room/message state in Supabase, and build a Vue chat page with an inbox sidebar and unread notification badge in the header. Rooms are network-agnostic and canonicalized by sorted participant addresses, so `A<->B` and `B<->A` resolve to the same room row.

**Tech Stack:** Vue 3, Vue Router, Vercel serverless API routes, Supabase Postgres, `@cityofzion/neon-js` signature verification, existing wallet service/sign-message flow.

### Task 1: Add Chat Schema and Server Utilities

**Files:**
- Create: `supabase/chat_schema.sql`
- Create: `api/lib/chatAuth.js`
- Create: `api/lib/chatSupabase.js`
- Test: `tests/api/chatAuth.spec.js`

**Step 1: Write the failing auth utility tests**

Cover:
- canonical room keys sort two addresses deterministically
- challenge token/session token signing and verification
- Neo message verification accepts matching signature/public key and rejects mismatches

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/chatAuth.spec.js`
Expected: FAIL because the auth helper files do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- challenge creation with nonce + short expiry
- session cookie signing with HMAC secret
- canonical pair helpers
- Supabase admin client wrapper using `SUPABASE_SERVICE_ROLE_KEY`
- SQL schema for:
  - `chat_challenges`
  - `chat_rooms`
  - `chat_messages`
  - indexes and unique `(participant_low_address, participant_high_address)`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/chatAuth.spec.js`
Expected: PASS

### Task 2: Add Authenticated Chat API Routes

**Files:**
- Create: `api/chat/auth/challenge.js`
- Create: `api/chat/auth/verify.js`
- Create: `api/chat/session.js`
- Create: `api/chat/rooms.js`
- Create: `api/chat/ensure-room.js`
- Create: `api/chat/messages.js`
- Create: `api/chat/read.js`
- Create: `api/chat/notifications.js`
- Test: `tests/api/chatApi.spec.js`

**Step 1: Write the failing API tests**

Cover:
- challenge route returns a signable message for a valid address
- verify route sets a session cookie only for a valid signature
- ensure-room returns the same room for `A,B` and `B,A`
- send-message writes a message with sender from the verified session, not client input
- read route marks unread inbound messages as read
- notifications route returns unread counts and latest unread items

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/chatApi.spec.js`
Expected: FAIL because the routes do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- cookie-backed chat session
- room upsert by canonical pair
- history fetch ordered by `created_at`
- unread detection via `read_at is null`
- mark-read updates only inbound messages for the current user

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/chatApi.spec.js`
Expected: PASS

### Task 3: Add Frontend Chat Services and Session Bootstrap

**Files:**
- Create: `src/services/chatService.js`
- Create: `src/composables/useChatSession.js`
- Modify: `src/services/index.js`
- Modify: `src/components/layout/AppHeader.vue`
- Test: `tests/services/chatService.spec.js`
- Test: `tests/components/AppHeaderChat.spec.js`

**Step 1: Write the failing client tests**

Cover:
- one-time chat auth uses `walletService.signMessage()` and stores session state
- no automatic re-sign on passive page restore when session cookie is already valid
- header unread badge fetches notifications only when a chat session exists
- explicit wallet connect triggers chat auth bootstrap

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/services/chatService.spec.js tests/components/AppHeaderChat.spec.js`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- `chatService` fetch wrappers for auth/session/rooms/messages/read/notifications
- `useChatSession()` reactive state for session, unread count, latest notifications
- header badge/dropdown notification UI
- one-time auth bootstrap after explicit wallet connect
- graceful unsupported-provider handling for providers that do not expose verifiable Neo public keys

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/services/chatService.spec.js tests/components/AppHeaderChat.spec.js`
Expected: PASS

### Task 4: Replace External NeoChat with Internal Chat Route

**Files:**
- Create: `src/views/Chat/ChatPage.vue`
- Create: `src/views/Chat/components/ChatSidebar.vue`
- Create: `src/views/Chat/components/ChatThread.vue`
- Modify: `src/router/index.js`
- Modify: `src/components/common/HashLink.vue`
- Test: `tests/views/ChatPage.spec.js`
- Test: `tests/components/HashLink.spec.js`

**Step 1: Write the failing UI tests**

Cover:
- `HashLink` address chat icon routes to internal `/chat?with=<address>`
- chat page loads canonical room by address/domain target
- opening a room loads history and marks unread messages read
- sending a message appends to the same room instead of creating duplicates
- entering `/chat?with=A` then `/chat?with=B` updates the selected conversation correctly

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/views/ChatPage.spec.js tests/components/HashLink.spec.js`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- `/chat` route
- peer resolver for address or domain input using existing `nnsService`
- room sidebar + thread pane
- history load on room open
- composer limited to plain text v1
- replace external `chat.neo.org` anchor with internal router navigation

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/views/ChatPage.spec.js tests/components/HashLink.spec.js`
Expected: PASS

### Task 5: Verify End-to-End and Document Setup

**Files:**
- Modify: `README.md`
- Modify: `.env.example` or deployment docs if present
- Test: focused runtime verification

**Step 1: Add setup docs**

Document:
- required env vars:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CHAT_SESSION_SECRET`
- SQL schema apply step
- supported wallet providers for chat auth v1

**Step 2: Run focused verification**

Run:
- `npm test -- tests/api/chatAuth.spec.js tests/api/chatApi.spec.js tests/services/chatService.spec.js tests/components/AppHeaderChat.spec.js tests/views/ChatPage.spec.js tests/components/HashLink.spec.js`
- `npm run build`

Expected:
- all focused tests pass
- build succeeds

**Step 3: Real browser verification**

Validate:
- connect wallet
- complete one-time chat auth
- send message to another address/domain
- unread badge appears for recipient after auth
- clicking notification opens same canonical room
- reopening room loads prior history and does not duplicate notifications
