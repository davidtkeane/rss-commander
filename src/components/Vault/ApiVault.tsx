import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Eye, EyeOff, Copy, Trash2, Check, KeyRound, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useStore } from '../../store/useStore';
import { maskValue, getServiceIcon, generateId, KNOWN_SERVICES } from '../../services/vaultService';
import type { VaultEntry } from '../../types';

const KEY_TYPES = ['api_key', 'secret', 'token', 'password', 'webhook', 'other'] as const;

export default function ApiVault() {
  const { vault, addVaultEntry, removeVaultEntry } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    service: '', label: '', keyType: 'api_key' as VaultEntry['keyType'],
    value: '', description: '', tags: '',
  });

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copy = async (entry: VaultEntry) => {
    await navigator.clipboard.writeText(entry.value);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdd = () => {
    if (!form.service || !form.value) return;
    addVaultEntry({
      service: form.service, label: form.label || form.service,
      keyType: form.keyType, value: form.value, description: form.description,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      isMasked: true,
    });
    setForm({ service: '', label: '', keyType: 'api_key', value: '', description: '', tags: '' });
    setAddOpen(false);
  };

  const displayed = vault.filter(e =>
    !search ||
    e.service.toLowerCase().includes(search.toLowerCase()) ||
    e.label.toLowerCase().includes(search.toLowerCase())
  );

  const expiringCount = vault.filter(e => {
    if (!e.expiresAt) return false;
    return e.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound size={20} className="text-brand" /> API Vault
          </h1>
          <p className="font-ui text-xs text-[var(--text-muted)] mt-0.5">Credential storage for threat intel & security APIs</p>
        </div>
        <button onClick={() => setAddOpen(!addOpen)} className="cyber-btn text-xs py-1.5 px-4">
          <Plus size={13} /> Add Key
        </button>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-md px-4 py-3">
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="font-ui text-xs text-amber-400/80">
          Keys stored in browser localStorage. For maximum security, use a dedicated password manager for production credentials.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Keys', value: vault.length, color: 'var(--text-secondary)' },
          { label: 'Expiring Soon', value: expiringCount, color: expiringCount > 0 ? '#f59e0b' : '#22c55e' },
          { label: 'Services', value: new Set(vault.map(v => v.service)).size, color: '#22d3ee' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 flex justify-between items-center">
            <span className="font-ui text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{s.label}</span>
            <span className="stat-number text-lg font-semibold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {addOpen && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-bright)] rounded-md p-4 space-y-3 animate-fade-in">
          <div className="section-header">Add New Credential</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Service *</label>
              <input list="services-list" type="text" placeholder="e.g. Shodan" value={form.service}
                onChange={e => setForm(f => ({ ...f, service: e.target.value }))} className="cyber-input" />
              <datalist id="services-list">
                {KNOWN_SERVICES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Label</label>
              <input type="text" placeholder="e.g. Production key" value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="cyber-input" />
            </div>
            <div>
              <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Key Type *</label>
              <select value={form.keyType} onChange={e => setForm(f => ({ ...f, keyType: e.target.value as VaultEntry['keyType'] }))} className="cyber-input">
                {KEY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Tags (comma-separated)</label>
              <input type="text" placeholder="prod, active" value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="cyber-input" />
            </div>
          </div>
          <div>
            <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Value / Key *</label>
            <input type="password" placeholder="Enter API key or secret" value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="cyber-input font-mono" />
          </div>
          <div>
            <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Description</label>
            <input type="text" placeholder="Optional notes" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="cyber-input" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={!form.service || !form.value} className="cyber-btn text-xs py-1.5 px-5"><Plus size={12} /> Save</button>
            <button onClick={() => setAddOpen(false)} className="cyber-btn-ghost text-xs py-1.5 px-4">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <input type="text" placeholder="Search credentials..." value={search}
        onChange={e => setSearch(e.target.value)} className="cyber-input" />

      {/* Vault entries */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <KeyRound size={32} className="mx-auto mb-3 opacity-20" />
          <div className="font-display text-lg font-semibold">Vault is empty</div>
          <div className="font-ui text-sm mt-1">Add your first API key above</div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(entry => {
            const revealed = revealedIds.has(entry.id);
            const icon = getServiceIcon(entry.service);
            return (
              <div key={entry.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-4 py-3 space-y-2 hover:border-[var(--border-bright)] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-ui font-bold text-sm text-[var(--text-primary)]">{entry.label}</span>
                      <span className="cat-badge border-[var(--border)] text-[var(--text-muted)]">{entry.keyType.replace('_', ' ')}</span>
                    </div>
                    <div className="font-ui text-xs text-[var(--text-muted)]">{entry.service}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleReveal(entry.id)} className="p-1.5 rounded text-[var(--text-muted)] hover:text-brand transition-colors" title={revealed ? 'Hide' : 'Reveal'}>
                      {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => copy(entry)} className={clsx('p-1.5 rounded transition-colors', copiedId === entry.id ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-brand')}>
                      {copiedId === entry.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    {confirmDelete === entry.id ? (
                      <>
                        <button onClick={() => { removeVaultEntry(entry.id); setConfirmDelete(null); }} className="text-xs font-ui text-red-400 px-2 py-1 rounded bg-red-500/10 border border-red-500/30">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs font-ui text-[var(--text-muted)] px-2 py-1">No</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(entry.id)} className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div className="font-mono text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-1.5 text-[var(--text-secondary)] break-all select-all">
                  {revealed ? entry.value : maskValue(entry.value)}
                </div>

                {/* Tags + meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.tags?.map(t => (
                    <span key={t} className="font-ui text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                  {entry.description && (
                    <span className="font-ui text-xs text-[var(--text-muted)]">{entry.description}</span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">
                    Added {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
