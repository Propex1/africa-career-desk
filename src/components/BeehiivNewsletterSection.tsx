"use client";

import { useEffect, useId, useRef } from "react";
import { trackNewsletterCtaClicked } from "@/lib/analytics";
import { NEWSLETTER_ENABLED } from "@/lib/features";
import {
  NEWSLETTER_PROMPT_OPEN_EVENT,
  NEWSLETTER_PROMPT_PREPARE_EVENT,
  type NewsletterPromptContext,
} from "@/lib/newsletter-prompt";

type BeehiivNewsletterSectionProps = {
  variant?: "banner" | "trigger";
};

export default function BeehiivNewsletterSection({
  variant = "banner",
}: BeehiivNewsletterSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const placement = variant === "banner" ? "banner" : "about_trigger";

  const prepareNewsletter = () => {
    window.dispatchEvent(new Event(NEWSLETTER_PROMPT_PREPARE_EVENT));
  };

  const openNewsletter = () => {
    const context: NewsletterPromptContext = {
      placement,
      trigger: "manual",
    };

    trackNewsletterCtaClicked(context);
    window.dispatchEvent(
      new CustomEvent<NewsletterPromptContext>(NEWSLETTER_PROMPT_OPEN_EVENT, {
        detail: context,
      })
    );
  };

  useEffect(() => {
    if (variant !== "banner") return;

    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        prepareNewsletter();
        observer.disconnect();
      },
      { rootMargin: "0px 0px 160px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [variant]);

  if (!NEWSLETTER_ENABLED) return null;

  return (
    <section
      ref={sectionRef}
      id={variant === "banner" ? "newsletter" : undefined}
      className={variant === "banner" ? "my-1 md:my-2" : "contents"}
      aria-labelledby={variant === "banner" ? titleId : undefined}
    >
      {variant === "banner" ? (
        <div className="relative overflow-hidden rounded-[18px] md:rounded-[20px] border border-acd-green bg-acd-green px-4 py-4 shadow-[0_18px_42px_-28px_rgba(20,43,63,0.6)] md:min-h-[136px] md:px-7 md:py-4">
          <div className="absolute -right-12 -top-12 h-[150px] w-[150px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
          <div className="relative flex flex-col gap-3 md:min-h-[104px] md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="max-w-[700px]">
              <p className="m-0 text-[11px] md:text-[12px] font-semibold uppercase tracking-[2.1px] md:tracking-[2.3px] text-white/70">
                Free weekly job alerts
              </p>
              <h2
                id={titleId}
                className="m-0 mt-1.5 md:mt-2 font-serif text-[24px] font-medium leading-[1.08] tracking-[-0.35px] text-white md:text-[30px]"
              >
                The best Africa investment jobs — every week
              </h2>
              <p className="m-0 mt-1.5 md:mt-2 max-w-[650px] text-[14px] md:text-[15px] leading-snug text-white/80">
                Curated DFI, private equity, infrastructure, VC and advisory
                opportunities—delivered before applications close.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewsletter}
              onMouseEnter={prepareNewsletter}
              onFocus={prepareNewsletter}
              onPointerDown={prepareNewsletter}
              className="inline-flex min-h-[42px] md:min-h-[46px] shrink-0 items-center justify-center rounded-[10px] md:rounded-[11px] border border-white bg-white px-5 md:px-7 text-[14px] md:text-[15px] font-semibold text-acd-green shadow-[0_8px_22px_-14px_rgba(0,0,0,0.45)] transition-colors hover:bg-acd-green-pale focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-acd-green"
            >
              Get Weekly Job Alerts
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openNewsletter}
          onMouseEnter={prepareNewsletter}
          onFocus={prepareNewsletter}
          onPointerDown={prepareNewsletter}
          className="inline-flex min-h-[46px] items-center justify-center rounded-[11px] border border-acd-border-green bg-white px-6 text-[15px] font-semibold text-acd-green transition-colors hover:border-acd-green focus:outline-none focus:ring-2 focus:ring-acd-green focus:ring-offset-2"
        >
          Get Weekly Job Alerts
        </button>
      )}
    </section>
  );
}
