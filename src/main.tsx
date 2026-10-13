import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { loadDataset } from './lib/data';
import { loadExtras } from './lib/extras';
import { App } from './App';
import './index.css';

const rootEl = document.getElementById('root')!;

Promise.all([loadDataset(), loadExtras()])
  .then(() => {
    createRoot(rootEl).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
  })
  .catch((err) => {
    rootEl.textContent = `Katalog konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`;
  });
