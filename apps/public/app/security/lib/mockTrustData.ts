/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

export type TrustChip = {
  id: string;
  label: string;
  description: string;
};

export type AtAGlanceMetric = {
  id: string;
  title: string;
  value: string;
  description?: string;
  href?: string;
};

export type ProgramMilestone = {
  id: string;
  title: string;
  description: string;
  status: "Planned" | "In progress" | "Ongoing";
};

export type OverviewTile = {
  id: string;
  title: string;
  description: string;
};

export type ArchitectureCallout = {
  id: string;
  label: string;
  description: string;
};

export type ControlArea =
  | "Access"
  | "Data"
  | "Network"
  | "AppSec"
  | "Monitoring"
  | "Admin"
  | "Vendor";

export type EvidenceTag = "Policy" | "Report" | "Screenshot" | "Config";

export type ControlItem = {
  id: string;
  area: ControlArea;
  name: string;
  whyItMatters: string;
  whatWeDo: string[];
  customerResponsibility?: string[];
  evidenceAvailable: EvidenceTag[];
};

export type CustomerFeature = {
  id: string;
  title: string;
  description: string;
  note?: string;
};

export type ComplianceFrameworkStatus = "Planned" | "In progress" | "Info";

export type ComplianceFramework = {
  id: string;
  name: string;
  status: ComplianceFrameworkStatus;
  summary: string;
  details: string[];
  artifacts: string[];
};

export type ThirdPartyTestingItem = {
  id: string;
  title: string;
  description: string;
};

export type DataCategory = {
  id: string;
  name: string;
  purpose: string;
  retention: string;
  exportDelete: string;
};

export type Subprocessor = {
  id: string;
  name: string;
  purpose: string;
  region: string;
  href: string;
};

export type ResidencyRegion = {
  id: string;
  label: string;
  description: string;
};

export type FaqCategory =
  | "Auth"
  | "Data"
  | "Compliance"
  | "Incident Response"
  | "Access"
  | "Integrations";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  q: string;
  a: string;
};

export const mockTrustData = {
  hero: {
    title: "Security & Trust",
    subtitle:
      "BridgeWorks PM is built to protect property, resident, and financial data.",
    trustChips: [
      {
        id: "mfa",
        label: "MFA",
        description:
          "Multi-factor authentication can be enabled for supported sign-in flows (placeholder).",
      },
      {
        id: "sso",
        label: "SSO-ready",
        description:
          "SSO/SAML readiness is a supported integration path for enterprise access (placeholder).",
      },
      {
        id: "audit",
        label: "Audit Logs",
        description:
          "Admin and workflow actions can be tracked for operational visibility (placeholder).",
      },
      {
        id: "encryption",
        label: "Encryption",
        description:
          "Data encryption in transit and at rest is part of our baseline posture (placeholder).",
      },
      {
        id: "vdp",
        label: "Responsible Disclosure",
        description:
          "Report security issues via our responsible disclosure process (placeholder).",
      },
      {
        id: "status",
        label: "Status & Uptime",
        description:
          "We publish service status updates during incidents and maintenance (placeholder).",
      },
    ] satisfies TrustChip[],
  },

  atAGlance: [
    {
      id: "encryption",
      title: "Encryption",
      value: "In transit + at rest",
      description: "Baseline encryption controls (placeholder).",
    },
    {
      id: "auth",
      title: "Auth",
      value: "MFA supported",
      description: "Options vary by deployment and IdP (placeholder).",
    },
    {
      id: "logging",
      title: "Logging",
      value: "Admin activity tracked",
      description: "Key actions are logged for review (placeholder).",
    },
    {
      id: "availability",
      title: "Availability",
      value: "Status updates",
      description: "Operational transparency via status page (placeholder).",
      href: "https://status.bridgeworkspm.example",
    },
    {
      id: "data-controls",
      title: "Data controls",
      value: "Retention & export",
      description: "Retention and exports are configurable (placeholder).",
    },
    {
      id: "contact",
      title: "Security contact",
      value: "security@bridgeworkspm.com",
      description: "For security questions and disclosures (placeholder).",
      href: "mailto:security@bridgeworkspm.com",
    },
  ] satisfies AtAGlanceMetric[],

  tabs: [
    { id: "overview", label: "Overview" },
    { id: "controls", label: "Controls" },
    { id: "compliance", label: "Compliance" },
    { id: "privacy", label: "Privacy" },
    { id: "vulnerability", label: "Vulnerability Disclosure" },
    { id: "faq", label: "FAQ" },
  ] as const,

  overview: {
    securityProgram: {
      pillars: [
        {
          id: "people",
          title: "People",
          description:
            "Security ownership, training, and clear escalation paths across the team (placeholder).",
        },
        {
          id: "process",
          title: "Process",
          description:
            "Documented policies, change management, and regular access reviews (placeholder).",
        },
        {
          id: "technology",
          title: "Technology",
          description:
            "Defense-in-depth controls across identity, data protection, and monitoring (placeholder).",
        },
      ] satisfies OverviewTile[],
      timeline: [
        {
          id: "sdlc",
          title: "Secure SDLC",
          description:
            "Security reviews and automated checks as part of delivery workflows (placeholder).",
          status: "Ongoing",
        },
        {
          id: "access-reviews",
          title: "Access reviews",
          description:
            "Periodic reviews of admin and privileged access (placeholder).",
          status: "Ongoing",
        },
        {
          id: "incident-drills",
          title: "Incident drills",
          description:
            "Tabletop exercises to validate incident response readiness (placeholder).",
          status: "Planned",
        },
        {
          id: "third-party-testing",
          title: "Third-party testing",
          description:
            "External testing to validate control effectiveness (placeholder).",
          status: "In progress",
        },
      ] satisfies ProgramMilestone[],
    },
    protectionTiles: [
      {
        id: "pii",
        title: "Tenant PII protections",
        description:
          "Data minimization and role-based exposure of resident details (placeholder).",
      },
      {
        id: "payments",
        title: "Payments integration boundary",
        description:
          "Payment data is handled via a provider boundary where applicable (placeholder).",
      },
      {
        id: "rbac",
        title: "RBAC & sensitive actions",
        description:
          "Role-based access with sensitive action codes for high-impact operations (placeholder).",
      },
      {
        id: "monitoring",
        title: "Monitoring & alerting",
        description:
          "Signals, alerts, and review workflows for abnormal activity (placeholder).",
      },
      {
        id: "backups",
        title: "Backups & recovery",
        description:
          "Backups and restoration processes to support recovery goals (placeholder).",
      },
      {
        id: "vendor",
        title: "Vendor risk",
        description:
          "Third-party vendors are assessed and tracked (placeholder).",
      },
    ] satisfies OverviewTile[],
    architecture: {
      title: "Architecture Snapshot",
      description:
        "A simplified view of core product boundaries and security control points (placeholder).",
      callouts: [
        {
          id: "identity",
          label: "Identity",
          description:
            "Centralized authentication and session controls (placeholder).",
        },
        {
          id: "tenant-boundary",
          label: "Tenant boundary",
          description:
            "Isolation for customer data access paths (placeholder).",
        },
        {
          id: "audit",
          label: "Audit layer",
          description:
            "Workflow activity is recorded for review and export (placeholder).",
        },
        {
          id: "data-store",
          label: "Data store",
          description:
            "Encryption and backup controls protect stored data (placeholder).",
        },
      ] satisfies ArchitectureCallout[],
    },
  },

  controls: {
    areas: [
      "Access",
      "Data",
      "Network",
      "AppSec",
      "Monitoring",
      "Admin",
      "Vendor",
    ] satisfies ControlArea[],
    items: [
      {
        id: "access-mfa",
        area: "Access",
        name: "Multi-factor authentication",
        whyItMatters: "Reduces account takeover risk for privileged roles.",
        whatWeDo: [
          "Support MFA for supported sign-in experiences (placeholder).",
          "Encourage strong, unique passwords and modern authentication (placeholder).",
          "Provide admin guidance for MFA adoption (placeholder).",
        ],
        customerResponsibility: [
          "Enforce MFA for your organization users where available (placeholder).",
          "Maintain your IdP policies if using SSO (placeholder).",
        ],
        evidenceAvailable: ["Policy", "Screenshot"],
      },
      {
        id: "access-sso",
        area: "Access",
        name: "SSO / SAML readiness",
        whyItMatters: "Centralizes identity lifecycle and reduces credential sprawl.",
        whatWeDo: [
          "Provide an enterprise SSO integration path (placeholder).",
          "Support least-privilege role mapping patterns (placeholder).",
        ],
        customerResponsibility: [
          "Configure and manage IdP groups and access assignments (placeholder).",
        ],
        evidenceAvailable: ["Config"],
      },
      {
        id: "data-encryption",
        area: "Data",
        name: "Encryption in transit + at rest",
        whyItMatters: "Protects data confidentiality across networks and storage.",
        whatWeDo: [
          "Encrypt data in transit using industry-standard protocols (placeholder).",
          "Encrypt stored data at rest (placeholder).",
        ],
        evidenceAvailable: ["Policy"],
      },
      {
        id: "data-backups",
        area: "Data",
        name: "Backups and recovery",
        whyItMatters: "Supports business continuity and incident recovery.",
        whatWeDo: [
          "Maintain backup processes and recovery runbooks (placeholder).",
          "Perform periodic restoration testing (placeholder).",
        ],
        evidenceAvailable: ["Policy", "Report"],
      },
      {
        id: "appsec-sdlc",
        area: "AppSec",
        name: "Secure SDLC checks",
        whyItMatters: "Prevents vulnerabilities from reaching production.",
        whatWeDo: [
          "Use automated checks for dependencies and code quality (placeholder).",
          "Perform peer reviews for security-sensitive changes (placeholder).",
        ],
        evidenceAvailable: ["Policy", "Screenshot"],
      },
      {
        id: "monitoring-audit",
        area: "Monitoring",
        name: "Audit logs and alerting",
        whyItMatters: "Improves detection and investigation of abnormal activity.",
        whatWeDo: [
          "Track admin and key workflow actions (placeholder).",
          "Alert on unusual patterns where feasible (placeholder).",
          "Support export for customer review (placeholder).",
        ],
        evidenceAvailable: ["Screenshot", "Config"],
      },
      {
        id: "admin-least-priv",
        area: "Admin",
        name: "Least privilege and access reviews",
        whyItMatters: "Limits the blast radius of compromised accounts.",
        whatWeDo: [
          "Use role-based permissions and scoped access (placeholder).",
          "Conduct periodic reviews of privileged access (placeholder).",
        ],
        evidenceAvailable: ["Policy"],
      },
      {
        id: "vendor-risk",
        area: "Vendor",
        name: "Vendor risk management",
        whyItMatters: "Third parties can introduce security and privacy risk.",
        whatWeDo: [
          "Maintain an inventory of key subprocessors (placeholder).",
          "Review vendor security and privacy posture as appropriate (placeholder).",
        ],
        evidenceAvailable: ["Policy", "Report"],
      },
      {
        id: "network-boundary",
        area: "Network",
        name: "Network boundary controls",
        whyItMatters: "Reduces exposure of internal services.",
        whatWeDo: [
          "Use network controls to limit access paths (placeholder).",
          "Harden entrypoints and reduce attack surface (placeholder).",
        ],
        evidenceAvailable: ["Config"],
      },
    ] satisfies ControlItem[],
    customerFeatures: [
      {
        id: "feature-sso",
        title: "SSO/SAML-ready",
        description:
          "Enterprise SSO integration path for centralized identity (placeholder).",
        note: "Placeholder: availability may vary by plan.",
      },
      {
        id: "feature-mfa",
        title: "MFA",
        description:
          "Multi-factor authentication for supported authentication flows (placeholder).",
      },
      {
        id: "feature-session",
        title: "Session timeouts",
        description:
          "Session controls to reduce risk from unattended access (placeholder).",
      },
      {
        id: "feature-ip",
        title: "IP allowlist",
        description:
          "Optional IP restrictions for admin access (placeholder).",
        note: "Placeholder: requires configuration.",
      },
      {
        id: "feature-audit-export",
        title: "Audit log export",
        description:
          "Export logs for customer SIEM or review workflows (placeholder).",
      },
      {
        id: "feature-rbac",
        title: "RBAC",
        description:
          "Role-based permissions across product areas (placeholder).",
      },
      {
        id: "feature-boundary",
        title: "Tenant/admin boundaries",
        description:
          "Separation of tenant vs staff/admin functions (placeholder).",
      },
    ] satisfies CustomerFeature[],
  },

  compliance: {
    frameworks: [
      {
        id: "soc2",
        name: "SOC 2",
        status: "Planned",
        summary:
          "A future SOC 2 engagement helps validate control design and operation (placeholder).",
        details: [
          "Scope, timelines, and auditor selection are planning items (placeholder).",
          "Controls will be mapped to Trust Services Criteria (placeholder).",
        ],
        artifacts: [
          "Policies summary (placeholder)",
          "Architecture overview (placeholder)",
          "SOC report (if available) (placeholder)",
        ],
      },
      {
        id: "iso27001",
        name: "ISO 27001",
        status: "Planned",
        summary:
          "An ISMS framework for managing risk and continuous improvement (placeholder).",
        details: [
          "Risk management and documented controls (placeholder).",
          "Continuous improvement and internal audits (placeholder).",
        ],
        artifacts: [
          "ISMS overview (placeholder)",
          "Policies summary (placeholder)",
        ],
      },
      {
        id: "gdpr",
        name: "GDPR Support",
        status: "Info",
        summary:
          "We support GDPR-aligned practices via contractual and technical controls (placeholder).",
        details: [
          "Data processing terms available via DPA (placeholder).",
          "Data export and deletion workflows available (placeholder).",
        ],
        artifacts: ["DPA (placeholder)", "Subprocessors list (placeholder)"],
      },
      {
        id: "ccpa",
        name: "CCPA",
        status: "Info",
        summary:
          "We support CCPA-aligned requests and disclosures (placeholder).",
        details: [
          "Data rights support via privacy intake (placeholder).",
          "Contractual addenda available as needed (placeholder).",
        ],
        artifacts: ["Privacy policy (placeholder)"],
      },
    ] satisfies ComplianceFramework[],
    securityPacket: {
      title: "Request the Security Packet",
      description:
        "The security packet may include a policies summary, pentest summary, architecture overview, and available assurance reports (placeholders).",
      includes: [
        "Policies summary (placeholder)",
        "Architecture overview (placeholder)",
        "Pen test summary (placeholder)",
        "SOC report (if available) (placeholder)",
      ],
    },
    thirdPartyTesting: [
      {
        id: "pentest",
        title: "Pen test cadence",
        description:
          "Periodic third-party testing to validate controls (placeholder).",
      },
      {
        id: "vuln-scan",
        title: "Vulnerability scanning",
        description:
          "Automated scanning and triage processes (placeholder).",
      },
      {
        id: "deps",
        title: "Dependency scanning",
        description:
          "Monitor dependencies for known issues (placeholder).",
      },
    ] satisfies ThirdPartyTestingItem[],
  },

  privacy: {
    dataCategories: [
      {
        id: "account",
        name: "Account data",
        purpose: "Authentication, billing, and account operations (placeholder).",
        retention: "Retained while account is active (placeholder).",
        exportDelete: "Export and deletion supported (placeholder).",
      },
      {
        id: "property",
        name: "Property data",
        purpose:
          "Portfolio operations like units, work orders, and vendor workflows (placeholder).",
        retention: "Configurable retention policies (placeholder).",
        exportDelete: "Exports available; deletion by request (placeholder).",
      },
      {
        id: "resident",
        name: "Resident data",
        purpose: "Resident operations and communications (placeholder).",
        retention: "Configured by customer policy (placeholder).",
        exportDelete: "Exports available; deletion by request (placeholder).",
      },
      {
        id: "payment",
        name: "Payment data (via provider)",
        purpose:
          "Payment processing is handled via an integration boundary (placeholder).",
        retention: "Provider-defined retention (placeholder).",
        exportDelete: "Managed through provider workflows (placeholder).",
      },
      {
        id: "support",
        name: "Support messages",
        purpose: "Customer support and incident communications (placeholder).",
        retention: "Retained for support continuity (placeholder).",
        exportDelete: "Deletion by request where applicable (placeholder).",
      },
    ] satisfies DataCategory[],
    subprocessors: [
      {
        id: "sub-1",
        name: "Cloud hosting provider",
        purpose: "Application hosting and storage (placeholder).",
        region: "US (placeholder)",
        href: "https://vendor.example/subprocessor",
      },
      {
        id: "sub-2",
        name: "Email delivery",
        purpose: "Transactional emails (placeholder).",
        region: "US/EU (placeholder)",
        href: "https://vendor.example/email",
      },
      {
        id: "sub-3",
        name: "Customer support tooling",
        purpose: "Support ticketing (placeholder).",
        region: "US (placeholder)",
        href: "https://vendor.example/support",
      },
    ] satisfies Subprocessor[],
    residencyRegions: [
      {
        id: "us",
        label: "United States",
        description:
          "Default region option for most deployments (placeholder).",
      },
      {
        id: "ca",
        label: "Canada",
        description:
          "Available for customers with regional needs (placeholder).",
      },
      {
        id: "eu",
        label: "European Union",
        description:
          "Available for customers with EU residency requirements (placeholder).",
      },
    ] satisfies ResidencyRegion[],
    privacyLinks: {
      privacyPolicyHref: "/privacy",
      dpaHref: "/privacy#dpa",
      cookiePolicyHref: "/privacy#cookies",
    },
  },

  vulnerability: {
    policySections: [
      {
        id: "how",
        title: "How to report",
        body: [
          "Email security@bridgeworkspm.com with details of the issue (placeholder).",
          "Use clear reproduction steps and any proof-of-concept (placeholder).",
        ],
      },
      {
        id: "safe-harbor",
        title: "Safe harbor",
        body: [
          "We support good-faith security research and coordinated disclosure (placeholder).",
          "Avoid accessing customer data beyond what is necessary to demonstrate the issue (placeholder).",
        ],
      },
      {
        id: "include",
        title: "What to include",
        body: [
          "Affected URL(s) and environment details (placeholder).",
          "Impact assessment and severity estimate (placeholder).",
          "Screenshots or logs if relevant (placeholder).",
        ],
      },
      {
        id: "response",
        title: "Response process",
        body: [
          "We’ll acknowledge reports and coordinate next steps (placeholder).",
          "We may request additional details to validate and reproduce (placeholder).",
        ],
      },
    ],
    hallOfThanks: {
      enabled: true,
      names: [
        "Alex Rivera (placeholder)",
        "Jordan Kim (placeholder)",
        "Sam Patel (placeholder)",
      ],
    },
  },

  faq: {
    items: [
      {
        id: "auth-1",
        category: "Auth",
        q: "Do you support MFA?",
        a: "MFA is supported for applicable sign-in flows and can be enabled as part of your access posture (placeholder).",
      },
      {
        id: "auth-2",
        category: "Auth",
        q: "Is SSO available?",
        a: "We have an SSO/SAML-ready integration path for enterprise customers (placeholder).",
      },
      {
        id: "access-1",
        category: "Access",
        q: "How does RBAC work?",
        a: "BridgeWorks PM uses role-based permissions and can restrict sensitive actions via action codes (placeholder).",
      },
      {
        id: "access-2",
        category: "Access",
        q: "Can I limit admin access by IP?",
        a: "IP allowlisting is a configurable security option for some deployments (placeholder).",
      },
      {
        id: "data-1",
        category: "Data",
        q: "Is data encrypted?",
        a: "We encrypt data in transit and at rest as part of our baseline security posture (placeholder).",
      },
      {
        id: "data-2",
        category: "Data",
        q: "How do backups work?",
        a: "We maintain backups and recovery runbooks and periodically test restoration (placeholder).",
      },
      {
        id: "data-3",
        category: "Data",
        q: "Can I export my data?",
        a: "Export options are available for operational workflows and audit needs (placeholder).",
      },
      {
        id: "compliance-1",
        category: "Compliance",
        q: "Do you have SOC 2 or ISO 27001?",
        a: "We do not claim these certifications as achieved here. Framework readiness and plans are listed as Planned/In progress placeholders.",
      },
      {
        id: "compliance-2",
        category: "Compliance",
        q: "Can I review your security policies?",
        a: "You can request access to the security packet for policy summaries and available artifacts (placeholder).",
      },
      {
        id: "incident-1",
        category: "Incident Response",
        q: "How are incidents communicated?",
        a: "We aim to provide timely updates through the status page and direct notifications when appropriate (placeholder).",
      },
      {
        id: "incident-2",
        category: "Incident Response",
        q: "Do you have an incident response plan?",
        a: "We maintain an incident response process and run readiness exercises (placeholder).",
      },
      {
        id: "integrations-1",
        category: "Integrations",
        q: "How do payments integrations work?",
        a: "Payment data is typically handled via an integration/provider boundary; the exact flow depends on configuration (placeholder).",
      },
      {
        id: "integrations-2",
        category: "Integrations",
        q: "Can you integrate with my SIEM?",
        a: "Audit log export is designed to support security review workflows (placeholder).",
      },
      {
        id: "auth-3",
        category: "Auth",
        q: "Do you support phishing-resistant auth?",
        a: "Customers can adopt phishing-resistant methods via their identity provider strategy where applicable (placeholder).",
      },
      {
        id: "data-4",
        category: "Data",
        q: "What is your data retention policy?",
        a: "Retention is configurable and depends on customer requirements and contractual terms (placeholder).",
      },
      {
        id: "access-3",
        category: "Access",
        q: "Can I review admin activity?",
        a: "Admin and key workflow actions are tracked in audit logs for review and export (placeholder).",
      },
    ] satisfies FaqItem[],
  },
} as const;
