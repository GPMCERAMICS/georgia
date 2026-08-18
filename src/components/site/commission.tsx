import { site } from "@/lib/site";
import { CommissionForm } from "./commission-form";

export function Commission() {
  return (
    <section
      id="commission"
      className="scroll-mt-20 border-t border-border/60 bg-secondary/40"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[0.85fr_1.15fr] md:py-28">
        <div className="md:pt-2">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Commissions
          </p>
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            Let&apos;s make something for you
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Whether it&apos;s a dinner set in your own palette or a one-off piece
            for the garden, tell Georgia what you have in mind. She takes on a
            limited number of commissions at a time.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Prefer email?{" "}
            <a
              href={`mailto:${site.email}`}
              className="text-primary underline underline-offset-4"
            >
              {site.email}
            </a>
          </p>
        </div>

        <CommissionForm />
      </div>
    </section>
  );
}
