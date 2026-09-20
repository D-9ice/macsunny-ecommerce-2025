'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, FileImage, Globe2, Image as ImageIcon, LayoutGrid, Loader2, PackagePlus, Save, Search, ShieldCheck, Sparkles, Tags, Trash2, Upload } from 'lucide-react';
import type { Product } from '@/app/lib/products';

type Source = { title: string; url: string; kind: string };
type Spec = { label: string; value: string };
type CandidateImage = { url: string; fallbackUrl?: string; sourceUrl: string; title: string };
type Draft = {
  id: string; identifier: string; sku: string; name: string; manufacturer: string; category: string; package: string; pinCount: string;
  searchQuery?: string;
  summary: string; specifications: Spec[]; datasheetUrl: string; sources: Source[]; images: CandidateImage[]; imageIndex: number;
  localFile?: File; localPreview?: string; localImageSuitable?: boolean; confidence: number; verified: boolean; warnings: string[]; price: string; quantity: string;
  approved: boolean; status: 'waiting' | 'checking' | 'ready' | 'error'; error?: string;
};
type Workspace = 'add' | 'inventory' | 'categories';

const makeSku = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || `PART-${Date.now()}`;
const isKnownIdentity = (value: string) => Boolean(value.trim()) && !/^(?:not identified|unknown(?:\s*\/\s*unmarked)?|unknown(?: electronics item| component)?|unmarked|generic|n\/a|not applicable)$/i.test(value.trim());
const normalizePhoto = async (file: File) => {
  if (!file.type.startsWith('image/')) throw new Error('Choose a supported image file.');
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('This photo format could not be opened. Please use JPG, PNG, or WebP.'));
      element.src = sourceUrl;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser could not prepare this photo.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob) throw new Error('The browser could not prepare this photo.');
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'component'}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } finally { URL.revokeObjectURL(sourceUrl); }
};
const inputClass = 'w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-400';

function emptyDraft(identifier: string, file?: File): Draft {
  return { id: crypto.randomUUID(), identifier, sku: makeSku(identifier), name: identifier, manufacturer: '', category: 'Uncategorized', package: '', pinCount: '', summary: '', specifications: [], datasheetUrl: '', sources: [], images: [], imageIndex: 0, localFile: file, localPreview: file ? URL.createObjectURL(file) : undefined, confidence: 0, verified: false, warnings: [], price: '', quantity: '0', approved: false, status: 'waiting' };
}

export default function SmartProductManager({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [workspace, setWorkspace] = useState<Workspace>('add');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [replacementImage, setReplacementImage] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const listInput = useRef<HTMLInputElement>(null);
  const partInput = useRef<HTMLInputElement>(null);

  const loadCategories = async () => { const response = await fetch('/api/categories'); const data = await response.json(); if (response.ok) setCategories(data.categories || []); };
  const loadProducts = async () => { const response = await fetch('/api/products?limit=100'); const data = await response.json(); if (response.ok) setProducts(data.products || []); };
  useEffect(() => { void Promise.all([loadCategories(), loadProducts()]); }, []);

  const addIdentifiers = (values: string[]) => {
    const known = new Set(drafts.map((draft) => draft.identifier.toUpperCase()));
    const additions = values.map((value) => value.trim()).filter(Boolean).filter((value) => { const key = value.toUpperCase(); if (known.has(key)) return false; known.add(key); return true; }).map((value) => emptyDraft(value));
    setDrafts((current) => [...current, ...additions]);
    if (additions[0]) setSelectedId(additions[0].id);
    setMessage(additions.length ? `${additions.length} part${additions.length === 1 ? '' : 's'} ready to verify.` : 'No new parts were added.');
  };
  const addTyped = () => { addIdentifiers(text.split(/[\n,;\t]+/)); setText(''); };

  const extractList = async (file: File) => {
    setBusy(true); setMessage('Reading the list…');
    try {
      const prepared = file.type.startsWith('image/') ? await normalizePhoto(file) : file;
      if (prepared.size > 3_000_000) throw new Error('This document is too large to analyze. Upload a file smaller than 3 MB.');
      const form = new FormData(); form.append('file', prepared); form.append('mode', 'list');
      const response = await fetch('/api/admin/smart-manager/extract', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({ message: response.status === 413 ? 'This upload is too large. Try a smaller document.' : 'The list service returned an invalid response.' })); if (!response.ok) throw new Error(data.message);
      addIdentifiers(data.parts || []); setMessage(`Found ${data.count} distinct part${data.count === 1 ? '' : 's'}. Review them, then verify.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The list could not be read.'); } finally { setBusy(false); }
  };

  const addPhoto = async (file: File) => {
    setBusy(true); setMessage('Preparing and identifying the complete product…');
    let draft: Draft | undefined;
    try {
      const prepared = await normalizePhoto(file);
      const pending = emptyDraft('Product photo', prepared);
      draft = pending; setDrafts((current) => [...current, pending]); setSelectedId(pending.id);
      const form = new FormData(); form.append('file', prepared); form.append('mode', 'object');
      const response = await fetch('/api/admin/smart-manager/extract', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({ message: response.status === 413 ? 'This photo is too large. It could not be analyzed.' : 'The photo-identification service returned an invalid response.' })); if (!response.ok) throw new Error(data.message);
      const identity = data.identity || {};
      const detectedModel = isKnownIdentity(identity.model || '') ? identity.model : '';
      const identifier = detectedModel || identity.inventoryIdentifier || identity.primaryIdentity || 'Unknown electronics item';
      const suitable = Boolean(identity.displayImageSuitable);
      setDrafts((current) => current.map((item) => item.id === pending.id ? { ...item, identifier, searchQuery: identity.searchQuery || identifier, sku: makeSku(identifier), name: identity.primaryIdentity || identifier, manufacturer: identity.brand || '', summary: identity.wholeObjectDescription || '', localImageSuitable: suitable, confidence: identity.confidence > 0 && identity.confidence <= 1 ? Math.round(identity.confidence * 100) : Math.round(identity.confidence || 0), warnings: [...(identity.warnings || []), ...(!suitable ? [`Uploaded photo shows ${identity.picturedItemCount || 'multiple'} items; a single-item storefront image will be required.`] : [])] } : item));
      setMessage('The complete product was identified. Verify it against online sources next.');
    } catch (error) { const problem = error instanceof Error ? error.message : 'Could not read the component.'; if (draft) setDrafts((current) => current.map((item) => item.id === draft!.id ? { ...item, status: 'error', error: problem } : item)); setMessage(problem); } finally { setBusy(false); }
  };

  const verifyOne = async (draft: Draft) => {
    setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, status: 'checking', error: undefined } : item));
    try {
      const form = new FormData(); form.append('identifier', draft.searchQuery || draft.identifier); form.append('categories', JSON.stringify(categories)); if (draft.localFile) form.append('file', draft.localFile);
      const response = await fetch('/api/admin/smart-manager/enrich', { method: 'POST', body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      const part = data.component;
      setDrafts((current) => current.map((item) => { if (item.id !== draft.id) return item; const partNumber = isKnownIdentity(part.partNumber || '') ? part.partNumber : item.identifier; const identified = isKnownIdentity(partNumber); return { ...item, identifier: partNumber, sku: makeSku(partNumber), name: part.name || item.name, manufacturer: part.manufacturer || item.manufacturer, category: part.category || 'Uncategorized', package: part.package || '', pinCount: part.pinCount || '', summary: part.summary || item.summary, specifications: part.specifications || [], datasheetUrl: part.datasheetUrl || '', sources: part.sources || [], images: part.images || [], imageIndex: 0, confidence: identified ? part.confidence || 0 : Math.min(part.confidence || 0, 35), verified: identified && Boolean(part.verified), warnings: identified ? part.warnings || [] : ['Exact product identity is required before approval.', ...(part.warnings || [])], approved: false, status: 'ready' }; }));
    } catch (error) { setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, status: 'error', error: error instanceof Error ? error.message : 'Verification failed.' } : item)); }
  };
  const verifyAll = async () => { setBusy(true); setMessage('Searching trusted engineering sources…'); for (const draft of drafts) await verifyOne(draft); setBusy(false); setMessage('Verification complete. Review every card, add prices, then approve.'); };
  const update = (id: string, changes: Partial<Draft>) => setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...changes } : draft));
  const remove = (id: string) => setDrafts((current) => { const next = current.filter((draft) => draft.id !== id); if (selectedId === id) setSelectedId(next[0]?.id || ''); return next; });
  const chosenImage = (draft: Draft) => draft.localImageSuitable !== false ? draft.localPreview || draft.images[draft.imageIndex]?.url || '' : draft.images[draft.imageIndex]?.url || '';
  const hasPublishableImage = (draft: Draft) => Boolean((draft.localImageSuitable && draft.localFile) || draft.images[draft.imageIndex]?.url);
  const hasManagedCategory = (draft: Draft) => categories.some((category) => category === draft.category);
  const publishable = useMemo(() => drafts.filter((draft) => draft.approved && draft.status === 'ready' && isKnownIdentity(draft.identifier) && hasPublishableImage(draft) && hasManagedCategory(draft) && Number(draft.price) > 0), [drafts, categories]);

  const publish = async () => {
    if (!publishable.length) { setMessage('Approve at least one reviewed card and enter its price first.'); return; }
    setBusy(true); let saved = 0;
    for (const draft of publishable) {
      let created = false;
      try {
        const selected = draft.images[draft.imageIndex];
        const payload = { sku: draft.sku, name: draft.name, category: draft.category, price: Number(draft.price), quantity: Number(draft.quantity) || 0, description: draft.summary, manufacturer: draft.manufacturer, mpn: draft.identifier, package: draft.package, pinCount: draft.pinCount, datasheetUrl: draft.datasheetUrl, specifications: draft.specifications, verificationSources: draft.sources, verificationConfidence: draft.confidence, verificationStatus: draft.verified ? 'verified' : 'needs-review', imageSourceUrl: selected?.sourceUrl || '' };
        let response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) created = true;
        const data = await response.json(); if (!response.ok) throw new Error(data.message);
        if (draft.localFile && draft.localImageSuitable) { const form = new FormData(); form.append('file', draft.localFile); form.append('sku', draft.sku); form.append('alt', draft.name); const upload = await fetch('/api/admin/products/image', { method: 'POST', body: form }); if (!upload.ok) throw new Error((await upload.json()).message); }
        else if (selected) { const upload = await fetch('/api/admin/products/image-from-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: draft.sku, url: selected.url, fallbackUrl: selected.fallbackUrl, sourceUrl: selected.sourceUrl, alt: draft.name }) }); if (!upload.ok) throw new Error((await upload.json()).message); }
        saved += 1; setDrafts((current) => current.filter((item) => item.id !== draft.id));
      } catch (error) { if (created) await fetch(`/api/products?sku=${encodeURIComponent(draft.sku)}`, { method: 'DELETE' }); update(draft.id, { approved: false, error: `${error instanceof Error ? error.message : 'Publishing failed.'} Try another image.` }); }
    }
    setBusy(false); setMessage(`${saved} component${saved === 1 ? '' : 's'} published. Cards with errors were kept for review.`); if (saved) { await loadProducts(); onComplete(); }
  };

  const saveCategory = async () => {
    const name = newCategory.trim(); if (!name) return;
    setBusy(true);
    try {
      if (!categories.some((category) => category.toLowerCase() === name.toLowerCase())) { const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); }
      if (editingCategory && editingCategory !== name) {
        const affected = products.filter((product) => product.category === editingCategory);
        await Promise.all(affected.map((product) => fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...product, category: name }) })));
        await fetch(`/api/categories?name=${encodeURIComponent(editingCategory)}`, { method: 'DELETE' });
      }
      setNewCategory(''); setEditingCategory(''); await Promise.all([loadCategories(), loadProducts()]); setMessage('Category saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Category could not be saved.'); } finally { setBusy(false); }
  };
  const deleteCategory = async (name: string) => { if (!confirm(`Delete category “${name}”? Products will keep their existing category label.`)) return; const response = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' }); if (response.ok) await loadCategories(); };
  const deleteProduct = async (sku: string) => { if (!confirm(`Delete ${sku} from inventory?`)) return; const response = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`, { method: 'DELETE' }); if (response.ok) await loadProducts(); };
  const saveProduct = async () => {
    if (!editingProduct) return; setBusy(true);
    try {
      const response = await fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingProduct) }); const data = await response.json(); if (!response.ok) throw new Error(data.message);
      if (replacementImage) { const form = new FormData(); form.append('sku', editingProduct.sku); form.append('file', replacementImage); form.append('alt', editingProduct.name); const upload = await fetch('/api/admin/products/image', { method: 'POST', body: form }); if (!upload.ok) throw new Error((await upload.json()).message); }
      setEditingProduct(null); setReplacementImage(null); await loadProducts(); setMessage('Product updated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Product could not be updated.'); } finally { setBusy(false); }
  };
  const filteredProducts = products.filter((product) => `${product.sku} ${product.name} ${product.category} ${product.mpn || ''}`.toLowerCase().includes(inventorySearch.toLowerCase()));

  const selected = drafts.find((draft) => draft.id === selectedId) || drafts[0];
  return <section className="fixed inset-0 z-[110] flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-violet-500/40 px-5"><div className="flex items-center gap-3"><Sparkles className="text-violet-300"/><div><h2 className="font-bold">Super Smart Manager</h2><p className="text-xs text-slate-400">Complete inventory workspace</p></div></div><div className="flex items-center gap-3"><span className="hidden rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200 sm:block"><ShieldCheck className="mr-1 inline" size={15}/>Prices are admin-only</span><button onClick={onClose} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"><ArrowLeft size={17}/> Back to Dashboard</button></div></header>
    <div className={`grid min-h-0 flex-1 grid-cols-1 ${workspace === 'add' ? 'lg:grid-cols-[18rem_18rem_minmax(0,1fr)]' : 'lg:grid-cols-[18rem_minmax(0,1fr)]'}`}>
      <aside className="overflow-y-auto border-r border-slate-800 p-4"><nav className="mb-5 space-y-2"><button onClick={() => setWorkspace('add')} className={`flex w-full items-center gap-2 rounded-xl p-3 text-left ${workspace === 'add' ? 'bg-violet-600' : 'bg-slate-900'}`}><PackagePlus size={18}/>Add parts</button><button onClick={() => { setWorkspace('inventory'); void loadProducts(); }} className={`flex w-full items-center gap-2 rounded-xl p-3 text-left ${workspace === 'inventory' ? 'bg-violet-600' : 'bg-slate-900'}`}><LayoutGrid size={18}/>View inventory <span className="ml-auto text-xs">{products.length}</span></button><button onClick={() => setWorkspace('categories')} className={`flex w-full items-center gap-2 rounded-xl p-3 text-left ${workspace === 'categories' ? 'bg-violet-600' : 'bg-slate-900'}`}><Tags size={18}/>Manage categories</button></nav>{workspace === 'add' && <><h3 className="mb-3 font-bold">Add components</h3><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder={'TIP41\nIRF3207\nLNK625PG'} className={inputClass}/><button onClick={addTyped} disabled={!text.trim() || busy} className="mt-2 w-full rounded-xl bg-violet-600 px-3 py-2.5 font-bold disabled:opacity-40">Add list</button><button onClick={() => listInput.current?.click()} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-blue-500/50 p-3 text-sm text-blue-200"><FileImage size={18}/> Upload list/document<input ref={listInput} hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/csv,text/plain,.csv,.txt,.pdf" onChange={(event) => event.target.files?.[0] && extractList(event.target.files[0])}/></button><button onClick={() => partInput.current?.click()} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-emerald-500/50 p-3 text-sm text-emerald-200"><Upload size={18}/> Upload part photo<input ref={partInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && addPhoto(event.target.files[0])}/></button></>}{message && <p aria-live="polite" className="mt-4 rounded-lg bg-slate-900 p-3 text-xs text-slate-300">{busy && <Loader2 className="mr-1 inline animate-spin" size={14}/>} {message}</p>}</aside>
      {workspace === 'add' ? <><aside className="flex min-h-0 flex-col border-r border-slate-800"><div className="flex items-center justify-between border-b border-slate-800 p-4"><div><h3 className="font-bold">Review queue</h3><p className="text-xs text-slate-400">{drafts.length} component{drafts.length === 1 ? '' : 's'}</p></div><button onClick={verifyAll} disabled={busy || !drafts.length} className="rounded-lg bg-blue-600 p-2 disabled:opacity-40" aria-label="Verify all"><Globe2 size={18}/></button></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{drafts.map((draft) => <button key={draft.id} onClick={() => setSelectedId(draft.id)} className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-2 text-left ${selected?.id === draft.id ? 'border-violet-400 bg-violet-500/10' : 'border-slate-800 bg-slate-900'}`}><div className="h-12 w-12 shrink-0 rounded-lg bg-white p-1">{chosenImage(draft) ? <Image unoptimized src={chosenImage(draft)} alt="" width={48} height={48} className="h-full w-full object-contain"/> : <ImageIcon className="m-auto h-full text-slate-500"/>}</div><span className="min-w-0 flex-1"><b className="block truncate text-sm">{draft.identifier}</b><small className={draft.verified ? 'text-emerald-300' : 'text-slate-400'}>{draft.status === 'checking' ? 'Checking…' : draft.status === 'ready' ? `${draft.confidence}% confidence` : 'Waiting'}</small></span>{draft.approved && <Check size={16} className="text-emerald-400"/>}</button>)}</div></aside>
      <main className="flex min-h-0 flex-col bg-slate-900">{selected ? <><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="grid gap-4 xl:grid-cols-[18rem_1fr]"><div className="relative flex h-64 items-center justify-center rounded-xl bg-white p-3">{chosenImage(selected) ? <Image unoptimized src={chosenImage(selected)} alt={selected.name} width={640} height={640} sizes="(max-width: 1280px) 100vw, 18rem" className="h-full w-full object-contain"/> : <ImageIcon className="text-slate-400"/>}{selected.images.length > 1 && <div className="absolute inset-x-2 bottom-2 flex justify-between"><button onClick={() => update(selected.id, { imageIndex: (selected.imageIndex - 1 + selected.images.length) % selected.images.length })} className="rounded-full bg-black/75 p-2"><ChevronLeft/></button><span className="rounded-full bg-black/75 px-3 py-2 text-xs">Image {selected.imageIndex + 1} of {selected.images.length}</span><button onClick={() => update(selected.id, { imageIndex: (selected.imageIndex + 1) % selected.images.length })} className="rounded-full bg-black/75 p-2"><ChevronRight/></button></div>}</div><div className="grid content-start gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Part number<input className={inputClass} value={selected.identifier} onChange={(event) => update(selected.id, { identifier: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Product name<input className={inputClass} value={selected.name} onChange={(event) => update(selected.id, { name: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">SKU<input className={inputClass} value={selected.sku} onChange={(event) => update(selected.id, { sku: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Category<input list="smart-categories" className={inputClass} value={selected.category} onChange={(event) => update(selected.id, { category: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Package<input className={inputClass} value={selected.package} onChange={(event) => update(selected.id, { package: event.target.value, approved: false })}/></label><label className="text-xs text-slate-400">Pins<input className={inputClass} value={selected.pinCount} onChange={(event) => update(selected.id, { pinCount: event.target.value, approved: false })}/></label><button onClick={() => verifyOne(selected)} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-2.5 font-bold"><Search size={17}/>{selected.status === 'ready' ? 'Search again' : 'Verify online'}</button><button onClick={() => remove(selected.id)} className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 p-2.5 text-red-300"><Trash2 size={17}/>Remove</button></div></div>
        {selected.status === 'ready' && <div className="mt-4 grid gap-4 xl:grid-cols-2"><label className="text-xs text-slate-400">Short description<textarea rows={3} className={inputClass} value={selected.summary} onChange={(event) => update(selected.id, { summary: event.target.value, approved: false })}/></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold text-amber-200">Admin price (GHS)<input type="number" min="0.01" step="0.01" className={`${inputClass} mt-1 border-amber-400/70`} value={selected.price} onChange={(event) => update(selected.id, { price: event.target.value, approved: false })}/></label><label className="text-sm text-slate-300">Quantity<input type="number" min="0" className={`${inputClass} mt-1`} value={selected.quantity} onChange={(event) => update(selected.id, { quantity: event.target.value, approved: false })}/></label></div><details className="rounded-xl border border-slate-700 bg-slate-950 p-3"><summary className="cursor-pointer font-bold">Vital specifications ({selected.specifications.length})</summary><dl className="mt-3 grid gap-2 sm:grid-cols-2">{selected.specifications.map((spec, index) => <div key={`${spec.label}-${index}`} className="rounded-lg bg-slate-900 p-2"><dt className="text-xs text-slate-400">{spec.label}</dt><dd className="text-sm">{spec.value}</dd></div>)}</dl></details><details className="rounded-xl border border-slate-700 bg-slate-950 p-3"><summary className="cursor-pointer font-bold">Evidence and warnings</summary>{(selected.error || selected.warnings.length > 0) && <p className="mt-3 text-sm text-amber-200"><AlertTriangle className="mr-1 inline" size={15}/>{selected.error || selected.warnings.join(' ')}</p>}<div className="mt-3 flex flex-wrap gap-2">{selected.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-blue-200"><ExternalLink size={12}/>{source.title}</a>)}</div></details></div>}</div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-700 bg-slate-950 p-3"><button disabled={selected.status !== 'ready' || !isKnownIdentity(selected.identifier) || !hasPublishableImage(selected) || !hasManagedCategory(selected)} onClick={() => Number(selected.price) > 0 ? update(selected.id, { approved: !selected.approved, error: undefined }) : update(selected.id, { error: 'Enter the admin price before approving.' })} className={`rounded-xl px-4 py-2.5 font-bold disabled:opacity-30 ${selected.approved ? 'bg-emerald-600' : 'bg-slate-700'}`}>{selected.approved ? '✓ Approved' : !isKnownIdentity(selected.identifier) ? 'Identify before approval' : !hasPublishableImage(selected) ? 'Choose a single-item image' : !hasManagedCategory(selected) ? 'Select a managed category' : 'Approve component'}</button><div className="flex items-center gap-3"><span className="text-sm text-slate-400">Ready: {publishable.length}</span><button onClick={publish} disabled={busy || !publishable.length} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-bold disabled:opacity-40">Publish approved</button></div></footer></> : <div className="grid h-full place-items-center text-center text-slate-400"><div><ImageIcon className="mx-auto mb-3" size={42}/><p>Add a part to begin.</p></div></div>}</main></> : workspace === 'inventory' ?
      <main className="flex min-h-0 flex-col bg-slate-900"><div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 p-4"><div><h3 className="text-xl font-bold">Published inventory</h3><p className="text-sm text-slate-400">Preview, search, edit, or remove homepage products.</p></div><div className="relative w-full max-w-xl"><Search className="absolute left-3 top-3 text-slate-500" size={18}/><input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search name, SKU, part number, or category…" className={`${inputClass} pl-10`}/></div></div><div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[800px] text-left"><thead className="sticky top-0 bg-slate-800 text-xs uppercase text-slate-300"><tr><th className="p-3">Image</th><th className="p-3">SKU / part</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Price / stock</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.sku} className="border-b border-slate-800"><td className="p-3"><div className="h-14 w-14 rounded-lg bg-white p-1"><Image src={product.imageUrl || product.image || '/macsunny-logo.png'} alt={product.imageAlt || product.name} width={56} height={56} sizes="56px" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.src = '/macsunny-logo.png'; }}/></div></td><td className="p-3"><b className="block font-mono text-sm">{product.sku}</b><small className="text-slate-400">{product.mpn}</small></td><td className="max-w-sm p-3">{product.name}</td><td className="p-3">{product.category}</td><td className="p-3"><b>GHS {Number(product.price).toFixed(2)}</b><small className="block text-slate-400">{product.quantity || 0} in stock</small></td><td className="p-3 text-right"><button onClick={() => { setEditingProduct({ ...product }); setReplacementImage(null); }} className="mr-2 rounded-lg bg-blue-600 px-3 py-2">Edit</button><button onClick={() => deleteProduct(product.sku)} className="rounded-lg bg-red-600 px-3 py-2">Delete</button></td></tr>)}</tbody></table>{!filteredProducts.length && <p className="p-10 text-center text-slate-400">No matching products.</p>}</div></main> :
      <main className="min-h-0 overflow-y-auto bg-slate-900 p-6"><div className="mx-auto max-w-3xl"><h3 className="text-2xl font-bold">Manage categories</h3><p className="mt-1 text-slate-400">Categories become available immediately in Smart Manager and the storefront.</p><div className="mt-6 flex gap-3"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Power Transistors" className={inputClass}/><button onClick={saveCategory} disabled={busy || !newCategory.trim()} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 font-bold disabled:opacity-40"><Save size={17}/>{editingCategory ? 'Update' : 'Add'}</button>{editingCategory && <button onClick={() => { setEditingCategory(''); setNewCategory(''); }} className="rounded-xl bg-slate-700 px-4">Cancel</button>}</div><div className="mt-6 grid gap-3 sm:grid-cols-2">{categories.map((category) => <div key={category} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-4"><span>{category}</span><span><button onClick={() => { setEditingCategory(category); setNewCategory(category); }} className="mr-2 text-blue-300">Edit</button><button onClick={() => deleteCategory(category)} className="text-red-300">Delete</button></span></div>)}</div></div></main>}
    </div><datalist id="smart-categories">{categories.map((category) => <option key={category} value={category}/>)}</datalist>
    {editingProduct && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Edit inventory product"><div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Edit {editingProduct.sku}</h3><button onClick={() => setEditingProduct(null)} className="text-slate-300">Close</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Name<input className={inputClass} value={editingProduct.name} onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })}/></label><label className="text-xs text-slate-400">Category<input list="smart-categories" className={inputClass} value={editingProduct.category} onChange={(event) => setEditingProduct({ ...editingProduct, category: event.target.value })}/></label><label className="text-xs text-slate-400">Price (GHS)<input type="number" min="0.01" className={inputClass} value={editingProduct.price} onChange={(event) => setEditingProduct({ ...editingProduct, price: Number(event.target.value) })}/></label><label className="text-xs text-slate-400">Quantity<input type="number" min="0" className={inputClass} value={editingProduct.quantity || 0} onChange={(event) => setEditingProduct({ ...editingProduct, quantity: Number(event.target.value) })}/></label><label className="text-xs text-slate-400 sm:col-span-2">Replace image<input type="file" accept="image/*" className={`${inputClass} mt-1`} onChange={(event) => setReplacementImage(event.target.files?.[0] || null)}/></label><label className="text-xs text-slate-400 sm:col-span-2">Description<textarea rows={3} className={inputClass} value={editingProduct.description || ''} onChange={(event) => setEditingProduct({ ...editingProduct, description: event.target.value })}/></label></div><div className="mt-5 flex justify-end gap-3"><button onClick={() => setEditingProduct(null)} className="rounded-xl bg-slate-700 px-4 py-2">Cancel</button><button onClick={saveProduct} disabled={busy} className="rounded-xl bg-emerald-600 px-5 py-2 font-bold">Save changes</button></div></div></div>}
  </section>;
}
