import { useState } from 'react';
import { User, Copy, Download, Upload, Trash2, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { readFile } from '../../services/exportService';

export default function UserProfile() {
  const { profile, updateProfile, feeds, exportOPML, exportJSON, importOPML } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [copied, setCopied] = useState(false);

  const save = () => { updateProfile(form); setEditing(false); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await readFile(file);
    importOPML(content);
    e.target.value = '';
  };

  const copyFeedList = () => {
    const text = feeds.filter(f => f.enabled).map(f => `• ${f.name}: ${f.url}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enabledFeeds = feeds.filter(f => f.enabled);

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Profile</h1>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Profile Card */}
        <div className="col-span-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-5 flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-full border-2 border-brand bg-brand/10 flex items-center justify-center">
            <span className="font-display font-bold text-brand text-3xl">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-display font-bold text-xl text-[var(--text-primary)]">{profile.name}</div>
            <div className="font-mono text-xs text-brand">@{profile.handle}</div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-1 text-xs font-ui text-[var(--text-secondary)] uppercase tracking-wide">
            {profile.role}
          </div>
          {profile.organization && (
            <div className="text-xs font-ui text-[var(--text-muted)]">{profile.organization}</div>
          )}
          <div className="w-full border-t border-[var(--border)] pt-3 grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="stat-number text-lg text-brand">{enabledFeeds.length}</div>
              <div className="font-ui text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Feeds</div>
            </div>
            <div>
              <div className="stat-number text-lg text-[var(--text-secondary)]">{feeds.length}</div>
              <div className="font-ui text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Total</div>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="cyber-btn-ghost text-xs py-1 px-4 w-full">
            <User size={12} /> {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {/* Right: Edit Form */}
        <div className="col-span-2 space-y-4">
          {editing ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-5 space-y-3">
              <div className="section-header">Edit Profile</div>
              {[
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Handle', key: 'handle', type: 'text' },
                { label: 'Role', key: 'role', type: 'text' },
                { label: 'Organization', key: 'organization', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Website', key: 'website', type: 'url' },
              ].map(field => (
                <div key={field.key}>
                  <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as unknown as Record<string, string>)[field.key] || ''}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="cyber-input"
                  />
                </div>
              ))}
              <div>
                <label className="font-ui text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-1">Bio</label>
                <textarea
                  value={form.bio || ''}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="cyber-input resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={save} className="cyber-btn text-xs py-1.5 px-5"><Check size={12} /> Save</button>
                <button onClick={() => { setEditing(false); setForm({ ...profile }); }} className="cyber-btn-ghost text-xs py-1.5 px-4">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-5 space-y-2">
              <div className="section-header">Profile Info</div>
              {[
                ['Name', profile.name], ['Handle', '@' + profile.handle],
                ['Role', profile.role], ['Organization', profile.organization || '—'],
                ['Email', profile.email || '—'], ['Website', profile.website || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 text-sm py-1 border-b border-[var(--border)] last:border-0">
                  <span className="font-ui font-semibold text-[var(--text-muted)] uppercase tracking-wide text-[11px] w-24 flex-shrink-0 pt-0.5">{k}</span>
                  <span className="font-ui text-[var(--text-secondary)]">{v}</span>
                </div>
              ))}
              {profile.bio && (
                <div className="pt-2 text-sm font-ui text-[var(--text-secondary)] leading-relaxed">{profile.bio}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feed Sharing */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-5">
        <div className="section-header">Share Feed List</div>
        <p className="font-ui text-xs text-[var(--text-muted)] mb-4">
          Share your {enabledFeeds.length} active feeds with colleagues. Export as OPML for use in any RSS reader.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={copyFeedList} className="cyber-btn-ghost text-xs py-1.5 px-4">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy as text'}
          </button>
          <button onClick={exportOPML} className="cyber-btn-ghost text-xs py-1.5 px-4"><Download size={12} /> Export OPML</button>
          <button onClick={exportJSON} className="cyber-btn-ghost text-xs py-1.5 px-4"><Download size={12} /> Export JSON</button>
          <label className="cyber-btn-ghost text-xs py-1.5 px-4 cursor-pointer flex items-center gap-1.5">
            <Upload size={12} /> Import from friend
            <input type="file" accept=".opml,.xml,.json" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-3 max-h-32 overflow-y-auto">
          {enabledFeeds.slice(0, 10).map(f => (
            <div key={f.id} className="font-mono text-[10px] text-[var(--text-muted)] truncate py-0.5">
              {f.name} — <span className="text-[var(--text-secondary)]">{f.url}</span>
            </div>
          ))}
          {enabledFeeds.length > 10 && (
            <div className="font-mono text-[10px] text-[var(--text-muted)]">...and {enabledFeeds.length - 10} more</div>
          )}
        </div>
      </div>
    </div>
  );
}
