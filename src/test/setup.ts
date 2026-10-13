import '@testing-library/jest-dom/vitest';
import raw from '../data/connectors.json';
import extras from '../data/extras.json';
import { setDataset } from '../lib/data';
import { setExtras } from '../lib/extras';
import type { Dataset } from '../lib/types';
setDataset(raw as unknown as Dataset);
setExtras(extras as never);
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
