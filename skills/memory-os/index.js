/**
 * XMemo Memory OS Skill — Reference Integration Client
 * 
 * Provides runtime helper functions for agents to communicate with XMemo's
 * cloud memory services using standard fetch APIs.
 */

const DEFAULT_BASE_URL = 'https://xmemo.dev';

export class MemoryOsClient {
  constructor({ token, baseUrl = DEFAULT_BASE_URL, agentId = 'xmemo-skills-js' } = {}) {
    this.token = token || process.env.XMEMO_KEY;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.agentId = agentId;
    this.agentInstanceId = process.env.XMEMO_AGENT_INSTANCE_ID || '';

    if (!this.token) {
      throw new Error('Authorization token (XMEMO_KEY) is required for XMemo Skills.');
    }
  }

  _getHeaders() {
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'X-Memory-OS-Agent-ID': this.agentId,
    };
    if (this.agentInstanceId) {
      headers['X-Memory-OS-Agent-Instance-ID'] = this.agentInstanceId;
    }
    return headers;
  }

  /**
   * Search and recall memories from XMemo Memory OS
   */
  async episodicRecall(query, limit = 5) {
    const url = `${this.baseUrl}/api/v1/memories/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to recall memories: ${response.status} - ${errorMsg}`);
    }

    return await response.json();
  }

  /**
   * Save a memory to XMemo Memory OS
   */
  async saveMemory({ text, category = 'context' }) {
    const url = `${this.baseUrl}/api/v1/memories`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ text, category }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to save memory: ${response.status} - ${errorMsg}`);
    }

    return await response.json();
  }

  /**
   * Register a key decision to the memory ledger
   */
  async registerDecision({ title, context, resolution }) {
    const url = `${this.baseUrl}/api/v1/memory-conflicts`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ title, context, resolution }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to register decision: ${response.status} - ${errorMsg}`);
    }

    return await response.json();
  }
}
