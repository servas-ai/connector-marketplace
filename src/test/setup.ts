import '@testing-library/jest-dom/vitest';
import raw from '../data/connectors.json';
import { setDataset } from '../lib/data';
import type { Dataset } from '../lib/types';
setDataset(raw as unknown as Dataset);
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
