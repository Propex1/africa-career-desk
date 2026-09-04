"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NEWSLETTER_ENABLED } from "@/lib/features";

const BEEHIIV_FORM_ID = "b98884b7-cae6-4cf4-ba4d-b6ede81fec89";
const BEEHIIV_ORIGIN = "https://subscribe-forms.beehiiv.com";
const BEEHIIV_SCRIPT_SRC = `${BEEHIIV_ORIGIN}/v3/loader.js`;

type EmbedStatus = "loading" | "ready" | "error";

export default function BeehiivNewsletterSection() {
  const hostRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const successHandledRef = useRef(false);
  const descriptionId = useId();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<EmbedStatus>("loading");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (!showSuccessToast) return;

    const timer = window.setTimeout(() => setShowSuccessToast(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showSuccessToast]);

  useEffect(() => {
    if (!isOpen) return;

    const host = hostRef.current;
    const dialog = dialogRef.current;
    const triggerButton = openButtonRef.current;
    if (!host || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    setStatus("loading");

    const prepareIframe = () => {
      const iframe = host.querySelector<HTMLIFrameElement>("iframe");
      if (!iframe) return;

      iframe.title = "Africa Career Desk newsletter signup form";
      iframe.setAttribute(
        "aria-label",
        "Africa Career Desk newsletter signup form with one email field and a Join the Newsletter button."
      );
      iframe.setAttribute("aria-describedby", descriptionId);
      iframe.style.width = "100%";
      iframe.style.maxWidth = "100%";
      iframe.style.border = "0";
      setStatus("ready");
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== BEEHIIV_ORIGIN || !event.data || typeof event.data !== "object") return;
      if (!("type" in event.data)) return;

      if (event.data.type === "beehiiv:child-loaded" || event.data.type === "beehiiv:styles") {
        prepareIframe();
      }

      if (event.data.type === "beehiiv:submitted" || event.data.type === "beehiiv:success-toast") {
        if (successHandledRef.current) return;
        successHandledRef.current = true;
        setIsOpen(false);
        setShowSuccessToast(true);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const observer = new MutationObserver(prepareIframe);
    const script = document.createElement("script");
    const handleScriptError = () => setStatus("error");

    script.async = true;
    script.src = BEEHIIV_SCRIPT_SRC;
    script.dataset.beehiivForm = BEEHIIV_FORM_ID;
    script.addEventListener("error", handleScriptError, { once: true });
    observer.observe(host, { childList: true, subtree: true });
    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleKeyDown);
    host.appendChild(script);

    return () => {
      document.body.style.overflow = previousOverflow;
      observer.disconnect();
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("keydown", handleKeyDown);
      script.removeEventListener("error", handleScriptError);
      host.replaceChildren();
      triggerButton?.focus();
    };
  }, [descriptionId, isOpen]);

  if (!NEWSLETTER_ENABLED) return null;

  return (
    <section id="newsletter" className="mb-[-16px] mt-5 md:mt-6" aria-labelledby={titleId}>
      <div className="relative overflow-hidden rounded-[20px] border border-acd-green-pale-border bg-acd-green-pale px-5 py-4 shadow-[0_10px_30px_-24px_rgba(20,43,63,0.22)] md:h-[160px] md:px-7 md:py-5">
        <div className="absolute -right-10 -top-10 h-[100px] w-[100px] rounded-full bg-[radial-gradient(circle_at_center,rgba(22,82,42,0.14),rgba(22,82,42,0))]" />
        <div className="relative flex flex-col gap-4 md:h-full md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="max-w-[680px]">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[2.3px] text-acd-green">
              Newsletter
            </p>
            <h2
              id={titleId}
              className="m-0 mt-2 font-serif text-[25px] font-medium leading-[1.08] tracking-[-0.35px] text-acd-navy md:text-[28px]"
            >
              Africa-focused opportunities, straight to your inbox
            </h2>
            <p className="m-0 mt-2 text-[15px] leading-snug text-acd-muted">
              Get curated roles, deadline alerts and practical career intelligence.
            </p>
          </div>

          <button
            ref={openButtonRef}
            type="button"
            onClick={() => {
              successHandledRef.current = false;
              setIsOpen(true);
            }}
            className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-[11px] bg-acd-green px-6 text-[15px] font-semibold text-white transition-colors hover:bg-acd-green-mid focus:outline-none focus:ring-2 focus:ring-acd-green focus:ring-offset-2 md:px-7"
          >
            Join the Newsletter
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-acd-navy/45 p-4 md:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-dialog`}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-[660px] overflow-y-auto rounded-[20px] border border-acd-border-light bg-white p-4 shadow-[0_24px_70px_rgba(20,43,63,0.28)] md:max-h-[calc(100vh-4rem)] md:p-5"
          >
            <h2 id={`${titleId}-dialog`} className="sr-only">
              Join the Africa Career Desk newsletter
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-acd-border-light bg-white text-[24px] leading-none text-acd-navy shadow-[0_2px_8px_rgba(20,43,63,0.1)] transition-colors hover:border-acd-green hover:text-acd-green focus:outline-none focus:ring-2 focus:ring-acd-green md:right-4 md:top-4"
              aria-label="Close newsletter signup"
            >
              <span aria-hidden="true">&times;</span>
            </button>

            <p id={descriptionId} className="sr-only">
              The official Beehiiv signup form contains one email field and a Join the Newsletter button.
            </p>

            {status === "loading" && (
              <p role="status" aria-live="polite" className="m-0 text-[14px] text-acd-muted">
                Loading newsletter signup...
              </p>
            )}

            {status === "error" && (
              <p role="alert" className="m-0 text-[14px] text-acd-muted">
                The newsletter signup could not load. Close this window and try again.
              </p>
            )}

            <div ref={hostRef} aria-busy={status === "loading"} className="min-h-0" />
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-5 right-5 z-[60] max-w-[calc(100vw-2.5rem)] rounded-[14px] border border-acd-border-green bg-white px-5 py-4 text-[15px] font-medium text-acd-green-body shadow-[0_18px_40px_rgba(20,43,63,0.18)]"
        >
          Check your inbox to confirm your subscription.
        </div>
      )}
    </section>
  );
}
