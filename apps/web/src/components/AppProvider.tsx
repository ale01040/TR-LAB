import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
  async function refreshAuth(): Promise<User | null> {
    const response = await api<SessionResponse>('/auth/session');
    setConfigured(response.configured);
    const pendingLogout = await metadata('logout-pending');
    if (pendingLogout) {
      if (response.user?.sessionId === pendingLogout) {
        setCsrf(response.user.csrf);
        await api('/auth/logout', 'POST', { sessionId: pendingLogout });
      }
      await db.meta.delete('logout-pending');
      setUser(null);
      setCsrf(null);
      return null;
    }
    setUser(response.user);
    setCsrf(response.user?.csrf ?? null);
    if (response.user)
      await setMetadata('last-user', JSON.stringify({ ...response.user, csrf: '' }));
    else await db.meta.delete('last-user');
    return response.user;
  }
  async function sync(): Promise<void> {
    if (!user || user.recovery || syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      const fresh = await refreshAuth();
      if (!fresh || fresh.id !== user.id || fresh.sessionId !== user.sessionId || fresh.recovery)
        throw new Error('Sessione cambiata. Accedi di nuovo prima di sincronizzare.');
      await synchronize(fresh.id);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Sincronizzazione non riuscita. I dati restano sul dispositivo.',
      );
    } finally {
      setSyncing(false);
    }
  }
  useEffect(() => {
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener('online', changed);
    window.addEventListener('offline', changed);
    void (async () => {
      try {
        const theme = await metadata('theme');
        document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
        await refreshAuth();
      } catch {
        if (!(await metadata('logout-pending'))) {
          const remembered = await metadata('last-user');
          if (remembered) {
            const saved = JSON.parse(remembered) as User;
            setUser(saved);
          }
        }
        notify('Connessione al server assente. Il diario locale è disponibile.');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      window.removeEventListener('online', changed);
      window.removeEventListener('offline', changed);
    };
  }, []);
  useEffect(() => {
    if (user && online && !loading && !blocked) void sync();
    // Cambia solo quando arriva una nuova intenzione o torna la rete, non a ogni rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, online, pending, loading, blocked]);
  useEffect(() => {
    if (!user || user.recovery || !online) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, 30000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.recovery, online]);
  async function save(
    command: Command['command'],
    entity: Entity,
    related: Entity[] = [],
  ): Promise<void> {
    await saveLocally(account, command, entity, related);
  }
  async function logout(): Promise<void> {
    if (!user) return;
    await setMetadata('logout-pending', user.sessionId);
    try {
      if (navigator.onLine) {
        await api('/auth/logout', 'POST', { sessionId: user.sessionId });
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
      }}
    >
      {children}
    </Context.Provider>
  );
}
