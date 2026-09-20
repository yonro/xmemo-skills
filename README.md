# XMemo Skills Library (v1.2.0)

[![npm version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/yonro/xmemo-skills)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-15%2F15%20passing-brightgreen.svg)]()

[English](README.md) | [中文说明](README_CN.md)

Unified cross-agent memory skills library for **XMemo Memory OS**. This repository provides plug-and-play, runtime-agnostic agent memory skills that enable autonomous LLM agents (such as **OpenClaw**, **Hermes Agent**, **Codex**, **Antigravity**, **LangChain**, and **CrewAI**) to dynamically discover, install, and execute long-term memory operations without manual MCP plumbing.

---

## 🚀 What's New in v1.2.0

- 🔄 **Session Snapshots & Working State Recovery**: Capture point-in-time session checkpoints before compaction, handoffs, or restarts to eliminate context amnesia.
- 📋 **Cross-Agent Collaborative Action Items (TODOs)**: Create, query, and complete actionable tasks and follow-up reminders across multiple agent instances.
- 📦 **Dual Root Exports**: Native ESM support via `@xmemo/skills` or direct file import from `skills/memory-os/index.js`.
- ⚡ **Zero External Dependencies**: Implemented strictly with standard Web Fetch APIs and Node.js native test runner.

---

## 📂 Project Structure

```
xmemo-skills/
├── index.js              # Root ESM entrypoint (exports MemoryOsClient)
├── package.json          # Node.js ESM configuration (v1.2.0)
├── README.md             # English documentation
├── README_CN.md          # Chinese documentation
├── test/
│   └── client.test.js    # Comprehensive unit tests (node:test)
└── skills/
    └── memory-os/        # Core Memory OS skill package
        ├── SKILL.md      # ClawHub / OpenClaw standard agent instructions
        └── index.js      # Reference runtime integration client
```

---

## 🛠️ Direct API Tool Reference

Agents can interact directly with the XMemo Cloud API using standard HTTP requests:

| Tool Name | Method | Endpoint | Description |
|:---|:---:|:---|:---|
| `episodic_recall` | `GET` | `/api/v1/memories/search?q={query}&limit={limit}` | Semantic search across historical context and conventions |
| `save_memory` | `POST` | `/api/v1/memories` | Persist durable user habits, rules, and facts |
| `register_decision` | `POST` | `/api/v1/memory-conflicts` | Log immutable architectural decisions and tradeoffs |
| `save_snapshot` | `POST` | `/v1/restart/snapshot` | Save session restart snapshot before handoff/shutdown |
| `restore_snapshot` | `POST` | `/v1/restart/restore` | Restore previous restart snapshot to align context |
| `update_working_state` | `POST` | `/v1/update_state` | Persist real-time working task, next action, and blockers |
| `create_todo` | `POST` | `/v1/reminders` | Create collaborative cross-agent action items/reminders |
| `list_todos` | `GET` | `/v1/reminders?item_status={status}&limit={limit}` | Query open or completed TODO items |
| `complete_todo` | `POST` | `/v1/reminders/{id}/complete` | Mark action item completed with execution notes |

---

## 💻 Client Usage Example

```javascript
import { MemoryOsClient } from '@xmemo/skills';

// Initialize client (defaults to process.env.XMEMO_KEY and https://xmemo.dev)
const client = new MemoryOsClient({
  token: process.env.XMEMO_KEY,
  agentId: 'clawhub-worker',
});

// 1. Session Bootstrap: Restore state & recall conventions
const snapshot = await client.restoreSnapshot();
const memories = await client.episodicRecall('react build pipeline conventions');
const todos = await client.listTodos({ itemStatus: 'open' });

// 2. Runtime Execution: Record decisions & track action items
await client.saveMemory({
  text: 'Production builds require NODE_ENV=production and esbuild target es2022',
  category: 'workflow',
});

await client.registerDecision({
  title: 'Migrate to Vite',
  context: 'Webpack build times exceeded 3 minutes',
  resolution: 'Adopted Vite with Rollup bundling for production',
});

const newTodo = await client.createTodo({
  content: 'Verify Docker build with new Vite config',
  dueAt: '2026-10-01T12:00:00Z',
});

// Complete the task when done
await client.completeTodo({
  todoId: newTodo.id,
  note: 'Docker build succeeded with image size 48MB',
});

// 3. Graceful Handoff: Save working state & restart snapshot
await client.updateState({
  currentTask: 'Vite migration complete, awaiting staging deployment',
  nextAction: 'Deploy staging container via helm chart',
  ttlSeconds: 86400,
});

await client.saveSnapshot({
  label: 'v1.2.0 staging handoff',
  sessionId: 'session-20260920',
});
```

---

## 🧪 Testing

Run the native test suite (no external test dependencies required):

```bash
npm test
# or
node --test test/**/*.test.js
```

---

## 📄 License

MIT © [Yonro](https://github.com/yonro)
