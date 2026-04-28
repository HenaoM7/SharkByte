const variants = {
  'plan-free':              'bg-gray-100 text-gray-600',
  'plan-pro':               'bg-sb-primary/10 text-sb-primary',
  'plan-enterprise':        'bg-sb-dark/10 text-sb-dark',
  active:             'bg-sb-primary/10 text-sb-primary',
  inactive:           'bg-red-100 text-red-600',
  pending:            'bg-yellow-100 text-yellow-700',
  'no-credentials':   'bg-orange-100 text-orange-700 border border-orange-200',
  connected:          'bg-sb-primary/10 text-sb-primary',
  disconnected:       'bg-red-100 text-red-600',
  info:               'bg-sb-primary/10 text-sb-primary',
  // Billing status
  'billing-active':   'bg-sb-primary/10 text-sb-primary',
  'billing-trialing': 'bg-sb-primary/10 text-sb-primary',
  'billing-past_due': 'bg-orange-100 text-orange-700',
  'billing-canceled': 'bg-gray-100 text-gray-500',
  'billing-unpaid':   'bg-red-100 text-red-600',
  'billing-free':     'bg-gray-100 text-gray-600',
  // Automation rule triggers
  'rule-keyword':     'bg-sb-primary/10 text-sb-primary',
  'rule-schedule':    'bg-sb-secondary/10 text-sb-secondary',
  'rule-usage_limit': 'bg-orange-100 text-orange-700',
  'rule-inactivity':  'bg-yellow-100 text-yellow-700',
  // Automation rule actions
  'action-auto_reply':    'bg-sb-primary/10 text-sb-primary',
  'action-notify_admin':  'bg-sb-primary/10 text-sb-primary',
  'action-tag':           'bg-sb-dark/10 text-sb-dark',
  'action-escalate':      'bg-red-100 text-red-600',
  'action-webhook':       'bg-gray-100 text-gray-700',
}

export default function Badge({ variant, children }) {
  const cls = variants[variant] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}
