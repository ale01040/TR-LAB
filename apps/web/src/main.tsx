import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AppProvider } from './components/AppProvider';
import { App } from './App';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento root assente.');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
// L'update è solo segnalato: ricaricare durante una serie sarebbe una perdita di contesto.
const update = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('tr-lab-update', { detail: () => update(true) }));
  },
});
