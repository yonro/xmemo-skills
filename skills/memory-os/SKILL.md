---
name: xmemo-memory-os
description: Advanced long-term memory integration skill for agentic workflows. Direct access to episodic recall, semantic decision tracing, and transaction ledgers.
version: 1.0.0
author: Yonro
---

# XMemo Memory OS Skill

This skill equips any advanced LLM agent with direct, autonomous access to XMemo's cloud-based long-term memory system.

## 🛠️ Tool Definitions

### 1. `episodic_recall`
- **Description**: Retrieve relevant historic memories, user preferences, code conventions, or past decisions based on a semantic query.
- **Parameters**:
  - `query` (string, required): The search query to retrieve memories for.
  - `limit` (integer, optional): Max memories to retrieve. Default is 5.
- **Endpoint**: `GET /api/v1/memories/search?q={query}&limit={limit}`

### 2. `save_memory`
- **Description**: Automatically record durable facts, user habits, workspace conventions, or architecture guidelines established during the conversation. Do not wait for the user to explicitly ask to remember.
- **Parameters**:
  - `text` (string, required): The memory content to save.
  - `category` (string, required): One of 'code', 'context', 'preference', or 'workflow'.
- **Endpoint**: `POST /api/v1/memories`

### 3. `register_decision`
- **Description**: Log a key architectural decision, architectural tradeoff, or project-level resolution to the cloud-based immutable ledger for synchronization.
- **Parameters**:
  - `title` (string, required): Brief title of the decision.
  - `context` (string, required): Background context or problem description.
  - `resolution` (string, required): The chosen technical solution or design tradeoff.
- **Endpoint**: `POST /api/v1/memory-conflicts`

---

## 🧠 System Prompt Directives (LLM Instruction Rules)

When this skill is loaded, the host Agent must strictly adhere to the following memory synchronization directives:

1.  **Recall First**: At the start of a session, or when the user mentions a specific project, technology stack, or task area, always invoke `episodic_recall` first to align with historical memories. Do not start from a blank slate.
2.  **Save as You Go**: When the user establishes a new convention, config path, personal preference, or engineering rule, autonomously invoke `save_memory` to persist it in the cloud.
3.  **Trace Decisions**: When resolving significant architectural design questions, always call `register_decision` to establish a durable, searchable log of engineering trades.
