import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { loadDataset } from './lib/data';
import './index.css';

const root = document.getElementById('root')!;
loadDataset()
  .then(async () => {
    // App (and Home's module-level dataset.connectors) must load AFTER dataset is ready
    const { App } = await import('./App');
    createRoot(root).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
  })
  .catch((err) => {
    root.textContent = `Katalog konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`;
  });
