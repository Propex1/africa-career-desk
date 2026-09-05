"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NEWSLETTER_ENABLED } from "@/lib/features";

const BEEHIIV_FORM_ID = "b98884b7-cae6-4cf4-ba4d-b6ede81fec89";
const BEEHIIV_ORIGIN = "https://subscribe-forms.beehiiv.com";
const BEEHIIV_SCRIPT_SRC = `${BEEHIIV_ORIGIN}/v3/loader.js`;

type EmbedStatus = "loading" | "ready" | "error";

export default function BeehiivNewsletterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const successHandledRef = useRef(false);
  const descriptionId = useId();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldPrepare, setShouldPrepare] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [status, setStatus] = useState<EmbedStatus>("loading");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const prepareNewsletter = () => {
    if (status === "error") setLoadKey((current) => current + 1);
    setShouldPrepare(true);
  };

  useEffect(() => {
    if (!showSuccessToast) return;

    const timer = window.setTimeout(() => setShowSuccessToast(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showSuccessToast]);

  useEffect(() => {
    if (shouldPrepare) return;

    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldPrepare(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px 160px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldPrepare]);

  useEffect(() => {
    if (!shouldPrepare) return;

    const host = hostRef.current;
    if (!host) return;

    setStatus("loading");

    let embeddedIframe: HTMLIFrameElement | null = null;
    const handleIframeLoad = () => setStatus("ready");

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

      if (embeddedIframe === iframe) return;

      embeddedIframe?.removeEventListener("load", handleIframeLoad);
      embeddedIframe = iframe;
      iframe.addEventListener("load", handleIframeLoad, { once: true });
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== BEEHIIV_ORIGIN || !event.data || typeof event.data !== "object") return;
      if (!("type" in event.data)) return;

      if (event.data.type === "beehiiv:child-loaded" || event.data.type === "beehiiv:styles") {
        prepareIframe();
        setStatus("ready");
      }

      if (event.data.type === "beehiiv:submitted" || event.data.type === "beehiiv:success-toast") {
        if (successHandledRef.current) return;
        successHandledRef.current = true;
        setIsOpen(false);
        setShouldPrepare(false);
        setShowSuccessToast(true);
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
    host.appendChild(script);

    return () => {
      observer.disconnect();
      window.removeEventListener("message", handleMessage);
      script.removeEventListener("error", handleScriptError);
      embeddedIframe?.removeEventListener("load", handleIframeLoad);
      host.replaceChildren();
    };
  }, [descriptionId, loadKey, shouldPrepare]);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const triggerButton = openButtonRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerButton?.focus();
    };
  }, [isOpen]);

  if (!NEWSLETTER_ENABLED) return null;

  return (
    <section ref={sectionRef} id="newsletter" className="mb-[-16px] mt-5 md:mt-6" aria-labelledby={titleId}>
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
              prepareNewsletter();
              setIsOpen(true);
            }}
            onMouseEnter={prepareNewsletter}
            onFocus={prepareNewsletter}
            onPointerDown={prepareNewsletter}
            className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-[11px] bg-acd-green px-6 text-[15px] font-semibold text-white transition-colors hover:bg-acd-green-mid focus:outline-none focus:ring-2 focus:ring-acd-green focus:ring-offset-2 md:px-7"
          >
            Join the Newsletter
          </button>
        </div>
      </div>

      {shouldPrepare && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 ${
            isOpen ? "bg-acd-navy/45" : "invisible pointer-events-none"
          }`}
          aria-hidden={!isOpen}
          onMouseDown={(event) => {
            if (isOpen && event.target === event.currentTarget) setIsOpen(false);
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

            <div className="relative min-h-[567px] md:min-h-[375px]">
              {status !== "error" && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center transition-opacity duration-150 ${
                    status === "loading" ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <h3 className="m-0 max-w-[540px] font-serif text-[27px] font-medium leading-[1.15] tracking-[-0.35px] text-acd-navy md:text-[32px]">
                    Africa-focused career opportunities, straight to your inbox
                  </h3>
                  <p className="m-0 mt-4 max-w-[520px] text-[17px] leading-snug text-acd-muted md:text-[18px]">
                    Get curated roles, deadline alerts and practical career intelligence.
                  </p>
                </div>
              )}

              {status === "loading" && <span role="status" className="sr-only">Loading newsletter signup...</span>}

              {status === "error" && (
                <p
                  role="alert"
                  className="absolute inset-0 m-0 flex items-center justify-center px-10 text-center text-[14px] text-acd-muted"
                >
                  The newsletter signup could not load. Close this window and try again.
                </p>
              )}

              <div
                ref={hostRef}
                aria-busy={status === "loading"}
                className={`min-h-[567px] transition-opacity duration-150 md:min-h-[375px] ${
                  status === "ready" ? "delay-150 opacity-100" : "pointer-events-none opacity-0"
                }`}
              />
            </div>
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
