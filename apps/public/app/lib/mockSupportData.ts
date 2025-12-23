// Public-facing Support page; placeholder content must be replaced before launch.
import { LucideIcon } from "lucide-react";

export type SupportEntryType = "article" | "guide" | "troubleshooting" | "release";
export type SupportEntry = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  type: SupportEntryType;
  tags: string[];
  readTime: string;
  link: string;
};

export type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  anchor: string;
  filters?: string[];
};

export type PersonaConfig = {
  id: string;
  label: string;
  description: string;
  contactCta: string;
  contactHint: string;
  recommendedTopics: string[];
  bestChannel: string;
  troubleshooting: string;
};

export const supportFilters = [
  "Payments",
  "Maintenance",
  "Leasing",
  "Accounting",
  "Portal Access",
  "Integrations",
  "Data & Security",
];

export const supportEntries: SupportEntry[] = [
  {
    id: "reset-password",
    title: "Reset your password or unlock your account",
    excerpt: "Walkthrough for portal access, MFA recovery, and device trust resets.",
    category: "Portal Access",
    type: "article",
    tags: ["portal", "access", "mfa"],
    readTime: "3 min",
    link: "#reset-password",
  },
  {
    id: "resident-login",
    title: "Resident portal sign-in troubleshooting",
    excerpt: "Quick checks for browser, cookies, and verification emails.",
    category: "Portal Access",
    type: "troubleshooting",
    tags: ["resident", "access"],
    readTime: "4 min",
    link: "#resident-login",
  },
  {
    id: "payment-runs",
    title: "Understand payment batches and settlements",
    excerpt: "How payouts are grouped, when they land, and how to export remittance.",
    category: "Payments",
    type: "guide",
    tags: ["payments", "reports"],
    readTime: "6 min",
    link: "#payments",
  },
  {
    id: "maintenance-workflow",
    title: "Maintenance request workflow overview",
    excerpt: "From resident intake to vendor dispatch with status updates.",
    category: "Maintenance",
    type: "guide",
    tags: ["maintenance", "vendors"],
    readTime: "5 min",
    link: "#maintenance",
  },
  {
    id: "leasing-pipeline",
    title: "Lease & application review checklist",
    excerpt: "Screening, approvals, and move-in timelines at a glance.",
    category: "Leasing",
    type: "article",
    tags: ["leasing", "applications"],
    readTime: "4 min",
    link: "#leasing",
  },
  {
    id: "owner-reporting",
    title: "Owner reporting and distribution exports",
    excerpt: "Create recurring owner packets with statements and commentary.",
    category: "Accounting",
    type: "guide",
    tags: ["owners", "reports"],
    readTime: "7 min",
    link: "#owners",
  },
  {
    id: "integrations-api",
    title: "Integrations & API access",
    excerpt: "Connect accounting, BI, and messaging tools; request sandbox keys.",
    category: "Integrations",
    type: "article",
    tags: ["api", "security"],
    readTime: "5 min",
    link: "#integrations",
  },
  {
    id: "data-export",
    title: "Data export and audit logs",
    excerpt: "How to export ledgers, maintenance history, and access audit trails.",
    category: "Data & Security",
    type: "article",
    tags: ["audit", "exports"],
    readTime: "4 min",
    link: "#data",
  },
  {
    id: "release-jan",
    title: "Release notes: Winter highlights",
    excerpt: "Messaging quality-of-life updates, payments reconciliation improvements.",
    category: "Release Notes",
    type: "release",
    tags: ["release", "messaging", "payments"],
    readTime: "2 min",
    link: "#release-jan",
  },
  {
    id: "status-page",
    title: "Check live system status",
    excerpt: "View uptime, planned maintenance, and historical incidents.",
    category: "Status",
    type: "article",
    tags: ["status", "uptime"],
    readTime: "1 min",
    link: "#status",
  },
  {
    id: "security-packet",
    title: "Request security & compliance packet",
    excerpt: "Placeholders for SOC docs, pen test summary, and data retention notes.",
    category: "Data & Security",
    type: "article",
    tags: ["security", "compliance"],
    readTime: "3 min",
    link: "#security",
  },
  {
    id: "onboarding-checklist",
    title: "Onboarding checklist for admins",
    excerpt: "Steps to launch: domains, roles, import data, and announce.",
    category: "Onboarding",
    type: "guide",
    tags: ["admins", "setup"],
    readTime: "6 min",
    link: "#onboarding",
  },
  {
    id: "escalation",
    title: "How to request escalation",
    excerpt: "When to raise severity and what information to include.",
    category: "Support",
    type: "article",
    tags: ["escalation", "severity"],
    readTime: "3 min",
    link: "#escalation",
  },
  {
    id: "resident-payments",
    title: "Resident payment troubleshooting",
    excerpt: "Card declines, ACH holds, and duplicate attempts guidance.",
    category: "Payments",
    type: "troubleshooting",
    tags: ["resident", "payments"],
    readTime: "5 min",
    link: "#resident-payments",
  },
  {
    id: "maintenance-emergency",
    title: "Emergency maintenance triage",
    excerpt: "What to do first, how to notify residents, and confirm vendors.",
    category: "Maintenance",
    type: "troubleshooting",
    tags: ["maintenance", "emergency"],
    readTime: "4 min",
    link: "#maintenance-emergency",
  },
];

export const featuredCollections = [
  {
    id: "getting-started",
    title: "Getting Started (Org)",
    description: "Launch checklist for new administrators and IT partners.",
    imageLabel: "Collection thumbnail placeholder",
  },
  {
    id: "resident-basics",
    title: "Resident Portal Basics",
    description: "Invite residents, brand portals, and send first announcements.",
    imageLabel: "Resident portal preview placeholder",
  },
  {
    id: "maintenance-ops",
    title: "Maintenance Operations",
    description: "Routing, vendors, and SLA tracking for work orders.",
    imageLabel: "Maintenance board placeholder",
  },
  {
    id: "payments-recon",
    title: "Payments & Reconciliation",
    description: "Close month-end faster with clean payouts and exports.",
    imageLabel: "Payments dashboard placeholder",
  },
  {
    id: "leasing-pipeline",
    title: "Leasing Pipeline",
    description: "Capture applications, screening steps, and approvals.",
    imageLabel: "Leasing timeline placeholder",
  },
  {
    id: "reports-exports",
    title: "Reports & Exports",
    description: "Standard reports, scheduled sends, and CSV/API access.",
    imageLabel: "Reporting stack placeholder",
  },
];

export const bestPracticeGuides = [
  {
    id: "collaboration",
    title: "Run maintenance triage like an ops desk",
    summary: "Suggested intake prompts, internal notes, and vendor SLAs.",
  },
  {
    id: "comms",
    title: "Messaging playbook for resident updates",
    summary: "Templates for outages, inspections, and community events.",
  },
  {
    id: "finance",
    title: "Close the books with fewer reclasses",
    summary: "Placeholder reconciliation and approvals flow.",
  },
];

export const popularAccordions = [
  {
    id: "faq-access",
    title: "Troubleshoot access & invites",
    steps: [
      "Confirm invite email and role alignment.",
      "Check spam folder and allowlisting settings.",
      "Reset MFA or device trust if blocked.",
    ],
  },
  {
    id: "faq-payments",
    title: "Payments not appearing",
    steps: [
      "Verify deposit account is active (placeholder).",
      "Check batch cutoff times and holidays (placeholder).",
      "Export payout report to confirm batch membership (placeholder).",
    ],
  },
  {
    id: "faq-maintenance",
    title: "Route maintenance to the right team",
    steps: [
      "Set property tags and vendor pools.",
      "Use severity to auto-route urgent requests.",
      "Send resident confirmations with SLA expectations.",
    ],
  },
];

export const personaConfigs: PersonaConfig[] = [
  {
    id: "prospect",
    label: "Prospect",
    description: "Evaluating BridgeWorks for your portfolio.",
    contactCta: "Talk with sales",
    contactHint: "We will connect you with a solutions lead.",
    recommendedTopics: [
      "Product overview demo",
      "Security & data handling",
      "Implementation approach",
    ],
    bestChannel: "Schedule a discovery call",
    troubleshooting: "Share your portfolio and key goals to route you correctly.",
  },
  {
    id: "tenant",
    label: "Tenant/Resident",
    description: "Questions about payments or access.",
    contactCta: "Contact resident support",
    contactHint: "We route you to the property team first.",
    recommendedTopics: [
      "Pay rent",
      "Portal access",
      "Maintenance updates",
    ],
    bestChannel: "Live chat or portal message",
    troubleshooting: "Start with the portal help center for faster fixes.",
  },
  {
    id: "staff",
    label: "Property Manager/Staff",
    description: "Daily operations, leasing, and maintenance.",
    contactCta: "Contact property ops",
    contactHint: "Route to your assigned CSM.",
    recommendedTopics: [
      "Work order routing",
      "Leasing pipeline",
      "Bulk communications",
    ],
    bestChannel: "Open a ticket with context",
    troubleshooting: "Attach screenshots and recent changes.",
  },
  {
    id: "owner",
    label: "Owner/Investor",
    description: "Reporting and distributions.",
    contactCta: "Contact owner support",
    contactHint: "We’ll share reporting placeholders.",
    recommendedTopics: [
      "Owner packets",
      "Statement timing",
      "Access permissions",
    ],
    bestChannel: "Email with portfolio details",
    troubleshooting: "Include entity names and timeframes.",
  },
  {
    id: "admin",
    label: "Org Admin/IT",
    description: "Identity, integrations, security requests.",
    contactCta: "Contact admin support",
    contactHint: "We’ll review authentication and API needs.",
    recommendedTopics: [
      "SSO/SCIM setup",
      "API keys",
      "Audit logs",
    ],
    bestChannel: "Ticket + follow-up call",
    troubleshooting: "Share IdP details and data scope.",
  },
];

export const contactOptions = [
  {
    id: "ticket",
    title: "Open a Support Ticket",
    description: "Best for tracked issues and routing to specialists.",
    availability: "Placeholder hours",
  },
  {
    id: "chat",
    title: "Live Chat",
    description: "Fast answers for quick questions.",
    availability: "Placeholder hours",
  },
  {
    id: "email",
    title: "Email Support",
    description: "Shared inbox for attachments and async threads.",
    availability: "Placeholder hours",
  },
  {
    id: "sales",
    title: "Sales / Demo",
    description: "For prospects evaluating BridgeWorks.",
    availability: "Placeholder hours",
  },
];

export const statusSubscriptions = [
  { id: "email", label: "Email", description: "Receive incident summaries." },
  { id: "sms", label: "SMS", description: "Placeholder SMS alerts." },
  { id: "webhook", label: "RSS / Webhook", description: "Connect to tooling." },
];

export const supportPlans = [
  {
    id: "standard",
    name: "Standard (Placeholder)",
    response: "Example response target",
    coverage: "Business hours placeholder",
    channels: ["Ticket", "Email"],
    notes: "Foundational support with knowledge base.",
  },
  {
    id: "premium",
    name: "Premium (Placeholder)",
    response: "Priority routing example",
    coverage: "Extended hours placeholder",
    channels: ["Ticket", "Chat", "Email"],
    notes: "Includes success check-ins and onboarding support.",
  },
  {
    id: "enterprise",
    name: "Enterprise (Placeholder)",
    response: "Named team and faster targets (placeholder)",
    coverage: "Coverage windows tailored (placeholder)",
    channels: ["Ticket", "Chat", "Email", "Dedicated channel"],
    notes: "Escalation path, training, and release previews.",
  },
];

export const severityWizard = [
  {
    prompt: "Is this blocking rent collection or payments?",
    recommendation: "Mark as Critical and open a ticket with impact details.",
  },
  {
    prompt: "Is this a security or data exposure concern?",
    recommendation: "Open Critical and request a call; include time detected.",
  },
  {
    prompt: "Is there a workaround available?",
    recommendation: "Use High for urgent, Medium if a temporary workaround works.",
  },
];

export const escalationTimeline = [
  "Submit ticket with impact and logs (placeholder).",
  "Triage by support specialist (placeholder).",
  "Escalation to product/engineering (placeholder).",
  "Updates and mitigation shared (placeholder).",
  "Post-incident review and actions (placeholder).",
];

export const trainingResources = [
  {
    id: "admin-checklist",
    title: "Admin setup checklist",
    description: "Domains, roles, and environment readiness (placeholder).",
    cta: "Download placeholder",
  },
  {
    id: "data-import",
    title: "Data import / migration guide",
    description: "Mapping data sources and validation steps (placeholder).",
    cta: "View guide",
  },
  {
    id: "role-paths",
    title: "Role-based training paths",
    description: "Tenant, Staff, and Admin video paths (placeholder).",
    cta: "Explore paths",
  },
];

export const webinarSchedule = [
  {
    id: "office-hours",
    title: "Weekly office hours",
    date: "Every Tuesday (placeholder)",
    audience: "Open Q&A",
  },
  {
    id: "leasing-clinic",
    title: "Leasing pipeline clinic",
    date: "Twice monthly (placeholder)",
    audience: "Leasing teams",
  },
  {
    id: "security-brief",
    title: "Security & controls briefing",
    date: "Monthly (placeholder)",
    audience: "Admins / IT",
  },
];

export const releaseNotes = [
  {
    id: "rn-messaging",
    module: "Messaging",
    title: "Inbox quality updates",
    date: "This month (placeholder)",
    changes: [
      "Smarter templates for resident notices (placeholder).",
      "Delivery insights placeholder.",
    ],
  },
  {
    id: "rn-payments",
    module: "Payments",
    title: "Reconciliation improvements",
    date: "Recent (placeholder)",
    changes: [
      "Batch summary export placeholder.",
      "Payment method guidance placeholder.",
    ],
  },
  {
    id: "rn-maintenance",
    module: "Maintenance",
    title: "Mobile work order updates",
    date: "Recent (placeholder)",
    changes: [
      "Offline notes placeholder.",
      "New statuses placeholder.",
    ],
  },
  {
    id: "rn-reports",
    module: "Reports",
    title: "Scheduled exports",
    date: "Recent (placeholder)",
    changes: [
      "CSV and PDF delivery placeholder.",
      "Audience targeting placeholder.",
    ],
  },
];

export const faqItems = [
  { question: "What channels can I use to get help?", answer: "Placeholder for ticket, chat, and email options.", tags: ["channels", "contact"] },
  { question: "Do you offer onboarding support?", answer: "Placeholder onboarding help available.", tags: ["onboarding"] },
  { question: "How do I reset my password?", answer: "Use the portal reset flow placeholder.", tags: ["access", "password"] },
  { question: "Where do I see system status?", answer: "Placeholder status page link.", tags: ["status"] },
  { question: "Can residents message the team?", answer: "Placeholder for in-app messaging availability.", tags: ["resident", "messaging"] },
  { question: "How do I export data?", answer: "Placeholder for CSV/API export steps.", tags: ["data", "export"] },
  { question: "Do you support SSO?", answer: "Placeholder for SSO/SCIM setup guidance.", tags: ["sso", "security"] },
  { question: "How are incidents communicated?", answer: "Placeholder for incident comms and channels.", tags: ["incidents"] },
  { question: "Do you have SLAs?", answer: "Placeholder example targets only.", tags: ["sla"] },
  { question: "How can I request a feature?", answer: "Placeholder feature request intake via ticket.", tags: ["features"] },
  { question: "How do I invite staff?", answer: "Placeholder for invite steps and role assignment.", tags: ["staff", "access"] },
  { question: "What about emergency maintenance?", answer: "Placeholder guidance to call property lines first.", tags: ["maintenance", "emergency"] },
  { question: "How do I reconcile payouts?", answer: "Placeholder instructions for payouts and ledgers.", tags: ["payments", "accounting"] },
  { question: "Can I get a security packet?", answer: "Placeholder for requesting security artifacts.", tags: ["security"] },
  { question: "Where are release notes?", answer: "Placeholder for release notes feed.", tags: ["release"] },
];

export const popularTopics = [
  "Payments failing",
  "Maintenance routing",
  "Portal access",
  "Owner statements",
  "Integrations & API",
];

export const heroTrustChips = [
  "Knowledge Base",
  "Guided Troubleshooting",
  "Status Updates",
  "Priority & SLAs",
  "Onboarding",
  "Community",
];

export const quickActionSeed: Omit<QuickAction, "icon">[] = [
  {
    id: "qa-reset",
    title: "Reset password / can’t log in",
    description: "Portal access and MFA resets.",
    anchor: "#search",
    filters: ["Portal Access"],
  },
  {
    id: "qa-payments",
    title: "Payment questions",
    description: "Payout timing and declines.",
    anchor: "#search",
    filters: ["Payments"],
  },
  {
    id: "qa-maintenance",
    title: "Maintenance request workflow",
    description: "From intake to vendor dispatch.",
    anchor: "#maintenance",
    filters: ["Maintenance"],
  },
  {
    id: "qa-leasing",
    title: "Lease & applications",
    description: "Screening and approvals.",
    anchor: "#leasing",
    filters: ["Leasing"],
  },
  {
    id: "qa-owner",
    title: "Owner reporting",
    description: "Statements and packets.",
    anchor: "#owners",
    filters: ["Accounting"],
  },
  {
    id: "qa-integrations",
    title: "Integrations & API",
    description: "Connect tools and request keys.",
    anchor: "#integrations",
    filters: ["Integrations"],
  },
];
