"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  trackNewsletterPromptDismissed,
  trackNewsletterPromptViewed,
  trackNewsletterSignupSubmitted,
  type NewsletterDismissMethod,
} from "@/lib/analytics";
import {
  NEWSLETTER_AUTO_PROMPT_ENABLED,
  NEWSLETTER_ENABLED,
} from "@/lib/features";
import {
  NEWSLETTER_AUTO_PROMPT_DELAY_MS,
  NEWSLETTER_AUTO_PROMPT_MIN_PAGE_AGE_MS,
  NEWSLETTER_PROMPT_DISMISSED_AT_KEY,
  NEWSLETTER_PROMPT_OPEN_EVENT,
  NEWSLETTER_PROMPT_PREPARE_EVENT,
  NEWSLETTER_PROMPT_SHOWN_SESSION_KEY,
  NEWSLETTER_SUBSCRIBED_KEY,
  hasReachedNewsletterScrollThreshold,
  shouldShowAutomaticNewsletterPrompt,
  type NewsletterPromptContext,
  type NewsletterPromptTrigger,
} from "@/lib/newsletter-prompt";

const BEEHIIV_FORM_ID = "b98884b7-cae6-4cf4-ba4d-b6ede81fec89";
const BEEHIIV_ORIGIN = "https://subscribe-forms.beehiiv.com";
const BEEHIIV_FORM_URL = `${BEEHIIV_ORIGIN}/v3/forms/${BEEHIIV_FORM_ID}`;
const EMBED_LOAD_TIMEOUT_MS = 12_000;
const MOBILE_MEDIA_QUERY = "(max-width: 639px)";
const RECENT_INTERACTION_GRACE_MS = 3_500;
const AUTO_PROMPT_RETRY_MS = 4_000;

type EmbedStatus = "loading" | "ready" | "error";

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStorage(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null, key: string, value: string) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Storage may be unavailable in strict privacy modes. The in-memory guard
    // still prevents repetition during the current component lifetime.
  }
}

function removeStorage(storage: Storage | null, key: string) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // See writeStorage.
  }
}

function isTextEntryActive(): boolean {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return false;

  return (
    activeElement.matches("input, textarea, select") ||
    activeElement.isContentEditable
  );
}

function isAnotherInteractiveSurfaceOpen(
  newsletterDialog: HTMLElement | null
): boolean {
  if (document.querySelector('[aria-expanded="true"], [role="listbox"]')) {
    return true;
  }

  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"][aria-modal="true"]'
    )
  ).some(
    (dialog) =>
      dialog !== newsletterDialog &&
      dialog.closest('[aria-hidden="true"]') === null
  );
}

function isNewsletterPromptContext(
  value: unknown
): value is NewsletterPromptContext {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<NewsletterPromptContext>;
  return (
    (candidate.placement === "banner" ||
      candidate.placement === "about_trigger" ||
      candidate.placement === "header") &&
    candidate.trigger === "manual"
  );
}


export default function NewsletterPromptProvider() {
  const hostRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const successHandledRef = useRef(false);
  const autoPromptOpenedRef = useRef(false);
  const openContextRef = useRef<NewsletterPromptContext>({
    placement: "automatic_popup",
    trigger: "timer",
  });
  const descriptionId = useId();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldPrepare, setShouldPrepare] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [status, setStatus] = useState<EmbedStatus>("loading");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const prepareNewsletter = useCallback(() => {
    if (status === "error") setLoadKey((current) => current + 1);
    setShouldPrepare(true);
  }, [status]);

  const openNewsletter = useCallback(
    (
      context: NewsletterPromptContext,
      focusReturnTarget: HTMLElement | null = null
    ) => {
      if (isOpen) return;

      successHandledRef.current = false;
      openContextRef.current = context;
      focusReturnRef.current =
        context.trigger === "manual" ? focusReturnTarget : null;
      prepareNewsletter();
      writeStorage(
        getSessionStorage(),
        NEWSLETTER_PROMPT_SHOWN_SESSION_KEY,
        "true"
      );
      setIsOpen(true);
      trackNewsletterPromptViewed(context);
    },
    [isOpen, prepareNewsletter]
  );

  const closeNewsletter = useCallback(
    (dismissMethod: NewsletterDismissMethod) => {
      if (!isOpen) return;

      writeStorage(
        getLocalStorage(),
        NEWSLETTER_PROMPT_DISMISSED_AT_KEY,
        new Date().toISOString()
      );
      trackNewsletterPromptDismissed(
        openContextRef.current,
        dismissMethod
      );
      setIsOpen(false);
    },
    [isOpen]
  );

  useEffect(() => {
    if (!NEWSLETTER_ENABLED) return;

    const handlePrepare = () => prepareNewsletter();
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isNewsletterPromptContext(detail)) return;

      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      openNewsletter(detail, activeElement);
    };

    window.addEventListener(
      NEWSLETTER_PROMPT_PREPARE_EVENT,
      handlePrepare
    );
    window.addEventListener(NEWSLETTER_PROMPT_OPEN_EVENT, handleOpen);

    return () => {
      window.removeEventListener(
        NEWSLETTER_PROMPT_PREPARE_EVENT,
        handlePrepare
      );
      window.removeEventListener(NEWSLETTER_PROMPT_OPEN_EVENT, handleOpen);
    };
  }, [openNewsletter, prepareNewsletter]);

  useEffect(() => {
    if (!showSuccessToast) return;

    const timer = window.setTimeout(
      () => setShowSuccessToast(false),
      5_000
    );
    return () => window.clearTimeout(timer);
  }, [showSuccessToast]);

  // Wait for meaningful engagement and never interrupt active interaction.
  useEffect(() => {
    if (!NEWSLETTER_AUTO_PROMPT_ENABLED || isOpen) return;

    const localStorage = getLocalStorage();
    const sessionStorage = getSessionStorage();

    const isEligible = () =>
      shouldShowAutomaticNewsletterPrompt({
        dismissedAt: readStorage(
          localStorage,
          NEWSLETTER_PROMPT_DISMISSED_AT_KEY
        ),
        subscribed:
          readStorage(localStorage, NEWSLETTER_SUBSCRIBED_KEY) === "true",
        shownThisSession:
          readStorage(
            sessionStorage,
            NEWSLETTER_PROMPT_SHOWN_SESSION_KEY
          ) === "true",
      });

    if (!isEligible()) return;

    const mountedAt = Date.now();
    let lastInteractionAt = mountedAt;
    let retryTimer: number | undefined;
    let pendingTrigger:
      | Exclude<NewsletterPromptTrigger, "manual">
      | null = null;

    const clearRetry = () => {
      if (retryTimer === undefined) return;
      window.clearTimeout(retryTimer);
      retryTimer = undefined;
    };

    const scheduleRetry = (
      trigger: Exclude<NewsletterPromptTrigger, "manual">,
      delay = AUTO_PROMPT_RETRY_MS
    ) => {
      pendingTrigger = trigger;
      clearRetry();
      retryTimer = window.setTimeout(
        () => attemptOpen(trigger),
        Math.max(delay, 250)
      );
    };

    const attemptOpen = (
      trigger: Exclude<NewsletterPromptTrigger, "manual">
    ) => {
      if (
        autoPromptOpenedRef.current ||
        isOpen ||
        !isEligible()
      ) {
        pendingTrigger = null;
        clearRetry();
        return;
      }

      const now = Date.now();
      const pageAge = now - mountedAt;

      if (pageAge < NEWSLETTER_AUTO_PROMPT_MIN_PAGE_AGE_MS) {
        scheduleRetry(
          trigger,
          NEWSLETTER_AUTO_PROMPT_MIN_PAGE_AGE_MS - pageAge
        );
        return;
      }

      if (
        document.visibilityState !== "visible" ||
        isTextEntryActive() ||
        isAnotherInteractiveSurfaceOpen(dialogRef.current) ||
        now - lastInteractionAt < RECENT_INTERACTION_GRACE_MS
      ) {
        scheduleRetry(trigger);
        return;
      }

      autoPromptOpenedRef.current = true;
      pendingTrigger = null;
      clearRetry();
      openNewsletter({
        placement: "automatic_popup",
        trigger,
      });
    };

    const handleScroll = () => {
      lastInteractionAt = Date.now();
      if (
        !hasReachedNewsletterScrollThreshold({
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight,
        })
      ) {
        return;
      }

      // Debounce until the visitor has stopped actively scrolling.
      scheduleRetry("scroll");
    };

    const markInteraction = () => {
      lastInteractionAt = Date.now();
    };

    const retryAfterInteraction = () => {
      if (!pendingTrigger) return;
      scheduleRetry(pendingTrigger, 1_000);
    };

    const retryWhenVisible = () => {
      if (
        document.visibilityState === "visible" &&
        pendingTrigger
      ) {
        scheduleRetry(pendingTrigger, 1_000);
      }
    };

    const timer = window.setTimeout(
      () => attemptOpen("timer"),
      NEWSLETTER_AUTO_PROMPT_DELAY_MS
    );

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerdown", markInteraction, true);
    window.addEventListener("keydown", markInteraction, true);
    document.addEventListener("focusout", retryAfterInteraction);
    document.addEventListener("visibilitychange", retryWhenVisible);

    return () => {
      window.clearTimeout(timer);
      clearRetry();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerdown", markInteraction, true);
      window.removeEventListener("keydown", markInteraction, true);
      document.removeEventListener("focusout", retryAfterInteraction);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [isOpen, openNewsletter]);

  // ACD owns popup timing. Load the real form directly so the separate Beehiiv
  // loader cannot suppress it based on its own subscriber cookies or triggers.
  useEffect(() => {
    if (!shouldPrepare || !hostRef.current) return;
    const host = hostRef.current;
    setStatus("loading");
    const iframe = document.createElement("iframe");
    iframe.title = "Africa Career Desk newsletter signup form";
    iframe.style.cssText = "display:block;width:100%;height:200px;border:0;";
    // Keep the frame visible, including slow loads and HUMAN verification pages.
    const timeout = window.setTimeout(() => setStatus("error"), EMBED_LOAD_TIMEOUT_MS);
    const ready = () => { window.clearTimeout(timeout); setStatus("ready"); };
    const send = (type: string) => iframe.contentWindow?.postMessage({ type, payload: { handlesRedirect: false } }, BEEHIIV_ORIGIN);
    const onLoad = () => { ready(); send("beehiiv:parent-loaded"); };
    const onError = () => { window.clearTimeout(timeout); setStatus("error"); };
    const resize = () => send("beehiiv:resize");
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== BEEHIIV_ORIGIN || event.source !== iframe.contentWindow || !event.data || typeof event.data !== "object") return;
      const { type, payload } = event.data;
      if (type === "beehiiv:child-loaded") { ready(); send("beehiiv:parent-loaded"); }
      if (type === "beehiiv:styles" || type === "beehiiv:challenge") {
        ready();
        const height = Number.parseFloat(String(payload?.height ?? ""));
        if (Number.isFinite(height) && height > 0) iframe.style.height = Math.min(2000, Math.max(type === "beehiiv:challenge" ? 400 : 120, height)) + "px";
      }
      if (type === "beehiiv:challenge-resolved") resize();
      if (type === "beehiiv:submitted" || type === "beehiiv:success-toast") {
        if (successHandledRef.current) return;
        successHandledRef.current = true;
        writeStorage(getLocalStorage(), NEWSLETTER_SUBSCRIBED_KEY, "true");
        removeStorage(getLocalStorage(), NEWSLETTER_PROMPT_DISMISSED_AT_KEY);
        trackNewsletterSignupSubmitted(openContextRef.current);
        focusReturnRef.current = null;
        setIsOpen(false);
        setShouldPrepare(false);
        setShowSuccessToast(true);
      }
    };
    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("error", onError);
    window.addEventListener("message", handleMessage);
    window.addEventListener("resize", resize);
    iframe.src = `${BEEHIIV_FORM_URL}?layout=slim`;
    host.appendChild(iframe);
    return () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener("load", onLoad);
      iframe.removeEventListener("error", onError);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", resize);
      iframe.remove();
    };
  }, [loadKey, shouldPrepare]);

  // Accessible modal behavior: scroll lock, Escape, focus trap, and focus
  // restoration for manually opened dialogs.
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const focusReturnTarget = focusReturnRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNewsletter("escape");
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
      focusReturnTarget?.focus();
      focusReturnRef.current = null;
    };
  }, [closeNewsletter, isOpen]);

  if (!NEWSLETTER_ENABLED) return null;

  return (
    <>
      {shouldPrepare && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-8 ${
            isOpen
              ? "bg-acd-navy/45"
              : "invisible pointer-events-none"
          }`}
          aria-hidden={!isOpen}
          onMouseDown={(event) => {
            if (isOpen && event.target === event.currentTarget) {
              closeNewsletter("backdrop");
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative max-h-[78dvh] w-full max-w-[660px] overflow-y-auto rounded-t-[24px] border border-acd-border-light bg-white p-3 pb-4 shadow-[0_24px_70px_rgba(20,43,63,0.28)] sm:max-h-[calc(100vh-2rem)] sm:rounded-[20px] sm:p-5 md:max-h-[calc(100vh-4rem)]"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-acd-border sm:hidden"
            />
            <h2 id={titleId} className="mx-auto mb-3 mt-8 max-w-[520px] px-3 text-center font-serif text-[26px] leading-tight text-acd-navy sm:text-[30px]">
              Africa-focused career opportunities, straight to your inbox
            </h2>


            <p id={descriptionId} className="mx-auto mb-5 max-w-[480px] px-3 text-center text-[15px] text-acd-muted">
              Get curated roles, deadline alerts and practical career intelligence.
            </p>

            {status === "loading" && <p role="status" className="m-0 py-2 text-center text-[13px] text-acd-muted">Loading secure signup…</p>}
            {status === "error" && (
              <div role="status" className="mb-3 rounded-lg bg-acd-green-pale p-4 text-center text-[14px] text-acd-muted">
                <p className="m-0">Having trouble loading the form? Open the secure signup page or retry here.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-4">
                  <a className="font-semibold underline" href={BEEHIIV_FORM_URL} target="_blank" rel="noopener noreferrer">Open signup form directly</a>
                  <button type="button" className="underline" onClick={() => { setStatus("loading"); setLoadKey(current => current + 1); }}>Retry signup</button>
                </div>
              </div>
            )}
            <div ref={hostRef} className="w-full" />

            <div className="mt-0.5 flex justify-center sm:mt-1">
              <button
                type="button"
                ref={closeButtonRef}
                onClick={() => closeNewsletter("not_now")}
                className="min-h-10 rounded-[10px] px-5 text-[14px] font-medium text-acd-muted transition-colors hover:bg-acd-green-pale hover:text-acd-green focus:outline-none focus:ring-2 focus:ring-acd-green sm:min-h-11"
              >
                Not now
              </button>
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
    </>
  );
}
