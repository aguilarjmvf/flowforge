import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setTokens, clearTokens } from '@/lib/api';

describe('token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setTokens', () => {
    it('stores access_token in localStorage', () => {
      setTokens('access-abc', 'refresh-xyz');
      expect(localStorage.getItem('access_token')).toBe('access-abc');
    });

    it('stores refresh_token in localStorage', () => {
      setTokens('access-abc', 'refresh-xyz');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-xyz');
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens from localStorage', () => {
      localStorage.setItem('access_token', 'tok');
      localStorage.setItem('refresh_token', 'ref');
      clearTokens();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('is safe to call when tokens are not set', () => {
      expect(() => clearTokens()).not.toThrow();
    });
  });
});

describe('api.get error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an Error with the server message on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    const { api } = await import('@/lib/api');
    await expect(api.get('/some-path')).rejects.toThrow('Unauthorized');
  });

  it('throws a fallback message when the server response has no message field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { api } = await import('@/lib/api');
    await expect(api.get('/some-path')).rejects.toThrow('Request failed: 500');
  });

  it('returns parsed JSON on a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [1, 2, 3] }),
    });

    const { api } = await import('@/lib/api');
    const result = await api.get<{ success: boolean; data: number[] }>('/ok-path');
    expect(result).toEqual({ success: true, data: [1, 2, 3] });
  });
});
