(() => {
  "use strict";

  const CONSENT_STORAGE_KEY = "verticalchao_consent";
  const TRACKING_METADATA_KEYS = new Set([
    "consent_choice",
    "contact_method",
    "cta_location",
    "cta_text",
  ]);

  function trackEvent(eventName, metadata = {}) {
    const safeMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (TRACKING_METADATA_KEYS.has(key)) safeMetadata[key] = value;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...safeMetadata });
  }

  function getGrantedConsent() {
    return {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    };
  }

  function getDeniedConsent() {
    return {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    };
  }

  function readStoredConsent() {
    try {
      const storedChoice = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      return storedChoice === "granted" || storedChoice === "denied" ? storedChoice : null;
    } catch (error) {
      return null;
    }
  }

  function storeConsent(choice) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch (error) {
      // The choice still applies to this page view when storage is unavailable.
    }
  }

  function updateGoogleConsent(choice) {
    const consentSignals = choice === "granted" ? getGrantedConsent() : getDeniedConsent();
    if (typeof gtag === "function") {
      gtag("consent", "update", consentSignals);
    }
  }

  const consentBanner = document.querySelector("[data-consent-banner]");
  const consentAccept = document.querySelector("[data-consent-accept]");
  const consentDeny = document.querySelector("[data-consent-deny]");
  const consentManage = document.querySelector("[data-consent-manage]");
  let consentReturnFocus = null;

  function showConsentBanner(shouldFocus = false) {
    if (!consentBanner) return;
    consentBanner.hidden = false;
    if (shouldFocus) consentAccept?.focus();
  }

  function chooseConsent(choice) {
    storeConsent(choice);
    updateGoogleConsent(choice);
    if (consentBanner) consentBanner.hidden = true;
    trackEvent("consent_updated", { consent_choice: choice });
    if (consentReturnFocus) {
      consentReturnFocus.focus();
      consentReturnFocus = null;
    }
  }

  consentAccept?.addEventListener("click", () => chooseConsent("granted"));
  consentDeny?.addEventListener("click", () => chooseConsent("denied"));
  consentManage?.addEventListener("click", () => {
    consentReturnFocus = consentManage;
    showConsentBanner(true);
  });

  const storedConsent = readStoredConsent();
  if (storedConsent) {
    updateGoogleConsent(storedConsent);
  } else {
    showConsentBanner(false);
  }

  document.querySelectorAll("[data-track-cta]").forEach((cta) => {
    cta.addEventListener("click", () => {
      trackEvent("cta_clicked", {
        contact_method: cta.dataset.contactMethod || "unknown",
        cta_location: cta.dataset.ctaLocation || "unknown",
        cta_text: cta.textContent.trim(),
      });
    });
  });

  const siteHeader = document.querySelector("[data-site-header]");
  const hero = document.querySelector("#inicio");
  if (siteHeader && hero && typeof IntersectionObserver === "function") {
    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        siteHeader.classList.toggle("is-scrolled", !entry.isIntersecting);
      },
      { rootMargin: "-1px 0px 0px", threshold: 0 },
    );
    headerObserver.observe(hero);
  }

  // Keep the floating contact control clear of the mobile email form.
  const contactForm = document.querySelector('[data-contact-form]');
  const floatingWhatsApp = document.querySelector('[data-whatsapp-widget], .floating-whatsapp, .whatsapp-float');
  if (contactForm && floatingWhatsApp && typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([entry]) => {
      floatingWhatsApp.dataset.contactVisible = entry.isIntersecting ? 'true' : 'false';
    }).observe(contactForm);
  }
})();
