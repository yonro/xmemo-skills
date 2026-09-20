import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryOsClient } from '../skills/memory-os/index.js';
import RootClient from '../index.js';

describe('MemoryOsClient (v1.2.0)', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let mockRequests = [];
  let mockResponse = { status: 200, data: { ok: true } };

  beforeEach(() => {
    mockRequests = [];
    mockResponse = { status: 200, data: { ok: true } };
    globalThis.fetch = async (url, options = {}) => {
      mockRequests.push({ url: String(url), options });
      return {
        ok: mockResponse.status >= 200 && mockResponse.status < 300,
        status: mockResponse.status,
        statusText: mockResponse.status === 200 ? 'OK' : 'Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse.data,
        text: async () => JSON.stringify(mockResponse.data),
      };
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  test('Module root export matches MemoryOsClient', () => {
    assert.strictEqual(RootClient, MemoryOsClient);
  });

  test('Constructor throws if no token provided', () => {
    delete process.env.XMEMO_KEY;
    assert.throws(() => new MemoryOsClient(), /Authorization token/);
  });

  test('Constructor accepts token from env or argument', () => {
    process.env.XMEMO_KEY = 'env-token';
    const c1 = new MemoryOsClient();
    assert.strictEqual(c1.token, 'env-token');

    const c2 = new MemoryOsClient({ token: 'arg-token', agentId: 'test-agent' });
    assert.strictEqual(c2.token, 'arg-token');
    assert.strictEqual(c2.agentId, 'test-agent');
  });

  test('Headers include Authorization and Agent IDs', async () => {
    const client = new MemoryOsClient({
      token: 'test-token',
      agentId: 'my-agent',
      agentInstanceId: 'inst-123',
    });
    mockResponse = { status: 200, data: { results: [] } };
    await client.episodicRecall('hello');

    assert.strictEqual(mockRequests.length, 1);
    const headers = mockRequests[0].options.headers;
    assert.strictEqual(headers['Authorization'], 'Bearer test-token');
    assert.strictEqual(headers['X-Memory-OS-Agent-ID'], 'my-agent');
    assert.strictEqual(headers['X-Memory-OS-Agent-Instance-ID'], 'inst-123');
  });

  test('episodicRecall sends GET request with query params', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 200, data: [{ id: '1', text: 'test memory' }] };
    const res = await client.episodicRecall('postgres docker setup', 3);

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/api\/v1\/memories\/search\?q=postgres\+docker\+setup&limit=3/);
    assert.strictEqual(mockRequests[0].options.method, 'GET');
    assert.deepStrictEqual(res, [{ id: '1', text: 'test memory' }]);
  });

  test('saveMemory sends POST request with payload', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 201, data: { id: 'm-123', status: 'saved' } };
    const res = await client.saveMemory({ text: 'Always use utf8mb4', category: 'code' });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/api\/v1\/memories$/);
    assert.strictEqual(mockRequests[0].options.method, 'POST');
    assert.deepStrictEqual(JSON.parse(mockRequests[0].options.body), {
      text: 'Always use utf8mb4',
      category: 'code',
    });
    assert.deepStrictEqual(res, { id: 'm-123', status: 'saved' });
  });

  test('registerDecision sends POST request to memory-conflicts', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 200, data: { id: 'd-1' } };
    await client.registerDecision({
      title: 'Use Redis for caching',
      context: 'High DB query load',
      resolution: 'Adopt Redis cluster',
    });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/api\/v1\/memory-conflicts$/);
    assert.deepStrictEqual(JSON.parse(mockRequests[0].options.body), {
      title: 'Use Redis for caching',
      context: 'High DB query load',
      resolution: 'Adopt Redis cluster',
    });
  });

  // =========================================================================
  // Module 1 Tests: Snapshots & State Recovery
  // =========================================================================

  test('saveSnapshot sends POST to /v1/restart/snapshot', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 200, data: { id: 'snap-1', label: 'pre-shutdown' } };
    const res = await client.saveSnapshot({
      label: 'pre-shutdown',
      sessionId: 'sess-42',
      bucket: 'custom-bucket',
    });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/v1\/restart\/snapshot$/);
    assert.strictEqual(mockRequests[0].options.method, 'POST');
    const body = JSON.parse(mockRequests[0].options.body);
    assert.strictEqual(body.label, 'pre-shutdown');
    assert.strictEqual(body.session_id, 'sess-42');
    assert.strictEqual(body.bucket, 'custom-bucket');
    assert.strictEqual(res.id, 'snap-1');
  });

  test('restoreSnapshot sends POST to /v1/restart/restore', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 200, data: { status: 'restored', restored: true, snapshot_id: 'snap-1' } };
    const res = await client.restoreSnapshot({ snapshotId: 'snap-1' });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/v1\/restart\/restore$/);
    assert.strictEqual(mockRequests[0].options.method, 'POST');
    const body = JSON.parse(mockRequests[0].options.body);
    assert.strictEqual(body.snapshot_id, 'snap-1');
    assert.strictEqual(res.restored, true);
  });

  test('updateState sends POST to /v1/update_state with task details', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 200, data: { status: 'ok' } };
    await client.updateState({
      currentTask: 'Refactoring auth module',
      nextAction: 'Add JWT verify test',
      blockedReason: 'Waiting for secret key',
      ttlSeconds: 3600,
    });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/v1\/update_state$/);
    const body = JSON.parse(mockRequests[0].options.body);
    assert.strictEqual(body.state_key, 'active_task');
    assert.strictEqual(body.current_task, 'Refactoring auth module');
    assert.strictEqual(body.next_action, 'Add JWT verify test');
    assert.strictEqual(body.blocked_reason, 'Waiting for secret key');
    assert.strictEqual(body.ttl_seconds, 3600);
  });

  // =========================================================================
  // Module 2 Tests: Action Items / TODOs
  // =========================================================================

  test('createTodo validates content and sends POST to /v1/reminders', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    await assert.rejects(async () => await client.createTodo({}), /Content is required/);

    mockResponse = { status: 201, data: { id: 'todo-99', content: 'Audit security rules' } };
    const res = await client.createTodo({
      content: 'Audit security rules',
      dueAt: '2026-10-01T00:00:00Z',
    });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/v1\/reminders$/);
    const body = JSON.parse(mockRequests[0].options.body);
    assert.strictEqual(body.content, 'Audit security rules');
    assert.strictEqual(body.due_at, '2026-10-01T00:00:00Z');
    assert.strictEqual(res.id, 'todo-99');
  });

  test('listTodos unwraps reminders array and passes filters', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = {
      status: 200,
      data: { reminders: [{ id: 't-1', content: 'Task 1' }, { id: 't-2', content: 'Task 2' }] },
    };
    const items = await client.listTodos({ itemStatus: 'open', limit: 10 });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/v1\/reminders\?bucket=work&scope=default&item_status=open&limit=10/);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].content, 'Task 1');
  });

  test('completeTodo sends POST to /v1/reminders/:id/complete', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    await assert.rejects(async () => await client.completeTodo({}), /todoId is required/);

    mockResponse = { status: 200, data: { id: 't-1', status: 'completed' } };
    const res = await client.completeTodo({ todoId: 't-1', note: 'All unit tests passed' });

    assert.strictEqual(mockRequests.length, 1);
    assert.match(mockRequests[0].url, /\/v1\/reminders\/t-1\/complete$/);
    const body = JSON.parse(mockRequests[0].options.body);
    assert.strictEqual(body.note, 'All unit tests passed');
    assert.strictEqual(res.status, 'completed');
  });

  test('Aliases work identically to primary methods', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 200, data: { ok: true } };

    await client.saveRestartSnapshot({ label: 'snap' });
    assert.match(mockRequests[0].url, /\/v1\/restart\/snapshot$/);

    await client.restoreRestartSnapshot({ snapshotId: 's1' });
    assert.match(mockRequests[1].url, /\/v1\/restart\/restore$/);

    await client.createReminder({ content: 'buy tea' });
    assert.match(mockRequests[2].url, /\/v1\/reminders$/);

    await client.listReminders();
    assert.match(mockRequests[3].url, /\/v1\/reminders\?/);

    await client.completeReminder({ todoId: 'r-1' });
    assert.match(mockRequests[4].url, /\/v1\/reminders\/r-1\/complete$/);
  });

  test('Throws informative error when server returns non-200', async () => {
    const client = new MemoryOsClient({ token: 'test-token' });
    mockResponse = { status: 500, data: { error: 'Internal Server Error' } };

    await assert.rejects(
      async () => await client.episodicRecall('test'),
      /XMemo API request failed \[500 Error\]/
    );
  });
});
