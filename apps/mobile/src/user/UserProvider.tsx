import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messageForError } from '@/api/client';
import { createUser, getUser } from '@/api/users';
import type { UserRead } from '@/types/user';

const STORE_KEY = 'ecosentinel.mobile.userId';

type UserState = {
  userId: string | null;
  user: UserRead | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserState | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserRead | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const stored = await SecureStore.getItemAsync(STORE_KEY);
      if (stored) {
        try {
          const storedUser = await getUser(stored);
          setUserId(stored);
          setUser(storedUser);
          return;
        } catch {
          await SecureStore.deleteItemAsync(STORE_KEY);
        }
      }

      const user = await createUser({
        display_name: 'Mobile Observer',
        privacy_settings: {
          local_only: true,
        },
      });
      setUserId(user.id);
      setUser(user);
      await SecureStore.setItemAsync(STORE_KEY, user.id);
    } catch (err) {
      setError(messageForError(err, 'Unable to create a local user session.'));
      setUserId(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      userId,
      user,
      ready,
      error,
      refresh,
    }),
    [error, ready, refresh, user, userId]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useLocalUser() {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error('useLocalUser must be used inside UserProvider');
  }
  return value;
}
