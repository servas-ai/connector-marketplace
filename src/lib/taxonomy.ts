import { BarChart3, BookOpen, Building2, CloudSun, Code2, Database, HeartPulse, Landmark, Scale, Shapes, ShoppingCart, TrainFront, Wifi, Zap, type LucideIcon } from 'lucide-react';
import type { Connector } from './types';

export interface Category { id: string; label: string; icon: LucideIcon; hue: string }
export const CATEGORIES: Category[] = [
  { id: 'energie', label: 'Energie', icon: Zap, hue: '#f59e0b' },
  { id: 'telekom', label: 'Telekom & Internet', icon: Wifi, hue: '#ec4899' },
  { id: 'finanzen', label: 'Finanzen & Krypto', icon: Landmark, hue: '#10b981' },
  { id: 'statistik', label: 'Statistik', icon: BarChart3, hue: '#6366f1' },
  { id: 'register', label: 'Register & Firmen', icon: Building2, hue: '#64748b' },
  { id: 'recht', label: 'Recht & Vergabe', icon: Scale, hue: '#a855f7' },
  { id: 'gesundheit', label: 'Gesundheit', icon: HeartPulse, hue: '#ef4444' },
  { id: 'umwelt', label: 'Umwelt, Wetter & Geo', icon: CloudSun, hue: '#0ea5e9' },
  { id: 'mobilitaet', label: 'Mobilität', icon: TrainFront, hue: '#14b8a6' },
  { id: 'entwickler', label: 'Entwickler & Pakete', icon: Code2, hue: '#8b5cf6' },
  { id: 'shopping', label: 'Shopping & Preise', icon: ShoppingCart, hue: '#f97316' },
  { id: 'wissen', label: 'Wissenschaft & Kultur', icon: BookOpen, hue: '#3b82f6' },
  { id: 'opendata', label: 'Open Data', icon: Database, hue: '#2563eb' },
  { id: 'sonstige', label: 'Sonstige', icon: Shapes, hue: '#71717a' },
];
const BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const FOLDER: Record<string, string> = {
  energie: 'energie', strom: 'energie', mobil: 'telekom', festnetz: 'telekom', telekom: 'telekom', netz: 'telekom', finance: 'finanzen',
  vergabe: 'recht', 'register-at': 'register', register: 'register', firmendaten: 'register', adapters: 'register', health: 'gesundheit',
  geo: 'umwelt', umwelt: 'umwelt', mobility: 'mobilitaet', verkehr: 'mobilitaet', mobilitaet: 'mobilitaet', tech: 'entwickler', tools: 'entwickler', intel: 'entwickler',
  food: 'shopping', lebensmittel: 'shopping', marktplaetze: 'shopping', vergleich: 'shopping', geraete: 'shopping', research: 'wissen', kultur: 'wissen',
};
const KW: [RegExp, string][] = [
  [/statisti|stat-|census|sdmx|eurostat|ons-|cso-|scb-|ssb-|singstat|ibge|ine-|hagsto/i, 'statistik'],
  [/strom|energie|energy|gas|smard|entsog|elexon|carbon|power/i, 'energie'],
  [/wetter|weather|meteo|klima|luft|pegel|hydro|wasser|flood|earthquake|seism|volcan|geo|karte|smhi|dwd|noaa|umwelt/i, 'umwelt'],
  [/firmen|register|handelsreg|company|companies|gleif|zefix|brreg|krs|prh|ares|unternehmen/i, 'register'],
  [/vergabe|tender|procure|ausschreib|recht|gesetz|ris\b|edikt|sanktion|sanction|lobby|amtsblatt/i, 'recht'],
  [/gesund|health|medic|drug|klinik|fda|ema-|who-|clinical|ecdc/i, 'gesundheit'],
  [/bank|zins|kurs|exchange|krypto|crypto|coin|bitcoin|börse|fiscal|finanz|market/i, 'finanzen'],
  [/verkehr|transit|bahn|bus|linien|tfl|mobility|bike|auto|vpic|rdw/i, 'mobilitaet'],
  [/npm|pypi|crate|package|registry|docker|github|plugin|nuget|gem|hex|cve|nvd|osv/i, 'entwickler'],
  [/museum|art|book|library|nobel|poetry|paper|doi|crossref|arxiv|science|research|uniprot|gbif/i, 'wissen'],
];
export function categoryOf(c: Connector): Category {
  const f = FOLDER[c.category];
  if (f) return BY_ID[f];
  const hay = `${c.id} ${c.description} ${c.domain ?? ''}`;
  for (const [re, id] of KW) if (re.test(hay)) return BY_ID[id];
  if (c.category === 'opendata' || c.category === 'international') return BY_ID.opendata;
  return BY_ID.sonstige;
}
export const categoryById = (id: string) => BY_ID[id];
