'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ExternalLink, FileImage, Globe2, Image as ImageIcon, Loader2, PencilLine, Search, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';

type Source = { title: string; url: string; kind: string };
type Spec = { label: string; value: string };
type CandidateImage = { url: string; sourceUrl: string; title: string };
type Draft = {
  id: string; identifier: string; sku: string; name: string; manufacturer: string; category: string; package: string; pinCount: string;
  summary: string; specifications: Spec[]; datasheetUrl: string; sources: Source[]; images: CandidateImage[]; imageIndex: number;
  localFile?: File; localPreview?: string; confidence: number; verified: boolean; warnings: string[]; price: string; quantity: string;
  approved: boolean; status: 'waiting' | 'checking' | 'ready' | 'error'; error?: string;
};

const makeSku = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || `PART-${Date.now()}`;
const fileDataUrl = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
const inputClass = 'w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-400';

function emptyDraft(identifier: string, file?: File): Draft {
  return { id: crypto.randomUUID(), identifier, sku: makeSku(identifier), name: identifier, manufacturer: '', category: 'Uncategorized', package: '', pinCount: '', summary: '', specifications: [], datasheetUrl: '', sources: [], images: [], imageIndex: 0, localFile: file, localPreview: file ? URL.createObjectURL(file) : undefined, confidence: 0, verified: false, warnings: [], price: '', quantity: '0', approved: false, status: 'waiting' };
}

export default function SmartProductManager({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const listInput = useRef<HTMLInputElement>(null);
  const partInput = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch('/api/categories').then((r) => r.json()).then((data) => setCategories(data.categories || [])).catch(() => undefined); }, []);

  const addIdentifiers = (values: string[]) => {
    const known = new Set(drafts.map((draft) => draft.identifier.toUpperCase()));
    const additions = values.map((value) => value.trim()).filter(Boolean).filter((value) => { const key = value.toUpperCase(); if (known.has(key)) return false; known.add(key); return true; }).map((value) => emptyDraft(value));
    setDrafts((current) => [...current, ...additions]);
    setMessage(additions.length ? `${additions.length} part${additions.length === 1 ? '' : 's'} ready to verify.` : 'No new parts were added.');
  };
  const addTyped = () => { addIdentifiers(text.split(/[\n,;\t]+/)); setText(''); };

  const extractList = async (file: File) => {
    setBusy(true); setMessage('Reading the list…');
    try {
      const response = await fetch('/api/admin/smart-manager/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: await fileDataUrl(file) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      addIdentifiers(data.parts || []); setMessage(`Found ${data.count} distinct part${data.count === 1 ? '' : 's'}. Review them, then verify.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The list could not be read.'); } finally { setBusy(false); }
  };

  const addPhoto = async (file: File) => {
    const draft = emptyDraft('Component photo', file); setDrafts((current) => [...current, draft]); setBusy(true); setMessage('Reading the component marking…');
    try {
      const response = await fetch('/api/admin/smart-manager/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: await fileDataUrl(file) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      const identifier = data.parts?.[0] || 'Unknown component';
      setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, identifier, sku: makeSku(identifier), name: identifier } : item));
      setMessage('The marking was read. Verify it against online sources next.');
    } catch (error) { setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, status: 'error', error: error instanceof Error ? error.message : 'Could not read the component.' } : item)); } finally { setBusy(false); }
  };

  const verifyOne = async (draft: Draft) => {
    setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, status: 'checking', error: undefined } : item));
    try {
      const image = draft.localFile ? await fileDataUrl(draft.localFile) : undefined;
      const response = await fetch('/api/admin/smart-manager/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: draft.identifier, image }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      const part = data.component;
      setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, identifier: part.partNumber || item.identifier, sku: makeSku(part.partNumber || item.identifier), name: part.name || item.name, manufacturer: part.manufacturer || '', category: part.category || 'Uncategorized', package: part.package || '', pinCount: part.pinCount || '', summary: part.summary || '', specifications: part.specifications || [], datasheetUrl: part.datasheetUrl || '', sources: part.sources || [], images: part.images || [], imageIndex: 0, confidence: part.confidence || 0, verified: Boolean(part.verified), warnings: part.warnings || [], approved: false, status: 'ready' } : item));
    } catch (error) { setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, status: 'error', error: error instanceof Error ? error.message : 'Verification failed.' } : item)); }
  };
  const verifyAll = async () => { setBusy(true); setMessage('Searching trusted engineering sources…'); for (const draft of drafts) await verifyOne(draft); setBusy(false); setMessage('Verification complete. Review every card, add prices, then approve.'); };
  const update = (id: string, changes: Partial<Draft>) => setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...changes } : draft));
  const remove = (id: string) => setDrafts((current) => current.filter((draft) => draft.id !== id));
  const chosenImage = (draft: Draft) => draft.images[draft.imageIndex]?.url || draft.localPreview || '';
  const publishable = useMemo(() => drafts.filter((draft) => draft.approved && draft.status === 'ready' && Number(draft.price) > 0), [drafts]);

  const publish = async () => {
    if (!publishable.length) { setMessage('Approve at least one reviewed card and enter its price first.'); return; }
    setBusy(true); let saved = 0;
    for (const draft of publishable) {
      try {
        const selected = draft.images[draft.imageIndex];
        const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: draft.sku, name: draft.name, category: draft.category, price: Number(draft.price), quantity: Number(draft.quantity) || 0, description: draft.summary, manufacturer: draft.manufacturer, mpn: draft.identifier, package: draft.package, pinCount: draft.pinCount, datasheetUrl: draft.datasheetUrl, specifications: draft.specifications, verificationSources: draft.sources, verificationConfidence: draft.confidence, verificationStatus: draft.verified ? 'verified' : 'needs-review', imageSourceUrl: selected?.sourceUrl || '' }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.message);
        if (draft.localFile && !selected) { const form = new FormData(); form.append('file', draft.localFile); form.append('sku', draft.sku); form.append('alt', `${draft.name} component`); const upload = await fetch('/api/admin/products/image', { method: 'POST', body: form }); if (!upload.ok) throw new Error((await upload.json()).message); }
        else if (selected) { const upload = await fetch('/api/admin/products/image-from-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: draft.sku, url: selected.url, alt: `${draft.name} component` }) }); if (!upload.ok) throw new Error((await upload.json()).message); }
        saved += 1; update(draft.id, { approved: false });
      } catch (error) { update(draft.id, { error: error instanceof Error ? error.message : 'Publishing failed.' }); }
    }
    setBusy(false); setMessage(`${saved} component${saved === 1 ? '' : 's'} published. Cards with errors were kept for review.`); if (saved) onComplete();
  };

  return <section className="mb-10 rounded-2xl border border-violet-500/40 bg-slate-900 p-5 shadow-2xl sm:p-7">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-sm text-violet-200"><Sparkles size={16}/> Super Smart Manager</div><h2 className="text-3xl font-bold text-white">Add components in three easy steps</h2><p className="mt-2 text-slate-300">1. Tell us the parts. 2. Let AI verify them online. 3. You set the price and approve.</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"><ShieldCheck className="mr-2 inline" size={18}/><strong>Prices are admin-only.</strong> AI never fills them.</div></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4"><PencilLine className="mb-3 text-violet-300"/><h3 className="font-bold text-white">Type part numbers</h3><p className="mb-3 text-sm text-slate-400">One per line, or paste a whole list.</p><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder={'IRF3207\nLNK625PG\nA1106'} className={inputClass}/><button onClick={addTyped} disabled={!text.trim() || busy} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold hover:bg-violet-500 disabled:opacity-40">Add this list</button></div>
      <button type="button" onClick={() => listInput.current?.click()} disabled={busy} className="rounded-2xl border border-dashed border-blue-400/60 bg-blue-500/10 p-6 text-left hover:bg-blue-500/20 disabled:opacity-40"><FileImage className="mb-4 text-blue-300" size={34}/><h3 className="text-lg font-bold text-white">Upload a list or screenshot</h3><p className="mt-2 text-sm text-slate-300">Use a clear screenshot, photo, PDF, CSV, or text file. We extract every visible part number for your review.</p><span className="mt-6 inline-flex items-center gap-2 font-bold text-blue-200"><Upload size={18}/> Choose list file</span><input ref={listInput} hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/csv,text/plain,.csv,.txt,.pdf" onChange={(event) => event.target.files?.[0] && extractList(event.target.files[0])}/></button>
      <button type="button" onClick={() => partInput.current?.click()} disabled={busy} className="rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-500/10 p-6 text-left hover:bg-emerald-500/20 disabled:opacity-40"><ImageIcon className="mb-4 text-emerald-300" size={34}/><h3 className="text-lg font-bold text-white">Upload a component photo</h3><p className="mt-2 text-sm text-slate-300">Show the face, marking, full body, and pins as clearly as possible.</p><span className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-200"><Upload size={18}/> Choose part photo</span><input ref={partInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && addPhoto(event.target.files[0])}/></button>
    </div>
    {message && <div aria-live="polite" className="mt-5 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200">{busy && <Loader2 className="mr-2 inline animate-spin" size={18}/>} {message}</div>}
    {drafts.length > 0 && <><div className="my-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-2xl font-bold">Review queue ({drafts.length})</h3><p className="text-sm text-slate-400">Nothing is published automatically.</p></div><button onClick={verifyAll} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-40">{busy ? <Loader2 className="animate-spin" size={18}/> : <Globe2 size={18}/>} Verify all on the internet</button></div>
      <div className="grid gap-5 xl:grid-cols-2">{drafts.map((draft) => { const image = chosenImage(draft); return <article key={draft.id} className={`overflow-hidden rounded-2xl border bg-slate-950 ${draft.approved ? 'border-emerald-400' : 'border-slate-700'}`}>
        <div className="grid min-h-64 sm:grid-cols-[42%_1fr]"><div className="relative flex min-h-56 items-center justify-center bg-white p-4">{image ? <img src={image} alt={draft.name} className="max-h-56 max-w-full object-contain"/> : <div className="text-center text-slate-500"><ImageIcon className="mx-auto mb-2"/><span>No verified image yet</span></div>}{draft.images.length > 1 && <div className="absolute inset-x-2 bottom-2 flex justify-between"><button aria-label="Previous image" onClick={() => update(draft.id, { imageIndex: (draft.imageIndex - 1 + draft.images.length) % draft.images.length })} className="rounded-full bg-black/75 p-2"><ChevronLeft/></button><span className="rounded-full bg-black/75 px-3 py-2 text-xs">{draft.imageIndex + 1}/{draft.images.length}</span><button aria-label="Next image" onClick={() => update(draft.id, { imageIndex: (draft.imageIndex + 1) % draft.images.length })} className="rounded-full bg-black/75 p-2"><ChevronRight/></button></div>}</div>
          <div className="space-y-3 p-4"><div className="flex justify-between gap-2"><div><div className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${draft.verified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>{draft.status === 'checking' ? 'Checking…' : draft.verified ? `Verified ${draft.confidence}%` : draft.status === 'ready' ? `Needs review ${draft.confidence}%` : 'Waiting for verification'}</div><h4 className="mt-2 text-xl font-bold text-white">{draft.name}</h4><p className="text-sm text-slate-400">{draft.manufacturer} {draft.identifier}</p></div><button aria-label="Remove" onClick={() => remove(draft.id)} className="h-10 rounded-lg p-2 text-red-300 hover:bg-red-500/20"><Trash2 size={18}/></button></div>
          <label className="block text-xs text-slate-400">Part number<input className={inputClass} value={draft.identifier} onChange={(event) => update(draft.id, { identifier: event.target.value, approved: false })}/></label><label className="block text-xs text-slate-400">Product name<input className={inputClass} value={draft.name} onChange={(event) => update(draft.id, { name: event.target.value, approved: false })}/></label>
          {draft.status !== 'checking' && <button onClick={() => verifyOne(draft)} disabled={busy} className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200"><Search size={16}/> {draft.status === 'ready' ? 'Search again' : 'Verify this part'}</button>}</div></div>
        {draft.status === 'ready' && <div className="space-y-4 border-t border-slate-700 p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">SKU<input className={inputClass} value={draft.sku} onChange={(event) => update(draft.id, { sku: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Category<input list="smart-categories" className={inputClass} value={draft.category} onChange={(event) => update(draft.id, { category: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Package<input className={inputClass} value={draft.package} onChange={(event) => update(draft.id, { package: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Pins<input className={inputClass} value={draft.pinCount} onChange={(event) => update(draft.id, { pinCount: event.target.value, approved: false })}/></label></div>
          <label className="block text-xs text-slate-400">Short description<textarea rows={2} className={inputClass} value={draft.summary} onChange={(event) => update(draft.id, { summary: event.target.value, approved: false })}/></label>
          {draft.specifications.length > 0 && <div><h5 className="mb-2 text-sm font-bold text-slate-200">Vital specifications</h5><dl className="grid gap-2 sm:grid-cols-2">{draft.specifications.map((spec, index) => <div key={`${spec.label}-${index}`} className="rounded-lg bg-slate-900 p-2"><dt className="text-xs text-slate-400">{spec.label}</dt><dd className="text-sm text-white">{spec.value}</dd></div>)}</dl></div>}
          {(draft.warnings.length > 0 || draft.error) && <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100"><AlertTriangle className="mr-2 inline" size={17}/>{draft.error || draft.warnings.join(' ')}</div>}
          {draft.sources.length > 0 && <div><h5 className="mb-2 text-sm font-bold text-slate-200">Evidence</h5><div className="flex flex-wrap gap-2">{draft.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-blue-200 hover:bg-slate-700"><ExternalLink size={12}/><span className="truncate">{source.title || source.kind}</span></a>)}</div></div>}
          <div className="grid gap-3 border-t border-slate-700 pt-4 sm:grid-cols-2"><label className="text-sm font-bold text-amber-200">Admin price (GHS) — required<input type="number" min="0.01" step="0.01" placeholder="Enter the selling price" className={`${inputClass} mt-1 border-amber-400/70`} value={draft.price} onChange={(event) => update(draft.id, { price: event.target.value, approved: false })}/></label><label className="text-sm text-slate-300">Quantity<input type="number" min="0" className={`${inputClass} mt-1`} value={draft.quantity} onChange={(event) => update(draft.id, { quantity: event.target.value, approved: false })}/></label></div>
          <button onClick={() => Number(draft.price) > 0 ? update(draft.id, { approved: !draft.approved, error: undefined }) : update(draft.id, { error: 'Enter the admin price before approving this card.' })} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold ${draft.approved ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}><Check size={18}/>{draft.approved ? 'Approved by admin' : 'Approve this component'}</button>
        </div>}
      </article>})}</div>
      <datalist id="smart-categories">{categories.map((category) => <option key={category} value={category}/>)}</datalist>
      <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-xl font-bold text-white">Ready to publish: {publishable.length}</h3><p className="text-sm text-emerald-100">Only cards you priced and approved will be saved.</p></div><button onClick={publish} disabled={busy || !publishable.length} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold hover:bg-emerald-500 disabled:opacity-40">Publish approved components</button></div></div></>}
  </section>;
}
