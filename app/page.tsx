'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Box, Check, ChevronLeft, ChevronRight, Cpu, ExternalLink, Headphones, Search, ShieldCheck, ShoppingCart, Truck, X, Zap } from 'lucide-react';
import { Product } from './lib/products';
import { addToCart, getCart } from './lib/cart';
import { showToast } from './components/Toast';
import WhatsAppFab from './components/WhatsAppFab';
import AIChatFab from './components/AIChatFab';
import LocationFab from './components/LocationFab';

type Pagination = { page: number; pages: number; total: number; limit: number };
const fallbackCategories = ['Integrated Circuits', 'Semiconductors', 'Resistors', 'Capacitors', 'Modules', 'Connectors'];
const categoryCards = [
  { label: 'Integrated Circuits', category: 'INTEGRATED CIRCUIT (IC)', icon: <Cpu /> },
  { label: 'Power Transistors', category: 'POWER TRANSISTORS', icon: <Zap /> },
  { label: 'Resistors', category: 'Resistors', icon: <Box /> },
  { label: 'Capacitors', category: 'CAPACITOR', icon: <Box /> },
  { label: 'Modules', category: 'MODULES', icon: <Cpu /> },
];

function Storefront() {
  const router = useRouter(), params = useSearchParams();
  const q = params.get('q') || '', category = params.get('category') || '', page = Number(params.get('page') || 1);
  const [draft, setDraft] = useState(q), [products, setProducts] = useState<Product[]>([]), [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 50 });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0), [cartCount, setCartCount] = useState(0), [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentlyAddedSku, setRecentlyAddedSku] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const catalogueRef = useRef<HTMLElement>(null);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryString = useMemo(() => { const p = new URLSearchParams({ page: String(page), limit: String(pageSize) }); if (q) p.set('search', q); if (category) p.set('category', category); return p.toString(); }, [q, category, page, pageSize]);
  useEffect(() => { setDraft(q); }, [q]);
  useEffect(() => {
    const updatePageSize = () => setPageSize(window.innerWidth <= 640 ? 24 : window.innerWidth >= 1600 ? 60 : 50);
    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    setLoading(true); setError('');
    const load = async () => {
      let problem = 'Products could not be loaded right now.';
      for (let attempt = 0; attempt < 2 && active; attempt += 1) {
        controller = new AbortController();
        timeout = setTimeout(() => controller?.abort(), attempt === 0 ? 12_000 : 20_000);
        try {
          const response = await fetch(`/api/products?${queryString}`, { signal: controller.signal, cache: 'no-store' });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.message || 'Catalogue request failed');
          if (active) { setProducts(data.data || data.products || []); setPagination(data.pagination); setError(''); }
          return;
        } catch (error) {
          problem = error instanceof Error && error.name !== 'AbortError' ? error.message : 'The catalogue took too long to respond.';
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      if (active) setError(problem);
    };
    void load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (timeout) clearTimeout(timeout); controller?.abort(); };
  }, [queryString, retry]);
  useEffect(() => {
    if (!loading && (q || category)) requestAnimationFrame(() => catalogueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [loading, q, category, page]);
  useEffect(() => { fetch('/api/categories').then(r => r.json()).then(d => d.success && d.categories?.length && setCategories(d.categories)).catch(() => {}); }, []);
  useEffect(() => { const update = () => setCartCount(getCart().reduce((n, item) => n + item.qty, 0)); update(); window.addEventListener('storage', update); return () => window.removeEventListener('storage', update); }, []);
  const navigate = (updates: Record<string, string>) => { const next = new URLSearchParams(params.toString()); Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); router.push(`/?${next.toString()}`); };
  const submit = (e: FormEvent) => { e.preventDefault(); navigate({ q: draft.trim(), page: '1' }); };
  const add = (p: Product) => { addToCart({ sku: p.sku, name: p.name, price: p.price, image: p.imageUrl || p.image || '/macsunny-logo.png', qty: 1 }); setCartCount(getCart().reduce((n, item) => n + item.qty, 0)); setRecentlyAddedSku(p.sku); if (addedTimerRef.current) clearTimeout(addedTimerRef.current); addedTimerRef.current = setTimeout(() => setRecentlyAddedSku(''), 2200); showToast(`${p.name} added to cart`, 'success'); };
  useEffect(() => () => { if (addedTimerRef.current) clearTimeout(addedTimerRef.current); }, []);

  return <main className="pcb-store">
    <section className="pcb-hero">
      <div className="pcb-hero__copy"><span className="eyebrow"><Zap size={14}/> Ghana&apos;s component supply desk</span><h1>Build bold ideas.<br/><em>Source the right parts.</em></h1><p>Quality electronic components, modules and accessories for repairs, prototypes and production.</p><div className="hero-actions"><a href="#catalogue">Browse components <ArrowRight size={17}/></a><a className="secondary" href="https://wa.me/233551507985">Talk to a parts expert</a></div></div>
      <div className="pcb-hero__chip" aria-hidden="true"><span className="chip-pin p1"/><span className="chip-pin p2"/><span className="chip-pin p3"/><span className="chip-pin p4"/><div><Cpu size={76}/><b>MACSUNNY</b><small>COMPONENTS / GH</small></div></div>
    </section>
    <section className="search-deck" aria-label="Product search"><form onSubmit={submit}><label className="sr-only" htmlFor="component-search">Search components</label><Search/><input id="component-search" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Search by component, SKU or part number…"/><select aria-label="Product category" value={category} onChange={e => navigate({ category: e.target.value, page: '1' })}><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select><button>Search</button></form><Link href="/cart"><ShoppingCart size={20}/> Cart <span>{cartCount}</span></Link></section>
    <section className="category-strip"><div><span>SHOP BY BOARD</span><h2>Find your component family</h2></div><div className="category-pills">{categoryCards.map((card) => <button key={card.category} onClick={() => navigate({ category: card.category, page: '1' })} aria-label={`Show ${card.label}`}><span>{card.icon}</span>{card.label}</button>)}</div></section>
    <section ref={catalogueRef} id="catalogue" className="catalogue"><div className="section-heading"><div><span>{q || category ? 'FILTERED SIGNAL' : 'FRESH ON THE BOARD'}</span><h2>{q ? `Results for “${q}”` : category || 'Latest components'}</h2></div><p>{pagination.total} components</p></div>
      {loading ? <div className="product-grid" aria-label="Loading products">{Array.from({ length: 10 }).map((_, i) => <div className="product-card skeleton" key={i}><i/><b/><span/><button/></div>)}</div>
      : error ? <div className="catalogue-error"><Zap/><h3>Products could not be loaded right now.</h3><p>{error} Search and contact options remain available while we restore the catalogue.</p><button onClick={() => setRetry(v => v + 1)}>Retry catalogue</button></div>
      : !products.length ? <div className="catalogue-error"><Search/><h3>No matching components</h3><p>Try another part number, name, or category.</p><button onClick={() => router.push('/')}>Clear filters</button></div>
      : <div className="product-grid">{products.map(p => <article className="product-card" key={p.sku}><button className="product-card__details" onClick={() => setSelectedProduct(p)} aria-label={`View details for ${p.name}`}><div className="product-card__image"><Image fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" src={p.imageUrl || p.image || '/macsunny-logo.png'} alt={p.imageAlt || p.name} className="object-contain" onError={e => { e.currentTarget.src = '/macsunny-logo.png'; }}/><span>{(p.quantity ?? 1) > 0 ? 'In stock' : 'Ask us'}</span></div><div className="product-card__body"><small>{p.category}</small><h3>{p.name}</h3><code>{p.sku}</code></div></button><div className="product-card__buy"><strong>GH₵ {Number(p.price).toFixed(2)}</strong><button onClick={() => add(p)} aria-label={`Add ${p.name} to cart`}><ShoppingCart size={18}/></button></div></article>)}</div>}
      {pagination.pages > 1 && <nav className="pagination" aria-label="Catalogue pages"><button disabled={page <= 1} onClick={() => navigate({ page: String(page - 1) })}><ChevronLeft/> Previous</button><span>Page {page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => navigate({ page: String(page + 1) })}>Next <ChevronRight/></button></nav>}
    </section>
    <section className="trust-grid"><div><ShieldCheck/><span><b>Quality checked</b><small>Components sourced with care</small></span></div><div><Truck/><span><b>Delivery across Ghana</b><small>Flexible delivery arrangements</small></span></div><div><Headphones/><span><b>Human technical support</b><small>Get help finding the right part</small></span></div></section>
    <WhatsAppFab />
    <AIChatFab />
    <LocationFab />
    {selectedProduct && <div className="product-detail-backdrop" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}><article className="product-detail"><button className="product-detail__close" onClick={() => setSelectedProduct(null)} aria-label="Close product details"><X/></button><div className="product-detail__image relative"><Image fill sizes="(max-width: 640px) 100vw, 38vw" src={selectedProduct.imageUrl || selectedProduct.image || '/macsunny-logo.png'} alt={selectedProduct.imageAlt || selectedProduct.name} className="object-contain p-8"/></div><div className="product-detail__content"><small>{selectedProduct.category}</small><h2 id="product-detail-title">{selectedProduct.name}</h2><code>{selectedProduct.mpn || selectedProduct.sku}</code><p>{selectedProduct.description || 'Contact MacSunny Electronics for additional technical details.'}</p><div className="product-detail__meta"><span><b>Package</b>{selectedProduct.package || 'Not specified'}</span><span><b>Pins</b>{selectedProduct.pinCount || 'Not specified'}</span><span><b>Manufacturer</b>{selectedProduct.manufacturer || 'Not specified'}</span><span><b>Stock</b>{(selectedProduct.quantity ?? 0) > 0 ? `${selectedProduct.quantity} available` : 'Ask us'}</span></div>{selectedProduct.specifications?.length ? <><h3>Vital specifications</h3><dl>{selectedProduct.specifications.map((spec, index) => <div key={`${spec.label}-${index}`}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></> : null}<div className="product-detail__actions"><strong>GH₵ {Number(selectedProduct.price).toFixed(2)}</strong>{selectedProduct.datasheetUrl && <a href={selectedProduct.datasheetUrl} target="_blank" rel="noreferrer">Datasheet <ExternalLink size={15}/></a>}<button onClick={() => add(selectedProduct)} className={recentlyAddedSku === selectedProduct.sku ? 'is-added' : ''}>{recentlyAddedSku === selectedProduct.sku ? <><Check size={18}/> Added to cart</> : <><ShoppingCart size={18}/> Add to cart</>}</button></div></div></article></div>}
  </main>;
}

export default function Home() { return <Suspense fallback={<main className="pcb-store"><div className="catalogue-error">Loading storefront…</div></main>}><Storefront/></Suspense>; }
