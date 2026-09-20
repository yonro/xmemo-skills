---
name: xmemo-memory-os
description: Advanced long-term memory, session state recovery, and cross-agent collaborative TODOs integration skill for agentic workflows. Direct HTTP access to episodic recall, state checkpointing, and task tracking.
version: 1.2.0
author: Yonro
---

# XMemo Memory OS Skill (v1.2.0)

This skill equips any LLM agent (OpenClaw, Hermes, Codex, LangChain, Antigravity) with direct, autonomous access to XMemo's cloud-based long-term memory, session snapshot recovery, and cross-agent collaborative action items.

## 🛠️ Tool Definitions

### 1. `episodic_recall`
- **Description**: Retrieve relevant historic memories, user preferences, code conventions, or past decisions based on semantic search.
- **Parameters**:
  - `query` (string, required): The search query to retrieve memories for.
  - `limit` (integer, optional): Max memories to retrieve. Default is 5.
- **Endpoint**: `GET /api/v1/memories/search?q={query}&limit={limit}`

### 2. `save_memory`
- **Description**: Autonomously record durable facts, user habits, workspace conventions, or architecture guidelines established during the conversation.
- **Parameters**:
  - `text` (string, required): The memory content to save.
  - `category` (string, required): One of `'code'`, `'context'`, `'preference'`, or `'workflow'`.
- **Endpoint**: `POST /api/v1/memories`

### 3. `register_decision`
- **Description**: Log a key architectural decision, technical tradeoff, or design resolution to the cloud-based immutable ledger.
- **Parameters**:
  - `title` (string, required): Brief title of the decision.
  - `context` (string, required): Background context or problem description.
  - `resolution` (string, required): The chosen technical solution or design tradeoff.
- **Endpoint**: `POST /api/v1/memory-conflicts`

### 4. `save_snapshot`
- **Description**: Capture a session restart snapshot before shutdown, compaction, or agent handoff so the session can resume without context amnesia.
- **Parameters**:
  - `label` (string, optional): Human-readable label for the snapshot (e.g., `'before refactor handoff'`).
  - `bucket` (string, optional): Target memory bucket (default: `'work'`).
  - `scope` (string, optional): Scope identifier (default: `'default'`).
  - `session_id` (string, optional): Specific session identifier.
- **Endpoint**: `POST /v1/restart/snapshot`

### 5. `restore_snapshot`
- **Description**: Restore a previously captured session restart snapshot to align context upon session startup or agent restart.
- **Parameters**:
  - `snapshot_id` (string, optional): Specific snapshot ID to restore. If omitted, restores the latest active snapshot.
  - `bucket` (string, optional): Target memory bucket.
  - `scope` (string, optional): Scope identifier.
- **Endpoint**: `POST /v1/restart/restore`

### 6. `update_working_state`
- **Description**: Persist active working state with TTL for seamless inter-agent handoff and resume.
- **Parameters**:
  - `current_task` (string, optional): Description of the task currently in progress.
  - `next_action` (string, optional): Immediate next step to be executed.
  - `blocked_reason` (string, optional): Details on any blocking dependencies or errors.
  - `state_key` (string, optional): State key identifier (default: `'active_task'`).
  - `content` (string, optional): Freeform markdown or structured state details.
  - `ttl_seconds` (integer, optional): Expiration time in seconds (default: `86400`).
- **Endpoint**: `POST /v1/update_state`

### 7. `create_todo`
- **Description**: Create an actionable TODO or follow-up reminder for the current agent or cross-agent collaborators.
- **Parameters**:
  - `content` (string, required): Action item or reminder description.
  - `due_at` (string, optional): ISO 8601 due timestamp.
  - `session_id` (string, optional): Session identifier.
  - `bucket` (string, optional): Target memory bucket.
  - `scope` (string, optional): Scope identifier.
- **Endpoint**: `POST /v1/reminders`

### 8. `list_todos`
- **Description**: Query open or completed collaborative TODO items across sessions and agents.
- **Parameters**:
  - `item_status` (string, optional): Status filter (`'open'`, `'completed'`, or `'%'`). Default is `'open'`.
  - `limit` (integer, optional): Maximum items to return (default: `20`).
  - `bucket` (string, optional): Target memory bucket.
  - `scope` (string, optional): Scope identifier.
- **Endpoint**: `GET /v1/reminders?item_status={status}&limit={limit}`

### 9. `complete_todo`
- **Description**: Mark a TODO item as completed with optional resolution notes.
- **Parameters**:
  - `todo_id` (string, required): The unique identifier of the TODO item.
  - `note` (string, optional): Completion notes or summary of execution.
- **Endpoint**: `POST /v1/reminders/{todo_id}/complete`

---

## 🧠 System Prompt Directives (LLM Instruction Rules)

When this skill is loaded, the host Agent MUST strictly adhere to the three-phase memory lifecycle:

### Phase 1: Boot & Alignment (Session Startup)
1. **Restore Snapshot First**: At session launch or after a context reset, call `restore_snapshot` or inspect working state to retrieve the last verified execution context.
2. **Contextual Recall**: When the user specifies a project, tool, or domain, invoke `episodic_recall` to load past conventions and preferences.
3. **Review Action Items**: Invoke `list_todos` with `item_status="open"` to verify existing pending commitments before accepting new tasks.

### Phase 2: Runtime Execution (Active Workflow)
4. **Proactive Memory Capture**: Do not wait for the user to say "remember this". When a durable pattern, rule, or preference is established, autonomously call `save_memory`.
5. **Architectural Traceability**: Log key technical decisions, tradeoffs, and structural resolutions via `register_decision`.
6. **Task Decomposition**: Break complex multi-step instructions into collaborative action items with `create_todo`, and mark them done with `complete_todo` upon milestone completion.

### Phase 3: Handoff & Compaction (Graceful Shutdown)
7. **Persist Working State**: Before pausing, compaction, or exiting, call `update_working_state` with `current_task`, `next_action`, and any `blocked_reason`.
8. **Capture Restart Snapshot**: Invoke `save_snapshot` with a descriptive label to guarantee zero context amnesia for future agent sessions.
