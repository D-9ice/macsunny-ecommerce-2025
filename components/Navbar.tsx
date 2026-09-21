'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MapPin, Phone, ShoppingCart } from 'lucide-react';
import { getCart } from '@/app/lib/cart';

export default function Navbar() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => { const update = () => setCartCount(getCart().reduce((total, item) => total + item.qty, 0)); update(); window.addEventListener('storage', update); window.addEventListener('macsunny-cart-updated', update); return () => { window.removeEventListener('storage', update); window.removeEventListener('macsunny-cart-updated', update); }; }, []);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null;

  return <header className="site-header"><div className="site-header__utility"><span><MapPin size={13}/> Accra, Ghana · Delivery nationwide</span><a href="tel:+233243380902"><Phone size={13}/> 024 338 0902</a></div><div className="site-header__main"><Link href="/" className="site-brand"><Image src="/macsunny-logo.png" alt="MacSunny Electronics" width={72} height={72} priority sizes="72px"/><span><b>MACSUNNY</b><small>ELECTRONICS</small></span></Link><Link href="/cart" className="mobile-header-cart" aria-label={`View cart with ${cartCount} items`}><ShoppingCart size={20}/><span>{cartCount}</span></Link><p>Components that power your ideas.</p><nav><a href="https://wa.me/233551507985">WhatsApp support</a></nav></div></header>;
}
