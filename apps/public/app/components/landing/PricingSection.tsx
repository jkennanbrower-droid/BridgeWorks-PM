import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

/*
 * Section: Pricing preview.
 * Purpose: Highlight plan tiers with key features and CTA.
 * Edit: tiers array (name, price, description, features).
 * Layout: Uses layout.section, layout.card, layout.bodyMax.
 */
export function PricingSection() {
  // EDIT ME: Update pricing tiers and feature lists.
  const tiers = [
    {
      // Safe to edit: name, price, description, features, highlighted.
      name: "Launch",
      price: "$0.75",
      description: "Per unit / month",
      features: ["Core workflows", "Resident portal", "Standard reporting"],
    },
    {
      // Safe to edit: name, price, description, features, highlighted.
      name: "Scale",
      price: "$1.25",
      description: "Per unit / month",
      features: [
        "Automation builder",
        "Owner reporting",
        "Priority support",
      ],
      highlighted: true,
    },
    {
      // Safe to edit: name, price, description, features, highlighted.
      name: "Enterprise",
      price: "Custom",
      description: "Portfolio pricing",
      features: [
        "Dedicated success team",
        "Custom integrations",
        "Security reviews",
      ],
    },
  ];

  return (
    <section className={layout.section}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>Pricing</p>
          <h2 className={cn(layout.h2, "mt-3")}>Flexible tiers for every portfolio size.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Start lean, then scale up with advanced automations and dedicated
            support.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                layout.card,
                tier.highlighted && "border-teal-500 shadow-md"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {tier.name}
                </h3>
                {tier.highlighted ? (
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-500/20 dark:text-teal-200">
                    Most popular
                  </span>
                ) : null}
              </div>
              <div className="mt-6 text-3xl font-semibold text-slate-900 dark:text-white">
                {tier.price}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {tier.description}
              </p>
              <ul className="mt-6 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={cn(
                  layout.buttonBase,
                  tier.highlighted ? layout.buttonPrimary : layout.buttonSecondary,
                  "mt-8 w-full"
                )}
              >
                Talk to sales
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
