const CHARACTER_KEYS = [
  ['SPY', 'Scout'],
  ['ASSASSIN', 'Blade'],
  ['DIPLOMAT', 'Envoy'],
  ['ADMIRAL', 'Fleet'],
  ['GENERAL', 'Army'],
  ['NAMED_CHARACTER', 'Notable'],
  ['MERCHANT', 'Merchant'],
  ['VILLAGE', 'Village'],
  ['TOWN', 'Town'],
  ['LARGE_TOWN', 'Large Town'],
  ['CITY', 'City'],
  ['LARGE_CITY', 'Large City'],
  ['HUGE_CITY', 'Huge City'],
  ['CAPITAL', 'Capital'],
  ['FORT', 'Fort'],
  ['PORT', 'Port'],
  ['DOCK', 'Docks'],
  ['FISHING_VILLAGE', 'Fishing Village'],
];

function keyUpper(key) {
  return String(key || '').replace(/^\{/, '').replace(/\}$/, '').toUpperCase();
}

export function ensureRtwFactionLocEntries(entries, factionName, options = {}) {
  const factionUpper = keyUpper(factionName);
  if (!factionUpper) return entries || [];

  const displayName = String(options.displayName || '').trim() || factionName;
  const adjective = String(options.adjective || '').trim() || displayName;
  const leaderTitle = String(options.leaderTitle || '').trim() || 'Faction Leader';
  const heirTitle = String(options.heirTitle || '').trim() || 'Faction Heir';

  const next = (entries || []).map(entry => ({
    key: String(entry.key || '').replace(/^\{/, '').replace(/\}$/, ''),
    value: entry.value ?? '',
  }));
  const indexByKey = new Map(next.map((entry, index) => [keyUpper(entry.key), index]));

  const upsert = (key, value, force = false) => {
    const normalized = keyUpper(key);
    const index = indexByKey.get(normalized);
    if (index === undefined) {
      indexByKey.set(normalized, next.length);
      next.push({ key, value });
      return;
    }
    if (force || !String(next[index].value ?? '').trim()) {
      next[index] = { ...next[index], key, value };
    }
  };

  upsert(factionUpper, displayName, !!options.displayName);
  for (const [key, label] of CHARACTER_KEYS) {
    upsert(`EMT_${factionUpper}_${key}`, `${adjective} ${label}`);
  }
  upsert(`EMT_${factionUpper}_FACTION_LEADER`, leaderTitle, !!options.leaderTitle);
  upsert(`EMT_${factionUpper}_FACTION_HEIR`, heirTitle, !!options.heirTitle);

  upsert(`EMT_YOUR_FORCES_ATTACK_ARMY_${factionUpper}`, `Your forces attack an army of the ${displayName}`);
  upsert(`EMT_YOUR_FORCES_ATTACK_NAVY_${factionUpper}`, `Your forces attack a navy of the ${displayName}`);
  upsert(`EMT_YOUR_FORCES_AMBUSH_ARMY_${factionUpper}`, `Your forces ambush an army of the ${displayName}`);
  upsert(`EMT_YOUR_FORCES_ATTACKED_ARMY_${factionUpper}`, `Your forces are attacked by an army of the ${displayName}`);
  upsert(`EMT_YOUR_FORCES_ATTACKED_NAVY_${factionUpper}`, `Your forces are attacked by a navy of the ${displayName}`);
  upsert(`EMT_YOUR_FORCES_AMBUSHED_ARMY_${factionUpper}`, `Your forces are ambushed by an army of the ${displayName}`);
  upsert(`EMT_VICTORY_${factionUpper}`, `The ${displayName} are victorious`);
  upsert(`EMT_VICTORY_DESCR_${factionUpper}`, `The ${displayName} have prevailed.`);
  upsert(`EMT_DEFEATED_BY_${factionUpper}`, `The ${displayName} have triumphed over their enemies.`);
  upsert(`EMT_SHORT_VICTORY_${factionUpper}`, `${displayName} commands the world.`);
  upsert(`${factionUpper}_DESCR`, `${adjective}s`);

  return next;
}

export function extractFactionIdsFromLocEntries(entries) {
  const ids = new Set();
  const add = (value) => {
    const id = keyUpper(value);
    if (id) ids.add(id.toLowerCase());
  };

  for (const entry of entries || []) {
    const key = keyUpper(entry.key);
    let match;
    if ((match = key.match(/^EMT_(YOUR_FORCES_(?:ATTACK|ATTACKED|AMBUSH|AMBUSHED)_(?:ARMY|NAVY)|VICTORY|VICTORY_DESCR|DEFEATED_BY|SHORT_VICTORY)_([A-Z0-9_]+)$/))) {
      add(match[2]);
    } else if ((match = key.match(/^EMT_([A-Z0-9_]+)_(SPY|ASSASSIN|DIPLOMAT|ADMIRAL|GENERAL|NAMED_CHARACTER|MERCHANT|VILLAGE|TOWN|LARGE_TOWN|CITY|LARGE_CITY|HUGE_CITY|CAPITAL|FORT|PORT|DOCK|FISHING_VILLAGE|FACTION_LEADER|FACTION_HEIR)$/))) {
      add(match[1]);
    } else if ((match = key.match(/^([A-Z0-9_]+)_DESCR$/))) {
      add(match[1]);
    } else if (/^[A-Z0-9_]+$/.test(key) && !key.startsWith('EMT_') && !key.startsWith('UI_')) {
      add(key);
    }
  }

  return [...ids].sort();
}
