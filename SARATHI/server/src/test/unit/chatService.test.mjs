import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleChatMessage,
  getAIProviderConfig,
  getChatSuggestions,
  checkChatRateLimit,
} from '../../services/aiChatService.js';

describe('AI Chat Service Unit Tests', () => {
  test('getAIProviderConfig returns structured provider status', () => {
    const config = getAIProviderConfig();
    assert.ok(typeof config.configured === 'boolean');
    assert.ok(typeof config.provider === 'string');
    assert.ok(typeof config.model === 'string');
  });

  test('getChatSuggestions returns appropriate suggested prompts for student', () => {
    const suggestions = getChatSuggestions('student');
    assert.ok(Array.isArray(suggestions));
    assert.ok(suggestions.length >= 4);
    assert.ok(suggestions.some(s => s.prompt.toLowerCase().includes('career')));
    assert.ok(suggestions.some(s => s.prompt.toLowerCase().includes('roadmap')));
    assert.ok(suggestions.some(s => s.prompt.toLowerCase().includes('skill gap')));
  });

  test('getChatSuggestions returns appropriate suggested prompts for recruiter', () => {
    const suggestions = getChatSuggestions('recruiter');
    assert.ok(Array.isArray(suggestions));
    assert.ok(suggestions.some(s => s.prompt.toLowerCase().includes('verification') || s.prompt.toLowerCase().includes('pipeline')));
  });

  test('handleChatMessage validates empty or whitespace-only messages', async () => {
    await assert.rejects(
      async () => {
        await handleChatMessage({ message: '   ' });
      },
      (err) => {
        assert.strictEqual(err.status, 400);
        return true;
      }
    );
  });

  test('handleChatMessage generates high-quality structured response for career guidance', async () => {
    const response = await handleChatMessage({
      message: 'Help me choose a career path in tech',
      conversationHistory: [],
      clientContext: {},
      user: null,
      ip: 'unit-test-ip-1',
    });

    assert.ok(response);
    assert.strictEqual(response.role, 'assistant');
    assert.ok(typeof response.content === 'string');
    assert.ok(response.content.length > 50);
    assert.ok(response.content.includes('Career Path') || response.content.includes('Development'));
    assert.ok(typeof response.timestamp === 'string');
  });

  test('handleChatMessage responds contextually to skill roadmap queries', async () => {
    const response = await handleChatMessage({
      message: 'Create my skill development roadmap for Web Development',
      conversationHistory: [],
      clientContext: { targetRole: 'Full-Stack Developer' },
      user: { id: 'usr-student-demo', globalRole: 'candidate' },
      ip: 'unit-test-ip-2',
    });

    assert.ok(response);
    assert.strictEqual(response.role, 'assistant');
    assert.ok(response.content.includes('Roadmap') || response.content.includes('Stage'));
  });

  test('handleChatMessage sanitizes conversation history without error', async () => {
    const response = await handleChatMessage({
      message: 'What should I do after completing stage 1?',
      conversationHistory: [
        { role: 'user', content: 'Create my roadmap' },
        { role: 'assistant', content: 'Stage 1 is fundamentals' },
      ],
      clientContext: {},
      user: null,
      ip: 'unit-test-ip-3',
    });

    assert.ok(response);
    assert.strictEqual(response.role, 'assistant');
    assert.ok(response.content.length > 20);
  });

  test('rate limiter tracks request count and prevents abuse', () => {
    const testId = `test-client-${Date.now()}`;
    for (let i = 0; i < 25; i++) {
      const res = checkChatRateLimit(testId);
      assert.strictEqual(res.allowed, true);
    }
    const blockedRes = checkChatRateLimit(testId);
    assert.strictEqual(blockedRes.allowed, false);
    assert.ok(blockedRes.retryAfterSeconds > 0);
  });
});
