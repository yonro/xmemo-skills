# XMemo Skills 技能库 (v1.2.0)

[![npm version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/yonro/xmemo-skills)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-15%2F15%20passing-brightgreen.svg)]()

[English](README.md) | [中文说明](README_CN.md)

**XMemo Skills** 是面向 **XMemo Memory OS** 的跨智能体通用记忆技能库。专为 **OpenClaw**、**ClawHub**、**Hermes Agent**、**Codex**、**Antigravity**、**LangChain** 等自主 AI 智能体设计，提供即插即用、跨运行时的长期记忆能力。无需手动配置复杂的 MCP 进程通信，智能体即可通过标准技能定义（`SKILL.md`）或原生客户端直接调用 XMemo 云端记忆服务。

---

## 🚀 v1.2.0 核心特性

- 🔄 **会话重启快照与工作状态恢复（Session Snapshots & State Recovery）**：在上下文压缩、智能体切换或任务中断前自动捕获快照，会话启动时无缝恢复，彻底告别“重开失忆”。
- 📋 **多智能体协同待办事项（Cross-Agent Collaborative TODOs）**：跨会话与跨 Agent 创建、检索与流转待办任务（Reminders/TODOs），形成闭环行动追踪。
- 📦 **原生双入口导出**：支持通过包名 `@xmemo/skills` 直接导入，亦支持在沙箱环境中按相对路径引用 `skills/memory-os/index.js`。
- ⚡ **零第三方依赖**：纯原生 Web Fetch API 与 Node.js 内置测试套件实现，极致轻量安全。

---

## 📂 仓库目录结构

```
xmemo-skills/
├── index.js              # 根目录 ESM 入口（统一导出 MemoryOsClient）
├── package.json          # Node.js ESM 配置文件（v1.2.0）
├── README.md             # 英文文档
├── README_CN.md          # 中文文档
├── test/
│   └── client.test.js    # 单元测试套件（使用原生 node:test）
└── skills/
    └── memory-os/        # 核心 Memory OS 技能包
        ├── SKILL.md      # ClawHub / OpenClaw 标准 Agent 技能指令与工具定义
        └── index.js      # 运行时参考客户端实现
```

---

## 🛠️ API 工具映射清单

智能体可通过原生 HTTP 直接与 XMemo 云端 API 交互：

| 工具名称 (Tool) | 请求方式 | 接口路径 (Endpoint) | 功能说明 |
|:---|:---:|:---|:---|
| `episodic_recall` | `GET` | `/api/v1/memories/search?q={query}&limit={limit}` | 语义化检索历史记忆、用户偏好与工程规范 |
| `save_memory` | `POST` | `/api/v1/memories` | 持久化保存用户习惯、项目规则与关键事实 |
| `register_decision` | `POST` | `/api/v1/memory-conflicts` | 记录不可变的技术架构决策与选型权衡 |
| `save_snapshot` | `POST` | `/v1/restart/snapshot` | 会话交接/退出前保存当前状态快照 |
| `restore_snapshot` | `POST` | `/v1/restart/restore` | 会话冷启动或唤醒时恢复历史快照对齐上下文 |
| `update_working_state` | `POST` | `/v1/update_state` | 实时持久化当前任务目标、下一步行动与阻塞原因 |
| `create_todo` | `POST` | `/v1/reminders` | 创建跨智能体待办任务与提醒事项 |
| `list_todos` | `GET` | `/v1/reminders?item_status={status}&limit={limit}` | 查询未完成或全部协同待办事项 |
| `complete_todo` | `POST` | `/v1/reminders/{id}/complete` | 标记待办事项完成，并附带执行成果说明 |

---

## 💻 客户端调用示例

```javascript
import { MemoryOsClient } from '@xmemo/skills';

// 初始化客户端（自动读取环境变量 XMEMO_KEY，默认服务地址 https://xmemo.dev）
const client = new MemoryOsClient({
  token: process.env.XMEMO_KEY,
  agentId: 'clawhub-worker',
});

// 1. 会话初始化：恢复历史快照并检索相关规范
const snapshot = await client.restoreSnapshot();
const memories = await client.episodicRecall('react build pipeline conventions');
const pendingTodos = await client.listTodos({ itemStatus: 'open' });

// 2. 运行时执行：记录架构决策与任务拆解
await client.saveMemory({
  text: '生产环境构建必须强制开启 NODE_ENV=production 并以 es2022 为目标',
  category: 'workflow',
});

await client.registerDecision({
  title: '技术栈迁移至 Vite',
  context: '原有 Webpack 打包耗时超过 3 分钟',
  resolution: '全面迁移到 Vite + Rollup 进行生产构建',
});

const todo = await client.createTodo({
  content: '验证全新 Vite 配置下的 Docker 镜像构建流程',
  dueAt: '2026-10-01T12:00:00Z',
});

// 任务完成时标记
await client.completeTodo({
  todoId: todo.id,
  note: 'Docker 构建通过，镜像体积缩减至 48MB',
});

// 3. 优雅下线/交接：写入当前工作状态并生成会话快照
await client.updateState({
  currentTask: 'Vite 迁移完成，等待准发布环境验证',
  nextAction: '通过 Helm Chart 部署到预发集群',
  ttlSeconds: 86400,
});

await client.saveSnapshot({
  label: 'v1.2.0 预发交接快照',
  sessionId: 'session-20260920',
});
```

---

## 🧪 运行测试

使用 Node.js 原生测试器运行全部单元测试（无额外依赖）：

```bash
npm test
# 或
node --test test/**/*.test.js
```

---

## 📄 开源许可

MIT License © [Yonro](https://github.com/yonro)
