import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Command, Entity } from '@tr-lab/contracts';
import { db, localAccount, metadata, records, saveLocally, setMetadata } from '../data/database';
import { api, setCsrf, synchronize } from '../data/sync';

export type User = {
  id: string;
  email: string;
  sessionId: string;
  csrf: string;
  recovery: boolean;
};
type SessionResponse = { user: User | null; configured: boolean };
const userSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    sessionId: z.uuid(),
    csrf: z.string(),
    recovery: z.boolean(),
  })
  .strict();
type AppState = {
  account: string;
  user: User | null;
  configured: boolean;
  online: boolean;
  loading: boolean;
  entities: Entity[];
  pending: number;
  blocked: number;
  notice: string;
  syncing: boolean;
  save: (command: Command['command'], entity: Entity, related?: Entity[]) => Promise<void>;
  refreshAuth: () => Promise<User | null>;
  sync: () => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string) => void;
  isCurrentSession: (sessionId: string) => boolean;
};
const Context = createContext<AppState | null>(null);
export function useApp(): AppState {
  const context = useContext(Context);
  if (!context) throw new Error('AppProvider assente.');
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, notify] = useState('');
  const [syncing, setSyncing] = useState(false);
  const activeUser = useRef<User | null>(null);
  const authGeneration = useRef(0);
  const syncController = useRef<AbortController | null>(null);
  const invalidateAuth = useCallback(() => {
    authGeneration.current++;
    syncController.current?.abort();
  }, []);
  const adoptUser = useCallback((next: User | null) => {
    if (activeUser.current?.sessionId !== next?.sessionId) syncController.current?.abort();
    activeUser.current = next;
    setUser(next);
    setCsrf(next?.csrf || null);
  }, []);
  const account = user?.id ?? localAccount;
  const loadedRecords = useLiveQuery(
    async () => ({ account, items: await records(account) }),
    [account],
  );
  const loadedOperations = useLiveQuery(
    async () => ({
      account,
      items: await db.outbox.where('account').equals(account).toArray(),
    }),
    [account],
  );
  // Un live query può conservare il risultato precedente mentre cambia la dipendenza.
  // Nessun dato A va mostrato o contato nel frame iniziale dell'account B.
  const entities = loadedRecords?.account === account ? loadedRecords.items : [];
  const operations = loadedOperations?.account === account ? loadedOperations.items : [];
  const pending = operations.length;
  const blocked = operations.filter((p) => p.status === 'blocked').length;
  const refreshAuth = useCallback(async (): Promise<User | null> => {
    const generation = ++authGeneration.current;
    const response = z
      .object({ configured: z.boolean(), user: userSchema.nullable() })
      .parse(await api<SessionResponse>('/auth/session'));
    if (generation !== authGeneration.current) return null;
    setConfigured(response.configured);
    const pendingLogout = await metadata('logout-pending');
    if (generation !== authGeneration.current) return null;
    if (pendingLogout) {
      if (response.user?.sessionId === pendingLogout) {
        setCsrf(response.user.csrf);
        await api('/auth/logout', 'POST', { sessionId: pendingLogout });
      }
      await db.meta.delete('logout-pending');
      if (generation === authGeneration.current) adoptUser(null);
      return null;
    }
    adoptUser(response.user);
    if (response.user)
      await setMetadata('last-user', JSON.stringify({ ...response.user, csrf: '' }));
    else await db.meta.delete('last-user');
    return response.user;
  }, [adoptUser]);
  const sync = useCallback(async (): Promise<void> => {
    const before = activeUser.current;
    if (!before || before.recovery || syncController.current || !navigator.onLine) return;
    const controller = new AbortController();
    syncController.current = controller;
    setSyncing(true);
    try {
      const fresh = await refreshAuth();
      if (
        !fresh ||
        fresh.id !== before.id ||
        fresh.sessionId !== before.sessionId ||
        fresh.recovery
      )
        throw new Error('Sessione cambiata. Accedi di nuovo prima di sincronizzare.');
      await synchronize(fresh.id, {
        signal: controller.signal,
        isCurrent: () =>
          activeUser.current?.id === fresh.id && activeUser.current.sessionId === fresh.sessionId,
      });
    } catch (error) {
      if (!controller.signal.aborted)
        notify(
          error instanceof Error
            ? error.message
            : 'Sincronizzazione non riuscita. I dati restano sul dispositivo.',
        );
    } finally {
      if (syncController.current === controller) syncController.current = null;
      setSyncing(false);
    }
  }, [refreshAuth]);
  useEffect(() => {
    let cancelled = false;
    const changed = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine)
        void metadata('logout-pending')
          .then((pending) => {
            if (pending) return refreshAuth();
          })
          .catch(() => notify('L’uscita remota è ancora in attesa.'));
    };
    window.addEventListener('online', changed);
    window.addEventListener('offline', changed);
    void (async () => {
      try {
        const theme = await metadata('theme');
        document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
        if (!cancelled) await refreshAuth();
      } catch {
        if (cancelled) return;
        if (!(await metadata('logout-pending'))) {
          const remembered = await metadata('last-user');
          if (remembered) {
            const saved = userSchema.safeParse(JSON.parse(remembered));
            if (saved.success && !cancelled && !activeUser.current) adoptUser(saved.data);
          }
        }
        notify('Connessione al server assente. Il diario locale è disponibile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      invalidateAuth();
      window.removeEventListener('online', changed);
      window.removeEventListener('offline', changed);
    };
  }, [adoptUser, refreshAuth, invalidateAuth]);
  useEffect(() => {
    if (user?.id && !user.recovery && online && !loading) void sync();
    // Cambia solo quando arriva una nuova intenzione o torna la rete, non a ogni rendering.
  }, [user?.id, user?.recovery, online, pending, loading, blocked, sync]);
  useEffect(() => {
    if (!user?.id || user.recovery || !online) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [user?.id, user?.recovery, online, sync]);
  async function save(
    command: Command['command'],
    entity: Entity,
    related: Entity[] = [],
  ): Promise<void> {
    await saveLocally(account, command, entity, related);
  }
  async function logout(): Promise<void> {
    const current = activeUser.current;
    if (!current) return;
    authGeneration.current++;
    syncController.current?.abort();
    await setMetadata('logout-pending', current.sessionId);
    activeUser.current = null;
    setUser(null);
    try {
      if (navigator.onLine) {
        await api('/auth/logout', 'POST', { sessionId: current.sessionId });
        await db.meta.delete('logout-pending');
      }
    } catch {
      notify(
        'Uscita locale completata. La sessione sul server sarà chiusa quando torna la connessione.',
      );
    }
    await db.meta.delete('last-user');
    setUser(null);
    setCsrf(null);
  }
  return (
    <Context.Provider
      value={{
        account,
        user,
        configured,
        online,
        loading,
        entities,
        pending,
        blocked,
        notice,
        syncing,
        save,
        refreshAuth,
        sync,
        logout,
        notify,
        isCurrentSession: (sessionId) => activeUser.current?.sessionId === sessionId,
      }}
    >
      {children}
    </Context.Provider>
  );
}
