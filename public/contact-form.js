(() => {
  'use strict';

  const fallbackEmail = 'verticalchao@gmail.com';
  const config = window.VERTICALCHAO_CONTACT || {};
  let endpoint = '';
  try {
    const url = new URL(config.endpoint);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash) endpoint = url.href;
  } catch (_) {}
  const sitekey = typeof config.turnstileSiteKey === 'string' ? config.turnstileSiteKey.trim() : '';
  const configured = Boolean(endpoint && sitekey && !/^[123]x0{10,}/i.test(sitekey));
  let turnstilePromise;

  function loadTurnstile() {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    if (turnstilePromise) return turnstilePromise;
    turnstilePromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error || !window.turnstile?.render) reject(new Error('verification_unavailable'));
        else resolve(window.turnstile);
      };
      const timeout = setTimeout(() => finish(new Error('verification_timeout')), 12000);
      window.verticalchaoTurnstileReady = () => finish();
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=verticalchaoTurnstileReady&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => finish(new Error('verification_script_failed'));
      document.head.appendChild(script);
    });
    return turnstilePromise;
  }

  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    const status = form.querySelector('[data-form-status]');
    const button = form.querySelector('button[type="submit"]');
    const widget = form.querySelector('[data-turnstile]');
    const fields = Object.fromEntries(['nome', 'email', 'telefone', 'servico', 'mensagem', 'website'].map((name) => [name, form.elements.namedItem(name)]));
    const originalButtonText = button?.textContent || 'Enviar mensagem';
    let token = '';
    let pending = false;
    let lastSubmissionFailed = false;
    let widgetId;
    let turnstile;

    function showStatus(message, state = 'error') {
      if (!status) return;
      status.textContent = message;
      status.dataset.state = state;
    }

    function updateButton() {
      if (button) button.disabled = !configured || !token || pending;
    }

    function setError(name, message) {
      fields[name]?.setAttribute('aria-invalid', message ? 'true' : 'false');
      const error = form.querySelector(`[data-error-for="${name}"]`);
      if (error) error.textContent = message;
    }

    function validate() {
      const values = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, typeof field?.value === 'string' ? field.value.trim() : '']));
      const digits = values.telefone.replace(/\D/g, '');
      const errors = {
        nome: values.nome.length < 2 ? 'Informe seu nome com pelo menos 2 caracteres.' : values.nome.length > 120 ? 'Use até 120 caracteres no nome.' : '',
        email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254 ? 'Informe um e-mail válido para receber a resposta.' : '',
        telefone: values.telefone && (!/^[\d\s()+.\-]+$/.test(values.telefone) || digits.length < 10 || digits.length > 15) ? 'Informe um telefone com DDD, de 10 a 15 dígitos, ou deixe em branco.' : '',
        servico: !values.servico ? 'Informe o serviço ou assunto.' : values.servico.length > 120 ? 'Use até 120 caracteres no assunto.' : '',
        mensagem: !values.mensagem ? 'Conte o que você precisa.' : values.mensagem.length > 5000 ? 'Use até 5.000 caracteres na mensagem.' : '',
      };
      Object.entries(errors).forEach(([name, message]) => setError(name, message));
      const firstInvalid = Object.keys(errors).find((name) => errors[name]);
      if (firstInvalid) fields[firstInvalid]?.focus();
      return { values, valid: !firstInvalid };
    }

    function resetVerification() {
      token = '';
      updateButton();
      if (turnstile && widgetId !== undefined) {
        try { turnstile.reset(widgetId); } catch (_) {}
      }
    }

    const errorMessages = {
      400: 'Confira os dados do formulário e tente novamente.',
      403: 'Não foi possível validar a verificação de segurança. Faça uma nova verificação e tente novamente.',
      429: 'Houve muitas tentativas em pouco tempo. Aguarde alguns minutos ou escreva para ' + fallbackEmail + '.',
      502: 'Não foi possível confirmar o envio. Tente novamente ou escreva para ' + fallbackEmail + '.',
      503: 'O envio está temporariamente indisponível. Escreva para ' + fallbackEmail + '.',
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (pending) return;
      if (!configured || !Object.values(fields).every(Boolean) || !button || !widget) {
        showStatus('O formulário está temporariamente indisponível. Escreva para ' + fallbackEmail + '.');
        return;
      }
      const { values, valid } = validate();
      if (!valid) {
        showStatus('Revise os campos indicados antes de enviar.');
        return;
      }
      if (!token) {
        showStatus('Conclua a verificação de segurança antes de enviar.');
        return;
      }

      pending = true;
      lastSubmissionFailed = false;
      updateButton();
      button.textContent = 'Enviando...';
      form.setAttribute('aria-busy', 'true');
      showStatus('Enviando sua mensagem...', 'pending');
      const page = new URL(window.location.href);
      const body = { ...values, turnstileToken: token, pageUrl: page.origin + page.pathname };
      token = '';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(errorMessages[response.status] || errorMessages[502]);
        const result = await response.json();
        if (result?.ok !== true || typeof result.requestId !== 'string' || !result.requestId.trim()) throw new Error(errorMessages[502]);
        showStatus('Solicitação recebida para envio. Nossa equipe responderá por e-mail.', 'success');
        form.reset();
        Object.keys(fields).forEach((name) => setError(name, ''));
        try {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'form_submitted', form_name: form.dataset.formName || 'contato_orcamento', contact_method: 'email' });
        } catch (_) {
          // An analytics failure must not change the confirmed submission result.
        }
      } catch (error) {
        lastSubmissionFailed = true;
        const knownMessage = Object.values(errorMessages).includes(error.message) ? error.message : errorMessages[502];
        showStatus(error.name === 'AbortError' ? 'O tempo de espera terminou e não foi possível confirmar o envio. Seus dados foram mantidos. Tente novamente ou escreva para ' + fallbackEmail + '.' : knownMessage);
      } finally {
        clearTimeout(timeout);
        pending = false;
        button.textContent = originalButtonText;
        form.removeAttribute('aria-busy');
        resetVerification();
      }
    });

    Object.entries(fields).forEach(([name, field]) => {
      field?.addEventListener('input', () => setError(name, ''));
      field?.addEventListener('change', () => setError(name, ''));
    });
    updateButton();
    if (!configured || !Object.values(fields).every(Boolean) || !button || !widget) {
      showStatus('O formulário está temporariamente indisponível. Escreva para ' + fallbackEmail + '.');
      return;
    }
    showStatus('Carregando a verificação de segurança...', 'pending');
    loadTurnstile().then((api) => {
      turnstile = api;
      widgetId = api.render(widget, {
        sitekey,
        action: 'contact',
        size: 'compact',
        language: 'pt-br',
        'response-field': false,
        callback: (value) => {
          token = typeof value === 'string' ? value : '';
          updateButton();
          if (!pending && !lastSubmissionFailed && status?.dataset.state !== 'success') showStatus('Verificação concluída. Você já pode enviar sua mensagem.', 'ready');
        },
        'error-callback': () => {
          token = '';
          updateButton();
          if (!pending) showStatus('Não foi possível carregar a verificação. Recarregue a página ou escreva para ' + fallbackEmail + '.');
        },
        'expired-callback': () => {
          if (!pending) showStatus('A verificação expirou. Conclua a nova verificação para enviar.');
          resetVerification();
        },
        'timeout-callback': () => {
          if (!pending) showStatus('A verificação expirou. Conclua a nova verificação para enviar.');
          resetVerification();
        },
      });
    }).catch(() => {
      token = '';
      updateButton();
      showStatus('Não foi possível carregar a verificação. Recarregue a página ou escreva para ' + fallbackEmail + '.');
    });
  });
})();
