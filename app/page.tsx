// app/page.tsx
import Link from "next/link";

export default function Home() {
  const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "MacSunny Electronics";

  const PHONE_PRIMARY =
    process.env.NEXT_PUBLIC_PHONE_PRIMARY || "+233243380902";
  const PHONE_ALT1 =
    process.env.NEXT_PUBLIC_PHONE_ALT1 || "+233249135208";
  const PHONE_ALT2 =
    process.env.NEXT_PUBLIC_PHONE_ALT2 || "+2330551507985";
  const SUPPORT_EMAIL =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "macsunny2025@gmail.com";
  const WHATSAPP_RAW =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+233243380902";
  const WHATSAPP_DIGITS = WHATSAPP_RAW.replace(/\D/g, ""); // wa.me requires digits only

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
      {/* Hero */}
      <section className="px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-4">
              {SITE}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Your local hub for
              <span className="text-emerald-600"> quality electronics</span> —
              fast, friendly, and fairly priced.
            </h1>
            <p className="mt-4 text-slate-600 max-w-prose">
              Components, accessories, phones & repairs. Order by WhatsApp,
              pay locally, and get doorstep delivery with live updates.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_DIGITS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 font-semibold shadow-sm"
              >
                WhatsApp Us
                <span aria-hidden>💬</span>
              </a>

              <Link
                href="#catalog"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 hover:border-slate-400 px-5 py-3 font-semibold"
              >
                Browse Categories <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="mt-6 text-sm text-slate-600">
              <p>
                Call:{" "}
                <a className="underline" href={`tel:${PHONE_PRIMARY}`}>
                  {PHONE_PRIMARY}
                </a>{" "}
                ·{" "}
                <a className="underline" href={`tel:${PHONE_ALT1}`}>
                  {PHONE_ALT1}
                </a>{" "}
                ·{" "}
                <a className="underline" href={`tel:${PHONE_ALT2}`}>
                  {PHONE_ALT2}
                </a>
              </p>
              <p>
                Email:{" "}
                <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>

          <div className="bg-white/70 border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              {[
                "Resistors",
                "Capacitors",
                "ICs",
                "Cables",
                "Adapters",
                "Tools",
              ].map((label, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center text-sm font-semibold text-slate-700"
                >
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Tip: This is a placeholder grid. We’ll replace it with the real
              catalog in the next steps.
            </p>
          </div>
        </div>
      </section>

      {/* Categories anchor (placeholder) */}
      <section id="catalog" className="px-6 md:px-10 lg:px-16 py-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold">Popular Categories</h2>
          <p className="text-slate-600">
            We’ll wire this to live products & search soon.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Mobile Phones", "Chargers & Cables", "Batteries"].map((c) => (
              <div
                key={c}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm"
              >
                <h3 className="font-semibold">{c}</h3>
                <p className="text-sm text-slate-600">
                  Coming soon with filters, stock levels & pricing.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-8 text-sm text-slate-600">
          <p className="font-semibold">{SITE}</p>
          <p>
            Phone: {PHONE_PRIMARY} · {PHONE_ALT1} · {PHONE_ALT2} &nbsp;|&nbsp;
            Email: {SUPPORT_EMAIL}
          </p>
          <p className="mt-1">
            WhatsApp:{" "}
            <a
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/${WHATSAPP_DIGITS}`}
            >
              {WHATSAPP_RAW}
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
