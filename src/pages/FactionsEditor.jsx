import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Save, ChevronRight, Loader2, Plus, Upload, CheckCircle2 } from 'lucide-react';

// ── descr_sm_factions.txt parser ─────────────────────────────────────────────
function parseDescrSmFactions(text) {
  const factions = [];
  const lines = text.split('\n');
  let i = 0;

  const peek = () => lines[i]?.replace(/;.*$/, '').trim() ?? null;
  const next = () => { const l = peek(); i++; return l; };

  while (i < lines.length) {
    const line = peek();
    if (line === null) { i++; continue; }
    const facMatch = line.match(/^faction\s+(\S+)/);
    if (!facMatch) { i++; continue; }
    const faction = {
      name_in: facMatch[1],
      name_out: facMatch[1],
      culture: '', religion: '', music: '', special_type: '',
      color1_r: 0, color1_g: 0, color1_b: 0,
      color2_r: 0, color2_g: 0, color2_b: 0,
      custom_battle: false, naval_invasion: false, has_princess: false,
      can_death: false, disband_pool: false, build_tower: false,
      reemergent: false, undiscovered: false,
      dead_until_resurrected: false, dead_until_emerged: false,
      can_horde: false, horde_min_units: 1, horde_max_units: 1,
      playability: 0, money: 0, kings_purse: 0,
      label_ai: 'default', economic_ai: 'balanced', military_ai: 'caesar',
      short_victory_hold: 0, long_victory_hold: 0,
      emerging: 'spawned_on_event',
    };
    i++;
    // find opening brace
    while (i < lines.length && peek() !== '{') i++;
    i++; // skip {
    let depth = 1;
    while (i < lines.length && depth > 0) {
      const l = next();
      if (l === null || l === '') continue;
      if (l === '{') { depth++; continue; }
      if (l === '}') { depth--; continue; }
      // key-value pairs
      const kv = l.match(/^(\S+)\s*(.*)/);
      if (!kv) continue;
      const [, key, val] = kv;
      const v = val.trim();
      switch (key) {
        case 'culture':          faction.culture = v; break;
        case 'religion':         faction.religion = v; break;
        case 'music':            faction.music = v; break;
        case 'special':          faction.special_type = v; break;
        case 'primary_colour': case 'primary_color': {
          const m = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
          if (m) { faction.color1_r = +m[1]; faction.color1_g = +m[2]; faction.color1_b = +m[3]; }
          break;
        }
        case 'secondary_colour': case 'secondary_color': {
          const m = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
          if (m) { faction.color2_r = +m[1]; faction.color2_g = +m[2]; faction.color2_b = +m[3]; }
          break;
        }
        case 'playable':         faction.playability = 1; break;
        case 'unlockable':       faction.playability = 2; break;
        case 'custom_battle_only': faction.custom_battle = true; break;
        case 'naval_invasion':   faction.naval_invasion = true; break;
        case 'has_princess':     faction.has_princess = true; break;
        case 'can_die':          faction.can_death = true; break;
        case 'disband_to_pool':  faction.disband_pool = true; break;
        case 'build_tower_on_resource': faction.build_tower = true; break;
        case 'reemergent':       faction.reemergent = true; break;
        case 'undiscovered':     faction.undiscovered = true; break;
        case 'dead_until_resurrected': faction.dead_until_resurrected = true; break;
        case 'dead_until_emerged': faction.dead_until_emerged = true; break;
        case 'can_horde':        faction.can_horde = true; break;
        case 'horde_min_units':  faction.horde_min_units = +v || 1; break;
        case 'horde_max_units':  faction.horde_max_units = +v || 1; break;
        case 'ai_label':         faction.label_ai = v || 'default'; break;
        case 'ai_economic_bias': faction.economic_ai = v; break;
        case 'ai_military_bias': faction.military_ai = v; break;
        case 'short_campaign_win_condition': faction.short_victory_hold = parseInt(v) || 0; break;
        case 'long_campaign_win_condition':  faction.long_victory_hold  = parseInt(v) || 0; break;
        case 'starting_money':   faction.money = parseInt(v) || 0; break;
        case 'starting_purse':   faction.kings_purse = parseInt(v) || 0; break;
        case 'emergent':         faction.emerging = 'spawned_on_event'; break;
        case 'shadowed_by':      faction.emerging = 'shadowed_by'; break;
        case 'shadowing':        faction.emerging = 'shadowing'; break;
        default: break;
      }
    }
    factions.push(faction);
  }
  return factions;
}

const PLAYABILITY_LABELS = { 0: 'Not Playable', 1: 'Playable', 2: 'Unlockable', 3: 'Hidden' };
const ECONOMIC_AI_OPTIONS = ['balanced', 'religious', 'trader', 'comfortable', 'bureaucrat', 'craftsman', 'sailor', 'fortified'];
const MILITARY_AI_OPTIONS = ['smith', 'mao', 'genghis', 'stalin', 'napoleon', 'henry', 'caesar'];

function ColorSwatch({ r, g, b }) {
  return (
    <div
      className="w-4 h-4 rounded border border-slate-600 shrink-0"
      style={{ background: `rgb(${r},${g},${b})` }}
    />
  );
}

function FactionDetailEditor({ faction, onSave, onClose }) {
  const [form, setForm] = useState({ ...faction });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Faction.update(faction.id, form);
    setSaving(false);
    onSave(form);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-100">{form.name_out || form.name_in}</div>
          <div className="text-[10px] text-slate-500 font-mono">{form.name_in}</div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xs px-2 py-1">✕ Back</button>
      </div>

      {/* Playability */}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Playability</label>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(PLAYABILITY_LABELS).map(([val, label]) => (
            <button
              key={val}
              onClick={() => set('playability', Number(val))}
              className={`py-1.5 rounded text-[10px] font-semibold border transition-colors ${
                form.playability === Number(val)
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Economic AI */}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Economic AI</label>
        <select
          value={form.economic_ai || ''}
          onChange={e => set('economic_ai', e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
        >
          <option value="">— none —</option>
          {ECONOMIC_AI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Military AI */}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Military AI</label>
        <select
          value={form.military_ai || ''}
          onChange={e => set('military_ai', e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
        >
          <option value="">— none —</option>
          {MILITARY_AI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Primary Color</label>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded border border-slate-600" style={{ background: `rgb(${form.color1_r},${form.color1_g},${form.color1_b})` }} />
          <div className="grid grid-cols-3 gap-1 flex-1">
            {['r','g','b'].map((c,i) => {
              const key = `color1_${c}`;
              return (
                <div key={c} className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-500 uppercase">{c}</span>
                  <input type="number" min={0} max={255} value={form[key] ?? 0}
                    onChange={e => set(key, Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-200"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Secondary Color</label>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded border border-slate-600" style={{ background: `rgb(${form.color2_r},${form.color2_g},${form.color2_b})` }} />
          <div className="grid grid-cols-3 gap-1 flex-1">
            {['r','g','b'].map((c) => {
              const key = `color2_${c}`;
              return (
                <div key={c} className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-500 uppercase">{c}</span>
                  <input type="number" min={0} max={255} value={form[key] ?? 0}
                    onChange={e => set(key, Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-200"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Extra flags */}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Flags</label>
        <div className="grid grid-cols-2 gap-1">
          {['custom_battle','naval_invasion','has_princess','can_death','disband_pool','build_tower','reemergent','undiscovered'].map(flag => (
            <label key={flag} className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
              <input type="checkbox" checked={!!form[flag]} onChange={e => set(flag, e.target.checked)}
                className="w-3 h-3 accent-primary" />
              {flag.replace(/_/g,' ')}
            </label>
          ))}
        </div>
      </div>

      {/* Money */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Money</label>
          <input type="number" value={form.money ?? 0} onChange={e => set('money', Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">King's Purse</label>
          <input type="number" value={form.kings_purse ?? 0} onChange={e => set('kings_purse', Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/80 disabled:opacity-50 transition-colors mt-auto"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        Save Faction
      </button>
    </div>
  );
}

export default function FactionsEditor() {
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const fileLoaded = !!(() => { try { return localStorage.getItem('m2tw_factions_file'); } catch { return null; } })();

  useEffect(() => {
    base44.entities.Faction.list().then(data => {
      setFactions(data);
      setLoading(false);
    });
  }, []);

  const handleImportFromFile = async () => {
    const raw = (() => { try { return localStorage.getItem('m2tw_factions_file'); } catch { return null; } })();
    if (!raw) return;
    setImporting(true);
    setImportDone(false);
    try {
      const parsed = parseDescrSmFactions(raw);
      // Delete all existing factions then bulk-create
      const existing = await base44.entities.Faction.list();
      for (const f of existing) {
        await base44.entities.Faction.delete(f.id);
      }
      const created = await base44.entities.Faction.bulkCreate(parsed);
      setFactions(Array.isArray(created) ? created : parsed);
      setSelected(null);
      setImportDone(true);
    } finally {
      setImporting(false);
    }
  };

  const filtered = factions.filter(f =>
    !search || (f.name_in + ' ' + (f.name_out || '')).toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (updated) => {
    setFactions(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } : f));
    setSelected(s => s ? { ...s, ...updated } : s);
  };

  return (
    <div className="dark h-screen flex flex-col bg-slate-950 text-slate-200">
      <div className="h-9 border-b border-slate-800 flex items-center px-3 gap-2 shrink-0 bg-slate-900/80">
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold">Factions Editor</span>
        <span className="text-[10px] text-slate-500 ml-1">({factions.length} factions)</span>
        <div className="ml-auto flex items-center gap-2">
          {importDone && <span className="flex items-center gap-1 text-[10px] text-green-400"><CheckCircle2 className="w-3 h-3" /> Imported</span>}
          <button
            onClick={handleImportFromFile}
            disabled={!fileLoaded || importing}
            title={fileLoaded ? 'Import factions from loaded descr_sm_factions.txt' : 'Load descr_sm_factions.txt on Home first'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Import from descr_sm_factions.txt
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="w-64 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-2 border-b border-slate-800 space-y-1.5">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search factions…"
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500"
            />
            <button
              onClick={async () => {
                const newFaction = await base44.entities.Faction.create({ name_in: 'new_faction', name_out: 'New Faction', playability: 0 });
                setFactions(prev => [newFaction, ...prev]);
                setSelected(newFaction);
              }}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded bg-slate-700 border border-slate-600 text-xs text-slate-200 hover:bg-slate-600 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Faction
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                No factions found.<br />
                <span className="text-[10px]">Import a campaign folder first.</span>
              </div>
            )}
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-slate-800/60 hover:bg-slate-800/60 transition-colors ${selected?.id === f.id ? 'bg-slate-800' : ''}`}
              >
                <div className="flex gap-1">
                  <ColorSwatch r={f.color1_r} g={f.color1_g} b={f.color1_b} />
                  <ColorSwatch r={f.color2_r} g={f.color2_g} b={f.color2_b} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{f.name_out || f.name_in}</div>
                  <div className="text-[10px] text-slate-500">{PLAYABILITY_LABELS[f.playability] ?? 'Unknown'}</div>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <FactionDetailEditor
              key={selected.id}
              faction={selected}
              onSave={handleSave}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
              <Shield className="w-8 h-8 text-slate-700" />
              <p className="text-sm text-slate-500">Select a faction to edit</p>
              <p className="text-[10px] text-slate-600">Changes are saved directly to the database</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}