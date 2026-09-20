/**
 * XMemo Memory OS Skill — Reference Integration Client
 * 
 * Provides runtime helper functions for AI agents to communicate with XMemo's
 * cloud memory services using standard fetch APIs.
 * 
 * Version: 1.2.0
 */

const DEFAULT_BASE_URL = 'https://xmemo.dev';

export class MemoryOsClient {
  constructor({
    token,
    baseUrl = DEFAULT_BASE_URL,
    agentId = 'xmemo-skills-js',
    agentInstanceId,
    defaultBucket = 'work',
    defaultScope = 'default',
  } = {}) {
    this.token = token || (typeof process !== 'undefined' ? process.env?.XMEMO_KEY : undefined);
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.agentId = agentId;
    this.agentInstanceId = agentInstanceId || (typeof process !== 'undefined' ? process.env?.XMEMO_AGENT_INSTANCE_ID : '') || '';
    this.defaultBucket = defaultBucket;
    this.defaultScope = defaultScope;

    if (!this.token) {
      throw new Error('Authorization token (XMEMO_KEY) is required for XMemo Skills.');
    }
  }

  _getHeaders(extraHeaders = {}) {
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'X-Memory-OS-Agent-ID': this.agentId,
      ...extraHeaders,
    };
    if (this.agentInstanceId) {
      headers['X-Memory-OS-Agent-Instance-ID'] = this.agentInstanceId;
    }
    return headers;
  }

  async _request(path, { method = 'GET', body, query, headers = {} } = {}) {
    let url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const options = {
      method,
      headers: this._getHeaders(headers),
    };

    if (body !== undefined) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`XMemo API request failed [${response.status} ${response.statusText}] for ${method} ${path}: ${errorMsg}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }

  // =========================================================================
  // Module 0: Core Memory & Episodic Recall (v1.0.0 Compatibility)
  // =========================================================================

  /**
   * Search and recall memories from XMemo Memory OS
   * @param {string} query Search query string
   * @param {number} limit Maximum memories to return (default: 5)
   */
  async episodicRecall(query, limit = 5) {
    return await this._request('/api/v1/memories/search', {
      method: 'GET',
      query: { q: query, limit },
    });
  }

  /**
   * Save a memory to XMemo Memory OS
   * @param {Object} params
   * @param {string} params.text Memory content
   * @param {string} [params.category='context'] 'code' | 'context' | 'preference' | 'workflow'
   */
  async saveMemory({ text, category = 'context' }) {
    return await this._request('/api/v1/memories', {
      method: 'POST',
      body: { text, category },
    });
  }

  /**
   * Register a key decision to the memory ledger
   * @param {Object} params
   * @param {string} params.title Decision title
   * @param {string} params.context Background context
   * @param {string} params.resolution Resolution or tradeoff
   */
  async registerDecision({ title, context, resolution }) {
    return await this._request('/api/v1/memory-conflicts', {
      method: 'POST',
      body: { title, context, resolution },
    });
  }

  // =========================================================================
  // Module 1: Session Snapshots & Working State Recovery (v1.2.0)
  // =========================================================================

  /**
   * Capture a session restart snapshot before shutdown, compaction, or handoff.
   * @param {Object} [params]
   * @param {string} [params.label] Human-readable snapshot description/label
   * @param {string} [params.bucket] Memory bucket (default: 'work')
   * @param {string} [params.scope] Scope identifier (default: 'default')
   * @param {string} [params.sessionId] Unique session identifier
   * @param {string} [params.stateKey] State key identifier (e.g. 'active_task')
   * @param {Object} [params.metadata] Optional additional metadata
   */
  async saveSnapshot({
    label,
    bucket = this.defaultBucket,
    scope = this.defaultScope,
    sessionId,
    stateKey,
    metadata,
  } = {}) {
    const payload = {
      bucket,
      scope,
    };
    if (label) payload.label = label;
    if (sessionId) payload.session_id = sessionId;
    if (stateKey) payload.state_key = stateKey;
    if (metadata) payload.metadata = metadata;

    return await this._request('/v1/restart/snapshot', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Restore a previously captured restart snapshot.
   * @param {Object} [params]
   * @param {string} [params.snapshotId] Specific snapshot ID to restore
   * @param {string} [params.bucket] Memory bucket
   * @param {string} [params.scope] Scope identifier
   * @param {string} [params.sessionId] Session identifier
   */
  async restoreSnapshot({
    snapshotId,
    bucket = this.defaultBucket,
    scope = this.defaultScope,
    sessionId,
  } = {}) {
    const payload = {
      bucket,
      scope,
    };
    if (snapshotId) payload.snapshot_id = snapshotId;
    if (sessionId) payload.session_id = sessionId;

    return await this._request('/v1/restart/restore', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Persist real-time working state with TTL for seamless resumption.
   * @param {Object} params
   * @param {string} [params.currentTask] Active task title or description
   * @param {string} [params.nextAction] Immediate next step to take
   * @param {string} [params.blockedReason] Reason if currently blocked
   * @param {string} [params.stateKey='active_task'] Key for state entry
   * @param {string} [params.content] Freeform markdown or JSON state content
   * @param {number} [params.ttlSeconds=86400] Expiration in seconds (default 24h)
   * @param {string} [params.bucket] Memory bucket
   * @param {string} [params.scope] Scope identifier
   */
  async updateState({
    currentTask,
    nextAction,
    blockedReason,
    stateKey = 'active_task',
    content = '',
    ttlSeconds = 86400,
    bucket = this.defaultBucket,
    scope = this.defaultScope,
  } = {}) {
    const payload = {
      state_key: stateKey,
      bucket,
      scope,
      ttl_seconds: ttlSeconds,
    };
    if (content) payload.content = content;
    if (currentTask) payload.current_task = currentTask;
    if (nextAction) payload.next_action = nextAction;
    if (blockedReason) payload.blocked_reason = blockedReason;

    return await this._request('/v1/update_state', {
      method: 'POST',
      body: payload,
    });
  }

  // =========================================================================
  // Module 2: Cross-Agent Collaborative TODOs / Action Items (v1.2.0)
  // =========================================================================

  /**
   * Create an actionable TODO or follow-up reminder.
   * @param {Object} params
   * @param {string} params.content Action item content or reminder note
   * @param {string} [params.dueAt] ISO 8601 due timestamp
   * @param {string} [params.sessionId] Session identifier
   * @param {string} [params.bucket] Memory bucket
   * @param {string} [params.scope] Scope identifier
   */
  async createTodo({
    content,
    dueAt,
    sessionId,
    bucket = this.defaultBucket,
    scope = this.defaultScope,
  } = {}) {
    if (!content) {
      throw new Error('Content is required to create a TODO item.');
    }
    const payload = {
      content,
      bucket,
      scope,
    };
    if (dueAt) payload.due_at = dueAt;
    if (sessionId) payload.session_id = sessionId;

    return await this._request('/v1/reminders', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * List open or completed collaborative TODO items.
   * @param {Object} [params]
   * @param {string} [params.itemStatus='open'] 'open' | 'completed' | '%'
   * @param {number} [params.limit=20] Max items to retrieve
   * @param {string} [params.bucket] Memory bucket
   * @param {string} [params.scope] Scope identifier
   */
  async listTodos({
    itemStatus = 'open',
    limit = 20,
    bucket = this.defaultBucket,
    scope = this.defaultScope,
  } = {}) {
    const res = await this._request('/v1/reminders', {
      method: 'GET',
      query: {
        bucket,
        scope,
        item_status: itemStatus,
        limit,
      },
    });

    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.reminders)) return res.reminders;
    if (res && Array.isArray(res.items)) return res.items;
    return [];
  }

  /**
   * Mark a TODO item as completed.
   * @param {Object} params
   * @param {string} params.todoId Unique ID of the reminder/todo
   * @param {string} [params.note=''] Resolution note or outcome summary
   * @param {string} [params.bucket] Memory bucket
   * @param {string} [params.scope] Scope identifier
   */
  async completeTodo({
    todoId,
    note = '',
    bucket = this.defaultBucket,
    scope = this.defaultScope,
  } = {}) {
    if (!todoId) {
      throw new Error('todoId is required to complete a TODO item.');
    }
    const payload = { bucket, scope };
    if (note) payload.note = note;

    return await this._request(`/v1/reminders/${encodeURIComponent(todoId)}/complete`, {
      method: 'POST',
      body: payload,
    });
  }

  // =========================================================================
  // Aliases for multi-ecosystem interoperability
  // =========================================================================
  saveRestartSnapshot(params) { return this.saveSnapshot(params); }
  restoreRestartSnapshot(params) { return this.restoreSnapshot(params); }
  createReminder(params) { return this.createTodo(params); }
  listReminders(params) { return this.listTodos(params); }
  completeReminder(params) { return this.completeTodo(params); }
}
