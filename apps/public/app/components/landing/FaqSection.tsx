"use client";

import { useState } from "react";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

/*
 * Section: FAQ accordion.
 * Purpose: Answer top questions with accessible expand/collapse.
 * Edit: faqs array (question/answer).
 * Layout: Uses layout.sectionMuted, layout.card, layout.bodyMax.
 */
export function FaqSection() {
  // EDIT ME: Update FAQ questions and answers.
  const faqs = [
    {
      // Safe to edit: question and answer.
      question: "How long does implementation take?",
      answer:
        "Most teams launch a pilot within 4-6 weeks depending on data readiness.",
    },
    {
      // Safe to edit: question and answer.
      question: "Do you integrate with our existing PMS?",
      answer:
        "Yes. BridgeWorks connects with leading property management systems and accounting tools.",
    },
    {
      // Safe to edit: question and answer.
      question: "Can we configure workflows per property?",
      answer:
        "Absolutely. Workflows, permissions, and forms are configurable by portfolio, region, or asset.",
    },
    {
      // Safe to edit: question and answer.
      question: "Is BridgeWorks mobile-friendly?",
      answer:
        "Every module is designed for mobile use, from inspections to resident communication.",
    },
    {
      // Safe to edit: question and answer.
      question: "What support is included?",
      answer:
        "All plans include onboarding, training, and access to our support team.",
    },
    {
      // Safe to edit: question and answer.
      question: "How is pricing structured?",
      answer:
        "Pricing is based on units and modules, with enterprise options for custom needs.",
    },
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={layout.sectionMuted}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>FAQ</p>
          <h2 className={cn(layout.h2, "mt-3")}>Questions teams ask before they switch.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Answers to the most common questions from operators and ownership groups.
          </p>
        </div>
        <div className="mt-10 grid gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const buttonId = `faq-${index}-button`;
            const panelId = `faq-${index}-panel`;

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
  );
}
