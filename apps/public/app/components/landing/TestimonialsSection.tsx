import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

/*
 * Section: Testimonials.
 * Purpose: Social proof from operators and leadership roles.
 * Edit: testimonials array (quote, name, company).
 * Layout: Uses layout.section, layout.card, layout.bodyMax.
 */
export function TestimonialsSection() {
  // EDIT ME: Update testimonials and roles.
  const testimonials = [
    {
      // Safe to edit: quote, name, company.
      quote:
        "BridgeWorks replaced three spreadsheets and gave our teams a real-time operating rhythm.",
      name: "Operations Director",
      company: "Regional multifamily portfolio",
    },
    {
      // Safe to edit: quote, name, company.
      quote:
        "The automation rules eliminated busywork and helped us close tickets faster than ever.",
      name: "Maintenance Manager",
      company: "Class A communities",
    },
    {
      // Safe to edit: quote, name, company.
      quote:
        "We finally have visibility across properties without chasing updates.",
      name: "Asset Manager",
      company: "Investment group",
    },
  ];

  return (
    <section className={layout.section}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>Testimonials</p>
          <h2 className={cn(layout.h2, "mt-3")}>Operators trust BridgeWorks to run daily ops.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Feedback from design partners and early adopters shapes every release.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.quote} className={layout.card}>
              <p className="text-base text-slate-700 dark:text-slate-200">
                &quot;{testimonial.quote}&quot;
              </p>
              <div className="mt-6 text-sm font-semibold text-slate-900 dark:text-white">
                {testimonial.name}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {testimonial.company}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
