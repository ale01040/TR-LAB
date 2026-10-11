import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  Home,
  RefreshCw,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { useApp } from './components/AppProvider';
import { counted } from './components/Shared';
import styles from './styles/App.module.css';

const TodayPage = lazy(() => import('./pages/TodayPage').then((m) => ({ default: m.TodayPage })));
const ProgramPage = lazy(() =>
  import('./pages/ProgramPage').then((m) => ({ default: m.ProgramPage })),
);
const WorkoutPage = lazy(() =>
  import('./pages/WorkoutPage').then((m) => ({ default: m.WorkoutPage })),
);
const ProgressPage = lazy(() =>
  import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })),
);
const LibraryPage = lazy(() =>
  import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

const links = [
  { to: '/', name: 'Oggi', icon: Home },
  { to: '/programma', name: 'Programma', icon: CalendarDays },
  { to: '/progressi', name: 'Progressi', icon: ChartNoAxesCombined },
  { to: '/libreria', name: 'Libreria', icon: Dumbbell },
  { to: '/profilo', name: 'Profilo', icon: UserRound },
];
export function App() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // Le nuove sezioni partono dal titolo, non dallo scroll della pagina precedente.
    window.scrollTo(0, 0);
  }, [pathname]);
  const { account, user, online, loading, pending, blocked, notice, syncing, sync } = useApp();
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const receive = (event: Event) =>
      setUpdate(() => (event as CustomEvent<() => Promise<void>>).detail);
    window.addEventListener('tr-lab-update', receive);
    return () => window.removeEventListener('tr-lab-update', receive);
  }, []);
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Vai al contenuto
      </a>
      <aside className={styles.sidebar}>
        <NavLink className={styles.brand ?? ''} to="/" aria-label="TR LAB, pagina iniziale">
          <img src="/icon.svg" alt="" width="40" height="40" />
          TR<span>LAB</span>
          <span className={styles.brandDot}>.</span>
        </NavLink>
        <p className={styles.sidebarCaption}>
          IL TUO ALLENAMENTO,
          <br />
          CON INTENZIONE.
        </p>
        <nav aria-label="Navigazione principale">
          {links.map(({ to, name, icon: Icon }) => (
            <NavLink
              end={to === '/'}
              key={to}
              to={to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <span className={styles.eyebrow}>DA UN'IDEA, A UN'ABITUDINE</span>
          <p>Una serie alla volta.</p>
          <span className={styles.alpha}>ALPHA · 0.1</span>
        </div>
      </aside>
      <div className={styles.content}>
        <header className={styles.topbar}>
          <span className={styles.topLabel}>ALLENAMENTO / SPAZIO PERSONALE</span>
          <div className={styles.connection} role="status">
            {!online && <WifiOff size={16} aria-hidden="true" />}
            <span>
              {!online
                ? 'Offline · dati sul dispositivo'
                : user
                  ? blocked
                    ? counted(blocked, 'conflitto da rivedere', 'conflitti da rivedere')
                    : pending
                      ? counted(pending, 'operazione in attesa', 'operazioni in attesa')
                      : 'Account personale'
                  : 'Solo su questo dispositivo'}
            </span>
            {user && online && (
              <button
                className={styles.iconButton}
                onClick={() => void sync()}
                disabled={syncing}
                aria-label="Sincronizza adesso"
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            )}
            <NavLink to="/profilo" className={styles.avatar} aria-label="Apri profilo">
              {user?.email[0]?.toUpperCase() ?? <UserRound size={18} aria-hidden="true" />}
            </NavLink>
          </div>
        </header>
        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}
        {update && (
          <div className={styles.notice}>
            Aggiornamento disponibile. Salva i campi in corso prima di ricaricare.{' '}
            <button onClick={() => void update()}>Aggiorna ora</button>
          </div>
        )}
        <main id="main" className={styles.main} key={account}>
          {loading ? (
            <p role="status">Apro il tuo spazio…</p>
          ) : (
            <Suspense fallback={<p role="status">Apro la sezione…</p>}>
              <Routes>
                <Route path="/" element={<TodayPage />} />
                <Route path="/programma" element={<ProgramPage />} />
                <Route path="/seduta/:id" element={<WorkoutPage />} />
                <Route path="/progressi" element={<ProgressPage />} />
                <Route path="/libreria" element={<LibraryPage />} />
                <Route path="/profilo" element={<ProfilePage />} />
                <Route
                  path="*"
                  element={
                    <>
                      <h1>Pagina non trovata</h1>
                      <NavLink to="/">
                        Torna a Oggi <ArrowUpRight size={16} />
                      </NavLink>
                    </>
                  }
                />
              </Routes>
            </Suspense>
          )}
        </main>
        <footer className={styles.footer}>
          TR LAB <span>Allenati. Registra. Comprendi.</span>
          <small>
            © {new Date().getFullYear()} TR LAB ·{' '}
            <span className={styles.printOnly}>TR LAB · {window.location.origin}/</span>
          </small>
        </footer>
      </div>
      <nav className={styles.mobileNav} aria-label="Navigazione mobile">
        {links.map(({ to, name, icon: Icon }) => (
          <NavLink
            end={to === '/'}
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? styles.mobileActive : '')}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
