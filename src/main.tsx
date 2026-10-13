import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { loadDataset, loadRest, loadRestFor } from './lib/data';
import { loadExtras } from './lib/extras';
import { App } from './App';
import './index.css';

const rootEl = document.getElementById('root')!;

// Startseite rendert mit dem schlanken list.json; Detail/Vergleich/Statistik brauchen auch list-rest.json.
const home = !location.hash || location.hash === '#/' || location.hash.startsWith('#/?');
// Seiten-Chunk der Einstiegsroute parallel zu den Daten laden (sonst Wasserfall: Daten → Render → Chunk → Logo).
const h = location.hash;
const detailId = (() => { const m = /^#\/c\/([^/?#]+)/.exec(h); try { return m ? decodeURIComponent(m[1]) : null; } catch { return null; } })();
if (h.startsWith('#/c/')) void import('./pages/ConnectorPage');
else if (h.startsWith('#/compare')) void import('./pages/Compare');
else if (h.startsWith('#/dashboard')) void import('./pages/Dashboard');
else if (h.startsWith('#/agent')) void import('./pages/Agent');
Promise.all([loadDataset(), loadExtras()])
  .then(() => (home ? undefined : detailId ? loadRestFor(detailId) : loadRest()))
  .then(() => {
    createRoot(rootEl).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
  })
  .catch((err) => {
    rootEl.textContent = `Katalog konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`;
  });
