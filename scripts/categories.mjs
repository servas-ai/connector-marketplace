// Normalisiert Kategorien für Telekom-/Energie-/Colocation-Connectoren.
// Quelle der Zuordnung: Beschreibungen in opencli-connectors/index.json; explizite Overrides gehen vor.
export const OVERRIDES = {
  'peeringdb-at': 'colocation', 'nessus-at': 'business-internet', 'e-control-business-at': 'strom-business',
  'fiberplus-at': 'internet', 'lampert-at': 'internet', 'rtr-at': 'netz',
  'spritpreisrechner-at': 'treibstoff', 'energy-ec-europa-eu': 'heizen', 'energyagency-at': 'energie-index',
  'awattar-at': 'strom', 'e-control-at': 'strom',
};
const RULES = [
  [/pellet|heizöl|heizoel|brennholz/i, 'heizen'],
  [/fernwärme/i, 'gas-fernwaerme'],
  [/gastarif|^gas /i, 'gas-fernwaerme'],
  [/strom/i, 'strom'],
  [/rechenzentr|colocation/i, 'colocation'],
  [/business-internet|glasfaser.*symmetr/i, 'business-internet'],
  [/internet|glasfaser|breitband/i, 'internet'],
];
const SOFT = new Set(['sonstige', 'energie', 'strom', 'adapters', undefined, null, '']);
export function normalizeCategory(c) {
  if (OVERRIDES[c.id]) return OVERRIDES[c.id];
  if (!SOFT.has(c.category)) return c.category;
  const d = c.description || '';
  // Mehrsparten-Versorger (Strom + Gas/Fernwärme) bleiben unter "energie"
  if (/strom/i.test(d) && /gas|fernwärme/i.test(d) && !/^(Gas|Fernwärme)/i.test(d)) return 'energie';
  for (const [re, cat] of RULES) if (re.test(d)) return cat;
  return c.category;
}
