export type ServiceRenewalStatus = 'active' | 'review' | 'pending' | 'inactive';

export type ServiceRenewalItem = {
  id: string;
  name: string;
  provider: string;
  purpose: string;
  billingType: string;
  paymentExpectation: string;
  status: ServiceRenewalStatus;
  nextReviewDate: string;
  cost: string;
  impact: string;
  notes: string;
};

export const DEFAULT_SERVICE_RENEWALS: ServiceRenewalItem[] = [
  {
    id: 'domain',
    name: 'macsunny.com Domain',
    provider: 'Domain registrar',
    purpose: 'Keeps the public MacSunny website address active.',
    billingType: 'Recurring renewal',
    paymentExpectation: 'Paid service',
    status: 'review',
    nextReviewDate: '',
    cost: '',
    impact: 'If the domain expires, customers may no longer reach macsunny.com.',
    notes: 'Enter the actual registrar, renewal date, and amount charged by the provider.',
  },
  {
    id: 'vercel-hosting',
    name: 'Vercel Hosting',
    provider: 'Vercel',
    purpose: 'Hosts and deploys the production website.',
    billingType: 'Plan-dependent',
    paymentExpectation: 'May require payment depending on plan and usage',
    status: 'active',
    nextReviewDate: '',
    cost: '',
    impact: 'Hosting limits or billing issues can affect deployments or site availability.',
    notes: 'Record the current Vercel plan and billing review date if a paid plan is used.',
  },
  {
    id: 'vercel-blob',
    name: 'Vercel Blob Storage',
    provider: 'Vercel',
    purpose: 'Stores product image assets uploaded through the application.',
    billingType: 'Usage-based / plan-dependent',
    paymentExpectation: 'Usage may incur charges',
    status: 'active',
    nextReviewDate: '',
    cost: '',
    impact: 'Storage or billing limits can affect product image uploads and asset availability.',
    notes: 'Review storage usage and any applicable Vercel Blob charges periodically.',
  },
  {
    id: 'mongodb',
    name: 'MongoDB Atlas',
    provider: 'MongoDB',
    purpose: 'Stores products, orders, settings, cached equivalents, and operational data.',
    billingType: 'Plan / usage-dependent',
    paymentExpectation: 'May require payment depending on plan and usage',
    status: 'active',
    nextReviewDate: '',
    cost: '',
    impact: 'Database suspension or quota exhaustion can affect core storefront and admin functions.',
    notes: 'Record the current Atlas plan and review date. Free tiers can still have usage limits.',
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    provider: 'OpenAI',
    purpose: 'Powers AI assistant, voice features, and AI-assisted product management.',
    billingType: 'Usage-based',
    paymentExpectation: 'Paid usage-based service',
    status: 'active',
    nextReviewDate: '',
    cost: '',
    impact: 'Insufficient API billing capacity can disable AI-powered features.',
    notes: 'Review API usage and billing balance regularly.',
  },
  {
    id: 'nexar',
    name: 'Nexar',
    provider: 'Nexar',
    purpose: 'Provides external electronic-component data and equivalent-part lookup.',
    billingType: 'Provider subscription / plan',
    paymentExpectation: 'Paid service',
    status: 'active',
    nextReviewDate: '',
    cost: '',
    impact: 'If Nexar access lapses, connected external component lookup may stop.',
    notes: 'Enter the real Nexar billing or renewal date and current plan cost.',
  },
  {
    id: 'paystack',
    name: 'Paystack',
    provider: 'Paystack',
    purpose: 'Processes supported customer payment transactions.',
    billingType: 'Transaction fees',
    paymentExpectation: 'Fees apply to processed transactions',
    status: 'active',
    nextReviewDate: '',
    cost: '',
    impact: 'Provider account or settlement issues can affect online payment processing.',
    notes: 'Transaction charges are provider fees rather than a normal annual renewal.',
  },
  {
    id: 'mouser',
    name: 'Mouser Search API',
    provider: 'Mouser Electronics',
    purpose: 'Provides an additional external component-search source when access is approved.',
    billingType: 'Provider terms pending',
    paymentExpectation: 'Confirm provider terms before activation',
    status: 'pending',
    nextReviewDate: '',
    cost: '',
    impact: 'If unavailable, MacSunny can still use its other research and component-reference sources.',
    notes: 'API access request is pending. Update this record when Mouser confirms account terms.',
  },
];
