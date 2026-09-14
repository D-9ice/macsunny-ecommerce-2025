'use client';
import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';

export default function Navbar() {
  return <header className="site-header"><div className="site-header__utility"><span><MapPin size={13}/> Accra, Ghana · Delivery nationwide</span><a href="tel:+233243380902"><Phone size={13}/> 024 338 0902</a></div><div className="site-header__main"><Link href="/" className="site-brand"><img src="/macsunny-logo.png" alt="MacSunny Electronics"/><span><b>MACSUNNY</b><small>ELECTRONICS</small></span></Link><p>Components that power your ideas.</p><nav><a href="https://wa.me/233551507985">WhatsApp support</a></nav></div></header>;
}
