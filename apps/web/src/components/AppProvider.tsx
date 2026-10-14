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
import type { FeedbackNotice, FeedbackTone } from './Feedback';
import { errorMessage } from './Shared';

export type User = {
  id: string;
  email: string;
  sessionId: string;
  csrf: string;
  recovery: boolean;
};
type SessionResponse = { user: User | null; configured: boolean; providers?: { google: boolean } };
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
  googleAvailable: boolean;
  authVerified: boolean;
  accountCacheError: boolean;
  authServiceState: 'checking' | 'ready' | 'device' | 'unreachable';
  online: boolean;
  loading: boolean;
  entities: Entity[];
  pending: number;
  blocked: number;
  notice: FeedbackNotice | null;
  syncing: boolean;
  loggingOut: boolean;
  save: (command: Command['command'], entity: Entity, related?: Entity[]) => Promise<void>;
  refreshAuth: () => Promise<User | null>;
  sync: (manual?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string, tone?: FeedbackTone) => void;
  dismissNotice: () => void;
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
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [authVerified, setAuthVerified] = useState(false);
  const [accountCacheError, setAccountCacheError] = useState(false);
  const [authServiceState, setAuthServiceState] =
    useState<AppState['authServiceState']>('checking');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  const noticeId = useRef(0);
  const notify = useCallback((message: string, tone: FeedbackTone = 'info') => {
    setNotice({ id: ++noticeId.current, message, tone });
  }, []);
  const [syncing, setSyncing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutRunning = useRef(false);
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
      .object({
        configured: z.boolean(),
        user: userSchema.nullable(),
        providers: z.object({ google: z.boolean() }).optional(),
      })
      .parse(
        await api<SessionResponse>('/auth/session').catch((error: unknown) => {
          if (generation === authGeneration.current) {
            setAuthVerified(false);
            setAuthServiceState('unreachable');
          }
          throw error;
        }),
      );
    if (generation !== authGeneration.current) return null;
    setConfigured(response.configured);
    setAuthServiceState(response.configured ? 'ready' : 'device');
    setGoogleAvailable(response.providers?.google ?? false);
    const pendingLogout = await metadata('logout-pending');
    if (generation !== authGeneration.current) return null;
    if (pendingLogout) {
      setAuthVerified(false);
      if (response.user?.sessionId === pendingLogout) {
        setCsrf(response.user.csrf);
        await api('/auth/logout', 'POST', { sessionId: pendingLogout });
      }
      await db.meta.delete('logout-pending');
      if (generation === authGeneration.current) adoptUser(null);
      return null;
    }
    adoptUser(response.user);
    setAuthVerified(!!response.user);
    try {
      if (response.user)
        await setMetadata('last-user', JSON.stringify({ ...response.user, csrf: '' }));
      else await db.meta.delete('last-user');
      setAccountCacheError(false);
    } catch {
      // Un cache failure non annulla la sessione già verificata dal server.
      setAccountCacheError(true);
    }
    return response.user;
  }, [adoptUser]);
  const sync = useCallback(
    async (manual = false): Promise<void> => {
      const before = activeUser.current;
      if (!before || before.recovery || !navigator.onLine) {
        if (manual)
          notify(
            'Per sincronizzare servono connessione e accesso valido. I dati locali restano conservati.',
            'warning',
          );
        return;
      }
      if (syncController.current) return;
      const controller = new AbortController();
      syncController.current = controller;
      setSyncing(true);
      try {
        const previousSync = manual ? await metadata(`${before.id}:last-sync`) : null;
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
        if (manual && activeUser.current?.sessionId === fresh.sessionId) {
          const lastSync = await metadata(`${fresh.id}:last-sync`);
          const remaining = await db.outbox.where('account').equals(fresh.id).toArray();
          const conflicts = remaining.filter((operation) => operation.status === 'blocked').length;
          if (conflicts)
            notify(
              'Sincronizzazione terminata con conflitti da rivedere. Apri Conflitti e recupero nel Profilo; i dati restano conservati.',
              'warning',
            );
          else if (remaining.length)
            notify(
              'Alcune modifiche sono ancora in attesa. I dati restano sul dispositivo; controlla lo stato nel Profilo.',
              'warning',
            );
          else if (lastSync && lastSync !== previousSync)
            notify('Dati aggiornati. Nessuna modifica in attesa di sincronizzazione.', 'success');
          else
            notify(
              'Il controllo è già gestito da un’altra scheda. Verifica l’ultima sincronizzazione nel Profilo.',
            );
        }
      } catch (error) {
        if (!controller.signal.aborted) notify(errorMessage(error), 'error');
      } finally {
        if (syncController.current === controller) syncController.current = null;
        setSyncing(false);
      }
    },
    [refreshAuth, notify],
  );
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
        try {
          const [theme, motion] = await Promise.all([metadata('theme'), metadata('motion')]);
          if (!cancelled) {
            document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
            document.documentElement.dataset.motion = motion === 'reduce' ? 'reduce' : 'system';
          }
        } catch {
          if (!cancelled)
            notify(
              'Non posso leggere le preferenze locali. Le impostazioni del dispositivo restano valide.',
              'warning',
            );
        }
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
  }, [adoptUser, refreshAuth, invalidateAuth, notify]);
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
    if (!current || logoutRunning.current) return;
    logoutRunning.current = true;
    setLoggingOut(true);
    authGeneration.current++;
    syncController.current?.abort();
    try {
      // L'intenzione viene conservata prima di nascondere l'account: nessuna uscita fittizia.
      await setMetadata('logout-pending', current.sessionId);
      activeUser.current = null;
      setUser(null);
      setAuthVerified(false);
      let remoteClosed = false;
      try {
        if (navigator.onLine) {
          await api('/auth/logout', 'POST', { sessionId: current.sessionId });
          await db.meta.delete('logout-pending');
          remoteClosed = true;
        }
      } catch {
        // La revoca verrà ripresa dalla coda già persistita; non dichiarare chiusa la sessione remota.
      }
      await db.meta.delete('last-user');
      setCsrf(null);
      notify(
        remoteClosed
          ? 'Uscita completata. I tuoi dati restano conservati per il prossimo accesso.'
          : 'Uscita completata sul dispositivo. La sessione sul server sarà chiusa quando torna la connessione; i tuoi dati restano conservati.',
        remoteClosed ? 'success' : 'warning',
      );
    } catch {
      notify(
        activeUser.current
          ? 'Non è stato possibile completare l’uscita. Sei ancora nel tuo account: riprova.'
          : 'Account nascosto sul dispositivo, ma la pulizia locale non è terminata. Riprova appena possibile senza cancellare i dati del browser.',
        'error',
      );
    } finally {
      if (!activeUser.current) setCsrf(null);
      logoutRunning.current = false;
      setLoggingOut(false);
    }
  }
  return (
    <Context.Provider
      value={{
        account,
        user,
        configured,
        googleAvailable,
        authVerified,
        accountCacheError,
        authServiceState,
        online,
        loading,
        entities,
        pending,
        blocked,
        notice,
        syncing,
        loggingOut,
        save,
        refreshAuth,
        sync,
        logout,
        notify,
        dismissNotice: () => setNotice(null),
        isCurrentSession: (sessionId) => activeUser.current?.sessionId === sessionId,
      }}
    >
      {children}
    </Context.Provider>
  );
}
