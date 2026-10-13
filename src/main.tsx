import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { loadDataset } from './lib/data';
import './index.css';

const root = document.getElementById('root')!;
loadDataset()
  .then(() => {
    createRoot(root).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
  })
  .catch((err) => {
    root.textContent = `Katalog konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`;
  });
