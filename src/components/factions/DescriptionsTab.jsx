import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Upload, Download, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseStringsBin, encodeStringsBin } from '@/components/strings/stringsBinCodec';

const GLOBAL_STRINGS_KEY = 'm2tw_strings_bin_global';

export default function DescriptionsTab({ factionName }) {
  const [stringsBinEntries, setStringsBinEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [magicValues, setMagicValues] = useState({ magic1: 2, magic2: 2048 });
  const stringsBinRef = useRef();

  const loadStringsBin = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const parsed = parseStringsBin(arrayBuffer);
    if (parsed && parsed.entries) {
      // Store all entries globally
      setAllEntries(parsed.entries);
      setMagicValues({ magic1: parsed.magic1, magic2: parsed.magic2 });
      localStorage.setItem(GLOBAL_STRINGS_KEY, JSON.stringify({
        entries: parsed.entries,
        magic1: parsed.magic1,
        magic2: parsed.magic2
      }));
    }
    e.target.value = '';
  }, []);

  const exportStringsBin = () => {
    if (allEntries.length === 0) return;
    const buffer = encodeStringsBin(allEntries, magicValues.magic1, magicValues.magic2);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'expanded.txt.strings.bin';
    a.click();
  };

  const updateStringValue = (key, newValue) => {
    // Update the filtered entry
    setStringsBinEntries((prev) =>
    prev.map((entry) => entry.key === key ? { ...entry, value: newValue } : entry)
    );
    // Also update the full stored data
    const updatedEntries = allEntries.map((entry) =>
    entry.key === key ? { ...entry, value: newValue } : entry
    );
    setAllEntries(updatedEntries);
    localStorage.setItem(GLOBAL_STRINGS_KEY, JSON.stringify({
      entries: updatedEntries,
      magic1: magicValues.magic1,
      magic2: magicValues.magic2
    }));
  };

  useEffect(() => {
    // Load global strings.bin data
    const loadStrings = () => {
      try {
        const stored = localStorage.getItem(GLOBAL_STRINGS_KEY);
        if (stored) {
          const { entries, magic1, magic2 } = JSON.parse(stored);
          setAllEntries(entries);
          setMagicValues({ magic1, magic2 });
          // Filter entries for current faction
          const factionUpper = factionName.toUpperCase();
          const filtered = entries.filter((entry) =>
          entry.key && entry.key.toUpperCase().includes(factionUpper)
          );
          setStringsBinEntries(filtered);
        }
      } catch {}
    };

    loadStrings();

    // Listen for updates from other editors
    window.addEventListener('strings-bin-updated', loadStrings);
    return () => window.removeEventListener('strings-bin-updated', loadStrings);
  }, [factionName]);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySource, setCopySource] = useState('');

  // Distinct faction names present in the loaded strings, excluding current
  const sourceFactions = useMemo(() => {
    const names = new Set();
    for (const e of allEntries) {
      const m = e.key?.match(/^(?:EMT_)?([A-Z0-9_]+?)(?:_FACTION|_STRENGTH|_WEAKNESS|_UNIT|$)/);
      if (m) names.add(m[1].toLowerCase());
    }
    names.delete(factionName.toLowerCase());
    return [...names].sort();
  }, [allEntries, factionName]);

  const confirmCopyFromFaction = () => {
    if (!copySource) return;
    const srcUpper = copySource.toUpperCase();
    const dstUpper = factionName.toUpperCase();
    const srcEntries = allEntries.filter(e => e.key?.toUpperCase().includes(srcUpper));
    const newEntries = srcEntries.map(e => ({
      key: e.key.replace(new RegExp(srcUpper, 'g'), dstUpper),
      value: e.value
    }));
    // Remove any existing entries for this faction, then add new ones
    const filtered = allEntries.filter(e => !e.key?.toUpperCase().includes(dstUpper));
    const updated = [...filtered, ...newEntries];
    setAllEntries(updated);
    setStringsBinEntries(newEntries);
    localStorage.setItem(GLOBAL_STRINGS_KEY, JSON.stringify({
      entries: updated,
      magic1: magicValues.magic1,
      magic2: magicValues.magic2
    }));
    window.dispatchEvent(new CustomEvent('strings-bin-updated'));
    setShowCopyModal(false);
    setCopySource('');
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-600 pb-2">
        <p className="text-sm font-semibold text-slate-200">expanded.txt.strings.bin Editor</p>
        <p className="text-xs text-slate-400">Edit strings.bin entries for {factionName}</p>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-300">strings.bin file</label>
        <div className="flex gap-2">
          <input ref={stringsBinRef} type="file" accept=".bin" className="hidden" onChange={loadStringsBin} />
          <Button variant="outline" size="sm" className="text-[10px]" onClick={() => stringsBinRef.current?.click()}>
            <Upload className="w-3 h-3 mr-1" /> Load
          </Button>
          {allEntries.length > 0 &&
          <Button variant="outline" size="sm" className="text-[10px]" onClick={exportStringsBin}>
              <Download className="w-3 h-3 mr-1" /> Export
            </Button>
          }
        </div>
      </div>

      {/* Copy-from-faction modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 w-72 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Copy Entries From Faction</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Copy all string entries from another faction and remap the keys to <span className="font-mono text-amber-400">{factionName}</span>.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Source Faction</label>
              {sourceFactions.length > 0 ? (
                <select value={copySource} onChange={e => setCopySource(e.target.value)}
                  className="w-full h-7 px-2 text-[11px] bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-blue-500">
                  <option value="">— select faction —</option>
                  {sourceFactions.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              ) : (
                <p className="text-[10px] text-slate-500 italic">No other factions found in strings.bin.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowCopyModal(false)}
                className="px-3 py-1 rounded text-[11px] border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors">
                Cancel
              </button>
              <button onClick={confirmCopyFromFaction} disabled={!copySource}
                className="px-3 py-1 rounded text-[11px] bg-blue-600/30 border border-blue-500/50 text-blue-300 hover:bg-blue-600/50 disabled:opacity-40 transition-colors">
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {stringsBinEntries.length > 0 ?
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {stringsBinEntries.map((entry, idx) =>
        <div key={idx} className="bg-slate-800 border border-slate-600 rounded p-3">
              <div className="text-[9px] font-mono text-slate-500 mb-2 select-all">
                {'{'}{entry.key}{'}'}
              </div>
              <textarea
            className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-[10px] text-slate-100 resize-none"
            rows={2}
            value={entry.value}
            onChange={(e) => updateStringValue(entry.key, e.target.value)} />
            </div>
        )}
        </div> :

      <div className="flex flex-col items-center gap-3 py-8 text-slate-500 border border-dashed border-slate-700 rounded">
          <p className="text-xs">No entries for <span className="font-mono text-amber-400">{factionName}</span> in the loaded strings.bin.</p>
          {allEntries.length > 0 && (
            <Button variant="outline" size="sm" className="text-[10px] text-blue-300 border-blue-600 hover:bg-blue-900/30"
              onClick={() => { setCopySource(''); setShowCopyModal(true); }}>
              <Copy className="w-3 h-3 mr-1" /> Copy from another faction…
            </Button>
          )}
          {allEntries.length === 0 && (
            <p className="text-[10px]">Load a strings.bin file first.</p>
          )}
        </div>
      }
    </div>);

}