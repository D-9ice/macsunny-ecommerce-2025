'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import AdminWorkspace from '@/app/admin/components/AdminWorkspace';
import type { ServiceRenewalItem, ServiceRenewalStatus } from '@/app/lib/serviceRenewals';

const DAY_MS = 86_400_000;

function daysUntil(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / DAY_MS);
}

function dueLabel(date: string) {
  const days = daysUntil(date);
  if (days === null) return 'Date not set';
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

function statusLabel(status: ServiceRenewalStatus) {
  if (status === 'active') return 'Active';
  if (status === 'pending') return 'Pending';
  if (status === 'inactive') return 'Inactive';
  return 'Review needed';
}

function statusClasses(status: ServiceRenewalStatus) {
  if (status === 'active') return 'border-emerald-600/40 bg-emerald-950/40 text-emerald-200';
  if (status === 'pending') return 'border-amber-600/40 bg-amber-950/40 text-amber-200';
  if (status === 'inactive') return 'border-slate-600 bg-slate-800 text-slate-300';
  return 'border-orange-600/40 bg-orange-950/40 text-orange-200';
}

function paymentClasses(expectation: string) {
  const value = expectation.toLowerCase();
  if (value.includes('paid') || value.includes('fees') || value.includes('charges')) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  }
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

export default function ServicesRenewalsPage() {
  const [services, setServices] = useState<ServiceRenewalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/services-renewals', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to load services.');
        setServices(data.services || []);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to load services.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const reminders = useMemo(() => {
    return services
      .map((service) => ({ service, days: daysUntil(service.nextReviewDate) }))
      .filter(({ service, days }) => service.status === 'review' || (days !== null && days <= 30))
      .sort((a, b) => {
        if (a.days === null && b.days === null) return a.service.name.localeCompare(b.service.name);
        if (a.days === null) return 1;
        if (b.days === null) return -1;
        return a.days - b.days;
      });
  }, [services]);

  const paidOrCharged = services.filter((service) => {
    const value = service.paymentExpectation.toLowerCase();
    return value.includes('paid') || value.includes('fees') || value.includes('charges') || value.includes('payment');
  }).length;

  const dated = services.filter((service) => Boolean(service.nextReviewDate)).length;

  const updateService = (id: string, changes: Partial<ServiceRenewalItem>) => {
    setServices((current) => current.map((service) => (
      service.id === id ? { ...service, ...changes } : service
    )));
    setMessage('');
  };

  const addService = () => {
    const id = `custom-${Date.now()}`;
    setServices((current) => [
      ...current,
      {
        id,
        name: 'New Service',
        provider: '',
        purpose: '',
        billingType: 'Recurring / as applicable',
        paymentExpectation: 'Confirm provider charges',
        status: 'review',
        nextReviewDate: '',
        cost: '',
        impact: '',
        notes: '',
      },
    ]);
  };

  const removeService = (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the Services & Renewals register?`)) return;
    setServices((current) => current.filter((service) => service.id !== id));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/services-renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to save services.');
      setServices(data.services || services);
      setMessage('Services and renewal information saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save services.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminWorkspace
      title="Services & Renewals"
      subtitle="Third-party costs, renewal dates, service continuity, and application lifecycle"
      actions={
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50 sm:px-4 sm:text-sm"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <div className="flex items-start gap-3">
            <CircleDollarSign className="mt-0.5 shrink-0 text-amber-300" size={23} />
            <div>
              <h2 className="font-bold text-amber-100">Operational services are not permanently free</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-300">
                MacSunny relies on outside services for hosting, data, AI, component research, storage, payments, and its public domain.
                Some charge recurring fees, some charge by usage, and some charge per transaction. If a required service is not renewed
                or funded when necessary, the feature that depends on it may stop working.
              </p>
              <p className="mt-2 text-xs text-amber-200/80">
                Enter the real provider cost and next renewal or billing-review date below. The system will flag dates that are approaching or overdue.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tracked services</p>
            <p className="mt-2 text-2xl font-black text-white">{services.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Paid / charged services</p>
            <p className="mt-2 text-2xl font-black text-amber-200">{paidOrCharged}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Dates recorded</p>
            <p className="mt-2 text-2xl font-black text-blue-200">{dated}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Needs attention</p>
            <p className="mt-2 text-2xl font-black text-orange-200">{reminders.length}</p>
          </div>
        </section>

        {reminders.length > 0 ? (
          <section className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-orange-300" size={20} />
              <h2 className="font-bold text-orange-100">Renewal & billing attention</h2>
            </div>
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {reminders.map(({ service, days }) => (
                <div key={service.id} className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/20 bg-slate-950/70 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{service.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {service.nextReviewDate ? dueLabel(service.nextReviewDate) : 'Set the renewal / billing-review date'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    days !== null && days <= 7
                      ? 'border-red-500/40 bg-red-950/50 text-red-200'
                      : 'border-orange-500/40 bg-orange-950/50 text-orange-200'
                  }`}>
                    {service.status === 'review' && days === null ? 'Review' : days !== null && days < 0 ? 'Overdue' : 'Attention'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {message ? (
          <div className={`rounded-xl border p-3 text-sm ${
            message.includes('saved')
              ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
              : 'border-red-700 bg-red-950/30 text-red-200'
          }`}>
            {message}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Third-Party Services & Renewals</h2>
              <p className="mt-1 text-sm text-slate-400">
                Keep provider charges and renewal information here so ownership costs remain visible.
              </p>
            </div>
            <button
              type="button"
              onClick={addService}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            >
              <Plus size={16} />
              Add Service
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Loading services…</p>
          ) : (
            <div className="mt-5 space-y-4">
              {services.map((service) => {
                const days = daysUntil(service.nextReviewDate);
                const urgent = days !== null && days <= 7;
                const soon = days !== null && days <= 30;
                return (
                  <article
                    key={service.id}
                    className={`rounded-2xl border p-5 ${
                      urgent
                        ? 'border-red-500/40 bg-red-950/10'
                        : soon || service.status === 'review'
                          ? 'border-orange-500/30 bg-orange-950/10'
                          : 'border-slate-800 bg-slate-900/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={service.name}
                            onChange={(event) => updateService(service.id, { name: event.target.value })}
                            className="min-w-[16rem] flex-1 border-0 bg-transparent p-0 text-lg font-bold text-white outline-none"
                            aria-label="Service name"
                          />
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${paymentClasses(service.paymentExpectation)}`}>
                            {service.paymentExpectation || 'Billing details not recorded'}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(service.status)}`}>
                            {statusLabel(service.status)}
                          </span>
                        </div>
                        <input
                          value={service.provider}
                          onChange={(event) => updateService(service.id, { provider: event.target.value })}
                          placeholder="Provider"
                          className="mt-1 w-full border-0 bg-transparent p-0 text-sm text-slate-400 outline-none"
                          aria-label="Provider"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeService(service.id, service.name)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-950/40 hover:text-red-300"
                        aria-label={`Remove ${service.name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                        <select
                          value={service.status}
                          onChange={(event) => updateService(service.id, { status: event.target.value as ServiceRenewalStatus })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                        >
                          <option value="active">Active</option>
                          <option value="review">Review needed</option>
                          <option value="pending">Pending</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Billing model</span>
                        <input
                          value={service.billingType}
                          onChange={(event) => updateService(service.id, { billingType: event.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Next renewal / billing review</span>
                        <input
                          type="date"
                          value={service.nextReviewDate}
                          onChange={(event) => updateService(service.id, { nextReviewDate: event.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                        />
                        <span className={`mt-1 block text-xs ${urgent ? 'text-red-300' : soon ? 'text-orange-300' : 'text-slate-500'}`}>
                          {dueLabel(service.nextReviewDate)}
                        </span>
                      </label>

                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cost / plan</span>
                        <input
                          value={service.cost}
                          onChange={(event) => updateService(service.id, { cost: event.target.value })}
                          placeholder="Enter actual provider cost or plan"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">What it does</span>
                        <textarea
                          value={service.purpose}
                          onChange={(event) => updateService(service.id, { purpose: event.target.value })}
                          rows={2}
                          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-200 outline-none focus:border-violet-500"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">What can be affected if unavailable</span>
                        <textarea
                          value={service.impact}
                          onChange={(event) => updateService(service.id, { impact: event.target.value })}
                          rows={2}
                          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-200 outline-none focus:border-violet-500"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Billing / renewal note</span>
                      <input
                        value={service.paymentExpectation}
                        onChange={(event) => updateService(service.id, { paymentExpectation: event.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-200 outline-none focus:border-violet-500"
                      />
                    </label>

                    <label className="mt-4 block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                      <textarea
                        value={service.notes}
                        onChange={(event) => updateService(service.id, { notes: event.target.value })}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-300 outline-none focus:border-violet-500"
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5">
          <div className="flex items-start gap-3">
            <Wrench className="mt-0.5 shrink-0 text-blue-300" size={22} />
            <div>
              <h2 className="font-bold text-blue-100">Application Maintenance & Lifecycle</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-300">
                Third-party subscriptions and usage charges are separate from software maintenance. A production website can require
                periodic security updates, framework and dependency updates, browser compatibility work, API migrations, provider changes,
                bug fixes, and technology upgrades as the surrounding platforms evolve.
              </p>
              <p className="mt-2 text-xs text-blue-200/80">
                Maintenance work and pricing should follow the applicable support or maintenance agreement; this section does not create or invent a charge.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={21} />
            <div>
              <h2 className="font-bold text-white">Owner responsibility</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Provider prices and renewal terms can change. Record the actual information from each provider account here and review it periodically.
                MacSunny should not rely on assumed prices or assumed free service.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminWorkspace>
  );
}
