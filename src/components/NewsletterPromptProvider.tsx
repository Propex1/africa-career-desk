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
const BEEHIIV_SCRIPT_SRC = `${BEEHIIV_ORIGIN}/v3/loader.js`;
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

function isMobileViewport(): boolean {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
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

  // Load the official Beehiiv embed only when the form is needed. On phones the
  // iframe stays intact, but its scroll viewport is positioned on the email row
  // so the hosted form remains functional without filling the whole screen.
  useEffect(() => {
    if (!shouldPrepare) return;

    const host = hostRef.current;
    if (!host) return;

    setStatus("loading");

    let embeddedIframe: HTMLIFrameElement | null = null;
    let positionTimer: number | undefined;
    const loadTimer = window.setTimeout(() => setStatus("error"), EMBED_LOAD_TIMEOUT_MS);

    const positionForm = () => {
      if (positionTimer !== undefined) {
        window.clearTimeout(positionTimer);
      }

      positionTimer = window.setTimeout(() => {
        if (!isMobileViewport()) {
          host.scrollTop = 0;
          return;
        }

        host.scrollTop = Math.max(host.scrollHeight - host.clientHeight, 0);
      }, 80);
    };

    const handleIframeLoad = () => {
      window.clearTimeout(loadTimer);
      setStatus("ready");
      positionForm();
    };

    const prepareIframe = () => {
      const iframe = host.querySelector<HTMLIFrameElement>("iframe");
      if (!iframe) return;

      iframe.title = "Africa Career Desk newsletter signup form";
      iframe.setAttribute(
        "aria-label",
        "Africa Career Desk weekly job alerts signup form with one email field and a Get Weekly Job Alerts button."
      );
      iframe.setAttribute("aria-describedby", descriptionId);
      iframe.style.width = "100%";
      iframe.style.maxWidth = "100%";
      iframe.style.border = "0";
      iframe.style.display = "block";

      if (embeddedIframe !== iframe) {
        embeddedIframe?.removeEventListener("load", handleIframeLoad);
        embeddedIframe = iframe;
        iframe.addEventListener("load", handleIframeLoad, { once: true });
      }

      // The loader may finish before our observer attaches the load listener.
      // Its sizing acknowledgement is also evidence that the form is ready.
      if (iframe.dataset.bhvSized === "true") handleIframeLoad();

      positionForm();
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== BEEHIIV_ORIGIN ||
        event.source !== host.querySelector("iframe")?.contentWindow ||
        !event.data ||
        typeof event.data !== "object" ||
        !("type" in event.data)
      ) {
        return;
      }

      if (
        event.data.type === "beehiiv:child-loaded" ||
        event.data.type === "beehiiv:styles"
      ) {
        prepareIframe();
        handleIframeLoad();
      }

      if (
        event.data.type === "beehiiv:submitted" ||
        event.data.type === "beehiiv:success-toast"
      ) {
        if (successHandledRef.current) return;

        successHandledRef.current = true;
        const localStorage = getLocalStorage();
        writeStorage(localStorage, NEWSLETTER_SUBSCRIBED_KEY, "true");
        removeStorage(localStorage, NEWSLETTER_PROMPT_DISMISSED_AT_KEY);
        trackNewsletterSignupSubmitted(openContextRef.current);
        focusReturnRef.current = null;
        setIsOpen(false);
        setShouldPrepare(false);
        setShowSuccessToast(true);
      }
    };

    const observer = new MutationObserver(prepareIframe);
    const script = document.createElement("script");
    const handleScriptError = () => {
      window.clearTimeout(loadTimer);
      setStatus("error");
    };

    script.async = true;
    script.src = BEEHIIV_SCRIPT_SRC;
    script.dataset.beehiivForm = BEEHIIV_FORM_ID;
    script.addEventListener("error", handleScriptError, { once: true });
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-bhv-sized"],
    });
    window.addEventListener("message", handleMessage);
    window.addEventListener("resize", positionForm);
    host.appendChild(script);

    return () => {
      window.clearTimeout(loadTimer);
      if (positionTimer !== undefined) window.clearTimeout(positionTimer);
      observer.disconnect();
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", positionForm);
      script.removeEventListener("error", handleScriptError);
      embeddedIframe?.removeEventListener("load", handleIframeLoad);
      host.replaceChildren();
    };
  }, [descriptionId, loadKey, shouldPrepare]);

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
            <h2 id={titleId} className="sr-only">
              Get weekly Africa investment job alerts
            </h2>


            <p id={descriptionId} className="sr-only">
              Enter your email address to receive one curated Africa investment
              jobs email each week.
            </p>

            <div className="px-7 pb-1 pt-7 text-center sm:hidden" aria-hidden="true">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[2px] text-acd-green">
                Free weekly job alerts
              </p>
              <p className="m-0 mt-2 font-serif text-[24px] font-medium leading-[1.08] tracking-[-0.3px] text-acd-navy">
                Get the best Africa investment jobs every week
              </p>
              <p className="m-0 mt-2 text-[14px] leading-snug text-acd-muted">
                One carefully selected email. No noise.
              </p>
            </div>

            <div className="relative mt-2 h-[170px] sm:mt-0 sm:h-auto sm:min-h-[375px]">
              {status !== "error" && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 z-10 flex items-center justify-center px-4 text-center transition-opacity duration-150 ${
                    status === "loading"
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  <p className="m-0 text-[13px] text-acd-muted sm:hidden">
                    Loading secure signup…
                  </p>
                  <div className="hidden flex-col items-center sm:flex">
                    <p className="m-0 text-[12px] font-semibold uppercase tracking-[2.2px] text-acd-green">
                      Free weekly job alerts
                    </p>
                    <h3 className="m-0 mt-3 max-w-[540px] font-serif text-[27px] font-medium leading-[1.15] tracking-[-0.35px] text-acd-navy md:text-[32px]">
                      Don&apos;t miss the next great Africa investment opportunity
                    </h3>
                    <p className="m-0 mt-4 max-w-[520px] text-[17px] leading-snug text-acd-muted md:text-[18px]">
                      Get carefully selected finance, investment and development
                      roles in one useful weekly email.
                    </p>
                  </div>
                </div>
              )}

              {status === "loading" && (
                <span role="status" className="sr-only">
                  Loading newsletter signup...
                </span>
              )}

              {status === "error" && (
                <div
                  role="alert"
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center text-[14px] text-acd-muted"
                >
                  <p>The signup form is taking longer than expected. Please try again.</p>
                  <button
                    type="button"
                    onClick={() => { setStatus("loading"); setLoadKey((current) => current + 1); }}
                    className="min-h-11 rounded-[10px] bg-acd-green px-5 py-2 font-medium text-white"
                  >
                    Retry signup
                  </button>
                  <a className="underline" href={`${BEEHIIV_ORIGIN}/v3/forms/${BEEHIIV_FORM_ID}`} target="_blank" rel="noopener noreferrer">
                    Open signup form directly
                  </a>
                </div>
              )}

              <div
                ref={hostRef}
                aria-busy={status === "loading"}
                className={`newsletter-mobile-form-viewport h-[170px] overflow-y-auto overscroll-contain transition-opacity duration-150 sm:h-auto sm:min-h-[375px] sm:overflow-visible ${
                  status === "ready"
                    ? "delay-150 opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              />
            </div>

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
