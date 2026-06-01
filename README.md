# XMemo Skills Library

Unified cross-agent memory skills library for XMemo Memory OS. This repository hosts plug-and-play, runtime-agnostic memory integration skills that allow AI agents to dynamically discover, install, and execute long-term memory operations without manual MCP setup.

## 🌟 Key Concepts

1.  **Agent Self-Installation**: Instead of complex global network configuration, agents can scan their project directories for standard `skills/` metadata files and natively import memory tools at runtime.
2.  **Runtime-Agnostic standard**: Supports both Python and Node.js-based AI orchestrations (e.g. LangChain, CrewAI, AutoGen, Codex, Antigravity) via a unified `SKILL.md` format.
3.  **Low-Latency execution**: Direct HTTP-backed tool definitions that bypass stdio IPC bottlenecks, ideal for sandboxed environments.

## 📂 Project Structure

```
xmemo-skills/
├── package.json          # Node.js ESM configuration
├── README.md             # Project documentation
└── skills/               # Standard skill registry
    └── memory-os/        # Core Memory OS integration skill
        ├── SKILL.md      # Tool definitions and instruction rules
        └── index.js      # Reference runtime integration client
```

## 🛠️ Direct API Tool Integration Reference

The skills in this library utilize XMemo's high-performance memory endpoints. Agents can natively execute operations via simple HTTP calls:

-   **Recall Memories**: `GET /api/v1/memories/search?q=<query>`
-   **Save Memories**: `POST /api/v1/memories`
-   **Trace Decisions**: `POST /api/v1/memory-conflicts`

For static credentials, the API expects standard `Authorization: Bearer <XMEMO_KEY>` headers.
