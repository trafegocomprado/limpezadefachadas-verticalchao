import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const sourcePath = fileURLToPath(new URL(existsSync(new URL('../src/contact-form.js', import.meta.url)) ? '../src/contact-form.js' : '../contact-form.js', import.meta.url));
const script = existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';

function element(value = '') {
  const attributes = new Map();
  return {
    value, textContent: '', dataset: {}, disabled: true, hidden: false,
    setAttribute: (key, next) => attributes.set(key, String(next)),
    getAttribute: (key) => attributes.get(key) ?? null,
    removeAttribute: (key) => attributes.delete(key),
    addEventListener() {},
    focus() { this.focused = true; },
  };
}

async function harness({ config = { endpoint: 'https://contact.example.test/contact', turnstileSiteKey: 'real-site-key-placeholder' }, fetchResponse, turnstilePresent = true, trackingThrows = false } = {}) {
  const fields = Object.fromEntries(Object.entries({ nome: 'Teste de formulário', email: 'teste@example.test', telefone: '', servico: 'Vistoria', mensagem: 'Mensagem de teste controlado.', website: '' }).map(([name, value]) => [name, Object.assign(element(value), { name })]));
  const initialValues = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value]));
  const status = element();
  const button = element();
  button.textContent = 'Enviar mensagem';
  const widget = element();
  const errors = Object.fromEntries(Object.keys(fields).map((name) => [name, element()]));
  const handlers = new Map();
  const form = {
    dataset: { formName: 'contact_test' },
    elements: { namedItem: (name) => fields[name] },
    querySelector(selector) {
      if (selector === '[data-form-status]') return status;
      if (selector === '[data-turnstile]') return widget;
      if (selector === 'button[type="submit"]') return button;
      const name = selector.match(/data-error-for="([^"]+)"/)?.[1];
      return errors[name] ?? null;
    },
    addEventListener: (name, callback) => handlers.set(name, callback),
    setAttribute() {}, removeAttribute() {},
    reset() { for (const field of Object.values(fields)) field.value = ''; },
  };
  const calls = [];
  const timers = new Map();
  let timerId = 0;
  let callbacks;
  let resets = 0;
  let loadedScript;
  const layer = trackingThrows ? { push() { throw new Error('analytics unavailable'); } } : [];
  const turnstile = {
    render(target, options) { assert.equal(target, widget); callbacks = options; return 'widget-1'; },
    reset(id) { assert.equal(id, 'widget-1'); resets++; },
  };
  const window = {
    VERTICALCHAO_CONTACT: config,
    location: { href: 'https://www.example.test/orcamento?email=secret@example.test#nome' },
    dataLayer: layer,
    ...(turnstilePresent ? { turnstile } : {}),
  };
  const document = {
    querySelectorAll: (selector) => selector === '[data-contact-form]' ? [form] : [],
    createElement: () => (loadedScript = {}),
    head: { appendChild() {} },
  };
  const context = vm.createContext({ window, document, URL, AbortController,
    setTimeout: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return fetchResponse ? fetchResponse(url, options) : { ok: true, status: 200, json: async () => ({ ok: true, requestId: 'request-123' }) };
    },
  });
  vm.runInContext(script, context);
  await Promise.resolve();
  await Promise.resolve();
  return {
    fields, initialValues, status, button, errors, calls, layer, timers,
    callbacks: () => callbacks, resets: () => resets, loadedScript: () => loadedScript,
    completeToken() { assert.ok(callbacks, 'Turnstile must be rendered'); callbacks.callback('verified-token'); },
    submit() {
      assert.ok(handlers.has('submit'), 'Contact submit handler must be registered');
      return handlers.get('submit')({ preventDefault() {} });
    },
  };
}

test('contact client exists', () => assert.ok(existsSync(sourcePath), 'Missing email contact client'));

test('missing configuration keeps submit disabled with a clear email fallback and no request', async () => {
  const h = await harness({ config: { endpoint: '', turnstileSiteKey: '' } });
  await h.submit();
  assert.equal(h.button.disabled, true);
  assert.match(h.status.textContent, /indisponível/);
  assert.match(h.status.textContent, /verticalchao@gmail\.com/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.loadedScript(), undefined);
});

test('no request can be made without a Turnstile token', async () => {
  const h = await harness();
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.equal(h.button.disabled, true);
});

test('email is required and errors preserve the typed values', async () => {
  const h = await harness();
  h.completeToken();
  h.fields.email.value = '';
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.match(h.errors.email.textContent, /e-mail/);
  assert.equal(h.fields.email.focused, true);
  assert.equal(h.fields.nome.value, h.initialValues.nome);
});

test('provided phone must have a DDD and at most 15 digits', async () => {
  for (const telefone of ['123', '1234567890123456']) {
    const h = await harness();
    h.completeToken();
    h.fields.telefone.value = telefone;
    await h.submit();
    assert.equal(h.calls.length, 0);
    assert.match(h.errors.telefone.textContent, /telefone/);
  }
});

test('name needs at least two characters to match the Worker validation', async () => {
  const h = await harness();
  h.completeToken();
  h.fields.nome.value = 'A';
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.match(h.errors.nome.textContent, /nome/);
});

test('valid form posts JSON with an optional phone and a page URL without query or fragment', async () => {
  const h = await harness();
  h.completeToken();
  await h.submit();
  assert.equal(h.calls.length, 1);
  const { url, options } = h.calls[0];
  assert.equal(url, 'https://contact.example.test/contact');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.deepEqual(JSON.parse(options.body), { ...h.initialValues, turnstileToken: 'verified-token', pageUrl: 'https://www.example.test/orcamento' });
  assert.equal(h.status.dataset.state, 'success');
  assert.equal(h.resets(), 1);
  assert.equal(h.button.disabled, true);
  assert.equal(h.fields.email.value, '');
  assert.deepEqual(JSON.parse(JSON.stringify(h.layer)), [{ event: 'form_submitted', form_name: 'contact_test', contact_method: 'email' }]);
});

test('HTTP failures preserve fields and never track success', async () => {
  for (const status of [400, 403, 429, 502, 503]) {
    const h = await harness({ fetchResponse: async () => ({ ok: false, status, json: async () => ({ ok: false, error: 'SERVER_DETAIL_NOT_FOR_UI' }) }) });
    h.completeToken();
    await h.submit();
    assert.equal(h.status.dataset.state, 'error');
    assert.doesNotMatch(h.status.textContent, /SERVER_DETAIL_NOT_FOR_UI/);
    assert.equal(h.fields.email.value, h.initialValues.email);
    assert.equal(h.layer.length, 0);
    assert.equal(h.resets(), 1);
  }
});

test('a renewed Turnstile token preserves the last sending error until the next attempt', async () => {
  for (const status of [429, 502, 503]) {
    let attempts = 0;
    const h = await harness({ fetchResponse: async () => ++attempts === 1
      ? { ok: false, status, json: async () => ({ ok: false, error: 'delivery_unavailable' }) }
      : { ok: true, status: 200, json: async () => ({ ok: true, requestId: 'retry-accepted' }) }
    });
    h.completeToken();
    await h.submit();
    const sendingError = h.status.textContent;
    h.completeToken();
    assert.equal(h.status.textContent, sendingError, 'An automatic token renewal must not hide the failed send');
    assert.equal(h.status.dataset.state, 'error');
    assert.equal(h.button.disabled, false, 'The renewed token must still allow an explicit retry');
    assert.equal(h.layer.length, 0);

    const retry = h.submit();
    assert.equal(h.status.dataset.state, 'pending');
    await retry;
    assert.equal(h.status.dataset.state, 'success');
    assert.equal(h.calls.length, 2);
    assert.equal(h.layer.length, 1);
    const success = h.status.textContent;
    h.completeToken();
    assert.equal(h.status.textContent, success, 'Token renewal must also preserve confirmed success');
  }
});

test('a response without a confirmed request ID is not reported as success', async () => {
  const h = await harness({ fetchResponse: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }) });
  h.completeToken();
  await h.submit();
  assert.equal(h.status.dataset.state, 'error');
  assert.equal(h.fields.email.value, h.initialValues.email);
  assert.equal(h.layer.length, 0);
});

test('a second submit is ignored while the request is pending', async () => {
  let finish;
  const h = await harness({ fetchResponse: () => new Promise((resolve) => { finish = resolve; }) });
  h.completeToken();
  const first = h.submit();
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.equal(h.button.disabled, true);
  finish({ ok: true, status: 200, json: async () => ({ ok: true, requestId: 'request-1' }) });
  await first;
});

test('timeout aborts the request and leaves the message available to retry', async () => {
  const h = await harness({ fetchResponse: (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }) });
  h.completeToken();
  const request = h.submit();
  const timeout = [...h.timers.values()].find(({ ms }) => ms === 15000);
  assert.ok(timeout, 'Requests need a bounded timeout');
  timeout.callback();
  await request;
  assert.equal(h.calls[0].options.signal.aborted, true);
  assert.equal(h.status.dataset.state, 'error');
  assert.match(h.status.textContent, /confirmar/);
  assert.equal(h.fields.mensagem.value, h.initialValues.mensagem);
  assert.equal(h.resets(), 1);
});

test('Turnstile error and expiry invalidate the token and prevent requests', async () => {
  for (const callback of ['error-callback', 'expired-callback', 'timeout-callback']) {
    const h = await harness();
    h.completeToken();
    h.callbacks()[callback]();
    assert.equal(h.button.disabled, true);
    await h.submit();
    assert.equal(h.calls.length, 0);
  }
});

test('a blocked Turnstile script gives an explicit error and never enables sending', async () => {
  const h = await harness({ turnstilePresent: false });
  assert.match(h.loadedScript().src, /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?/);
  h.loadedScript().onerror();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.button.disabled, true);
  assert.match(h.status.textContent, /verificação/);
  assert.equal(h.calls.length, 0);
});

test('analytics failure cannot turn a delivered message into an apparent sending failure', async () => {
  const h = await harness({ trackingThrows: true });
  h.completeToken();
  await h.submit();
  assert.equal(h.status.dataset.state, 'success');
  assert.equal(h.fields.mensagem.value, '');
});
