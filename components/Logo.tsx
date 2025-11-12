// components/Logo.tsx
'use client';

export default function Logo() {
  return (
    <span
      className="inline-flex items-center justify-center font-bold text-green-800 bg-white"
      style={{
        width: 48,
        height: 48,
        clipPath:
          'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
        border: '2px solid #166534',
        borderRadius: 8,
        transition: 'transform .6s ease-in-out',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'rotate(360deg)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      Logo
    </span>
  );
}
