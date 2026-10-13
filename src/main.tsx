import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { loadDataset, loadRest } from './lib/data';
import { loadExtras } from './lib/extras';
import { App } from './App';
import './index.css';

const rootEl = document.getElementById('root')!;

// Startseite rendert mit dem schlanken list.json; Detail/Vergleich/Statistik brauchen auch list-rest.json.
const home = !location.hash || location.hash === '#/' || location.hash.startsWith('#/?');
Promise.all([loadDataset(), loadExtras()])
  .then(() => (home ? undefined : loadRest()))
  .then(() => {
    createRoot(rootEl).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
  })
  .catch((err) => {
    rootEl.textContent = `Katalog konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`;
  });
