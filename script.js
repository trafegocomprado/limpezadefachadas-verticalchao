(() => {
  "use strict";

  const WHATSAPP_NUMBER = "5531996848477";
  const CONSENT_STORAGE_KEY = "verticalchao_consent";
  const TRACKING_METADATA_KEYS = new Set([
    "block_reason",
    "consent_choice",
    "contact_method",
    "cta_location",
    "cta_text",
    "form_name",
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

  const whatsappForm = document.querySelector("[data-whatsapp-form]");
  const formStatus = document.querySelector("[data-form-status]");
  const formErrors = new Map(
    [...document.querySelectorAll("[data-error-for]")].map((error) => [error.dataset.errorFor, error]),
  );
  const fieldNames = ["nome", "telefone", "email", "assunto", "mensagem"];

  function getFormField(name) {
    return whatsappForm?.querySelector(`[name="${name}"]`) ?? null;
  }

  function clearFieldError(field) {
    field.removeAttribute("aria-invalid");
    const error = formErrors.get(field.name);
    if (error) error.textContent = "";
  }

  function setFieldError(field, message) {
    field.setAttribute("aria-invalid", "true");
    const error = formErrors.get(field.name);
    if (error) error.textContent = message;
  }

  function validateForm() {
    const invalid = [];
    const messages = {
      nome: "Informe seu nome.",
      assunto: "Informe o assunto.",
      mensagem: "Escreva uma mensagem.",
    };

    for (const name of fieldNames) {
      const field = getFormField(name);
      if (!field) continue;
      clearFieldError(field);
      const value = field.value.trim();
      let message = "";

      if (field.required && !value) {
        message = messages[name] || "Preencha este campo.";
      } else if (name === "telefone" && value.replace(/\D/g, "").length < 10) {
        message = "Informe um telefone com pelo menos 10 dígitos.";
      } else if (name === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        message = "Informe um e-mail válido ou deixe o campo vazio.";
      }

      if (message) {
        setFieldError(field, message);
        invalid.push(field);
      }
    }

    return invalid;
  }

  function buildWhatsAppUrl() {
    const message = [
      "Olá, preciso de um atendimento!",
      "",
      `Nome: ${getFormField("nome").value.trim()}`,
      `Telefone: ${getFormField("telefone").value.trim()}`,
      `E-mail: ${getFormField("email").value.trim() || "Não informado"}`,
      `Assunto: ${getFormField("assunto").value.trim()}`,
      `Mensagem: ${getFormField("mensagem").value.trim()}`,
    ].join("\n");
    return `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
  }

  function showBlockedPopupRecovery(url) {
    if (!formStatus) return;
    formStatus.replaceChildren();
    formStatus.textContent = "O WhatsApp não abriu porque a nova janela foi bloqueada. ";
    const recoveryLink = document.createElement("a");
    recoveryLink.href = url;
    recoveryLink.setAttribute("data-form-recovery", "");
    recoveryLink.textContent = "Abrir o WhatsApp";
    formStatus.append(recoveryLink);
  }

  whatsappForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (formStatus) {
      formStatus.replaceChildren();
      formStatus.textContent = "";
    }

    const invalid = validateForm();
    if (invalid.length) {
      if (formStatus) formStatus.textContent = "Revise os campos indicados.";
      invalid[0].focus();
      return;
    }

    const url = buildWhatsAppUrl();
    const popup = window.open("", "_blank");
    trackEvent("form_submitted", {
      contact_method: "whatsapp",
      form_name: "limpeza_orcamento",
    });

    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      showBlockedPopupRecovery(url);
      trackEvent("popup_blocked", {
        block_reason: "browser",
        contact_method: "whatsapp",
        form_name: "limpeza_orcamento",
      });
    }
  });
})();
