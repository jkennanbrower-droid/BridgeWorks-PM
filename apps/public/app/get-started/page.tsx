"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

export default function GetStartedPage() {
  const steps = [
    {
      title: "Submit a short application",
      description:
        "Share your portfolio size, team structure, and the workflows you want to modernize.",
    },
    {
      title: "We review and provision your organization",
      description:
        "Our team configures your workspace, permissions, and data connections.",
    },
    {
      title: "Activate in the Org app",
      description:
        "Receive an activation email and complete setup inside BridgeWorks Org.",
    },
  ];

  const faqs = [
    {
      question: "Who is the application for?",
      answer:
        "Property management companies and ownership groups ready to consolidate operations.",
    },
    {
      question: "How long does approval take?",
      answer:
        "Most applications are reviewed within 1-2 business days.",
    },
    {
      question: "Can we invite multiple team members?",
      answer:
        "Yes. We provision roles for operations, maintenance, and leasing teams.",
    },
    {
      question: "Is there onboarding support?",
      answer:
        "Every account includes guided onboarding, training, and support.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <main className="bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={layout.container}>
          <p className={layout.eyebrow}>Get started</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Create your BridgeWorks company account.
          </h1>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            For property management companies ready to streamline leasing,
            maintenance, and resident operations in one workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#application"
              className={cn(layout.buttonBase, layout.buttonPrimary)}
            >
              Start Application
            </Link>
            <Link
              href="/contact"
              className={cn(layout.buttonBase, layout.buttonSecondary)}
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <section className={layout.sectionMuted}>
        <div className={layout.container}>
          <div className="max-w-2xl">
            <p className={layout.eyebrow}>What happens next</p>
            <h2 className={cn(layout.h2, "mt-3")}>
              A clear path from application to activation.
            </h2>
            <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
              We keep the onboarding lightweight while ensuring your organization
              is provisioned correctly from day one.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className={layout.card}>
                <p className={layout.label}>Step {index + 1}</p>
                <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={layout.section}>
        <div className={layout.container}>
          <div className="max-w-2xl">
            <p className={layout.eyebrow}>FAQ</p>
            <h2 className={cn(layout.h2, "mt-3")}>
              Common questions about getting started.
            </h2>
            <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
              Everything you need to know before requesting an account.
            </p>
          </div>
          <div className="mt-10 grid gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              const buttonId = `get-started-faq-${index}-button`;
              const panelId = `get-started-faq-${index}-panel`;

              return (
                <div key={faq.question} className={layout.card}>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 text-left",
                      layout.focusRing
                    )}
                  >
                    <span className="text-base font-semibold text-slate-900 dark:text-white">
                      {faq.question}
                    </span>
                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                      {isOpen ? "Close" : "Open"}
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="mt-3 text-sm text-slate-600 dark:text-slate-300"
                  >
                    {faq.answer}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="application" className={layout.sectionTight}>
        <div className={layout.container}>
          <div className={cn(layout.card, "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between")}>
            <div>
              <p className={layout.eyebrow}>Application</p>
              <h2 className={cn(layout.h2, "mt-3")}>
                Ready to start your BridgeWorks rollout?
              </h2>
              <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
                Applications open soon. In the meantime, we can walk you through
                the onboarding timeline and requirements.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={cn(
                  layout.buttonBase,
                  layout.buttonPrimary,
                  "cursor-not-allowed opacity-60"
                )}
              >
                Start Application
              </button>
              <Link
                href="/contact"
                className={cn(layout.buttonBase, layout.buttonSecondary)}
              >
                Contact Sales
              </Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Coming soon.
          </p>
        </div>
      </section>
    </main>
  );
}
