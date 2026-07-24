import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  reloadApplication: vi.fn(),
}));

vi.mock('../api/client.js', () => ({
  default: { post: mocks.post },
}));
vi.mock('./session-timeout.js', async (importOriginal) => ({
  ...(await importOriginal()),
  reloadApplication: mocks.reloadApplication,
}));

import { AuthContext, AuthProvider } from './AuthContext.jsx';
import { readSession, saveSession } from './auth.storage.js';

const tokenValidUntil = (expiresAt) => {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }));
  return `header.${payload}.signature`;
};

function AuthenticationState() {
  return (
    <AuthContext.Consumer>
      {(auth) => <span>{auth.isAuthenticated ? 'Session active' : 'Session inactive'}</span>}
    </AuthContext.Consumer>
  );
}

describe('AuthProvider inactivity management', () => {
  const start = new Date('2026-07-24T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    localStorage.clear();
    vi.clearAllMocks();
    saveSession({
      accessToken: tokenValidUntil(start.getTime() + 60 * 60 * 1000),
      user: { roles: [], permissions: [] },
      lastActivityAt: start.getTime(),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('extends the session on activity then reloads after fifteen idle minutes', async () => {
    render(
      <AuthProvider>
        <AuthenticationState />
      </AuthProvider>,
    );
    await act(async () => {});
    expect(screen.getByText('Session active')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10 * 1000);
      fireEvent.pointerDown(window);
      vi.advanceTimersByTime(14 * 60 * 1000 + 59 * 1000);
    });
    expect(mocks.reloadApplication).not.toHaveBeenCalled();
    expect(screen.getByText('Session active')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mocks.reloadApplication).toHaveBeenCalledOnce();
    expect(screen.getByText('Session inactive')).toBeInTheDocument();
  });

  it('renews a nearly expired token when the user remains active', async () => {
    const renewedToken = tokenValidUntil(start.getTime() + 20 * 60 * 1000);
    saveSession({
      accessToken: tokenValidUntil(start.getTime() + 4 * 60 * 1000),
      user: { roles: [], permissions: [] },
      lastActivityAt: start.getTime(),
    });
    mocks.post.mockResolvedValue({
      data: {
        data: {
          accessToken: renewedToken,
          user: { roles: [], permissions: [] },
        },
      },
    });
    render(
      <AuthProvider>
        <AuthenticationState />
      </AuthProvider>,
    );
    await act(async () => {});

    await act(async () => {
      vi.advanceTimersByTime(16 * 1000);
      fireEvent.pointerDown(window);
      await Promise.resolve();
    });

    expect(mocks.post).toHaveBeenCalledWith('/v1/auth/refresh');
    expect(readSession()?.accessToken).toBe(renewedToken);
    expect(screen.getByText('Session active')).toBeInTheDocument();
  });
});
