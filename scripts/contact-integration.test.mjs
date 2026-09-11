import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (name) => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('contact form sends email with required reply address and never defaults to GET', async () => {
  const html = await read('index.html');
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/i)?.[0] || '';
  const opening = form.match(/^<form[^>]*>/)?.[0] || '';
  assert.match(opening, /data-contact-form/, 'email form must replace WhatsApp submission');
  assert.match(opening, /method="post"/i, 'no-JS submission must never leak PII through GET');
  assert.match(opening, /data-form-name="[^"]+"/);
  assert.match(form.match(/<input\b[^>]*name="email"[^>]*>/)?.[0] || '', /\brequired\b/);
  assert.doesNotMatch(form.match(/<input\b[^>]*name="telefone"[^>]*>/)?.[0] || '', /\brequired\b/);
  for (const name of ['nome', 'email', 'telefone', 'servico', 'mensagem', 'website']) {
    assert.match(form, new RegExp('name="' + name + '"'), 'missing field ' + name);
  }
  assert.match(form, /data-turnstile/);
  assert.match(form, /data-form-status[^>]*role="status"/);
  assert.match(form, /<button\b[^>]*type="submit"[^>]*\bdisabled\b/);
  assert.match(form, /<noscript>[\s\S]*mailto:verticalchao@gmail\.com/);
  assert.match(form, /data-contact-fallback/);
  assert.doesNotMatch(form, /data-whatsapp-form|Enviar[^<]*WhatsApp|data-track-cta/);
  assert.match(html, /https:\/\/api\.whatsapp\.com\/send\?phone=5531996848477/);
});

test('email scripts load once in order and are included in each static build', async () => {
  const html = await read('index.html');
  const build = await read('scripts/build.mjs');
  const tags = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  assert.equal(tags.filter((src) => src === 'contact-config.js').length, 1);
  assert.equal(tags.filter((src) => src === 'contact-form.js').length, 1);
  assert.ok(tags.indexOf('contact-config.js') < tags.indexOf('contact-form.js'));
  for (const script of ['contact-config.js', 'contact-form.js']) assert.ok(build.includes(script), script + ' must be published');
  const siteScript = await read('script.js');
  assert.doesNotMatch(siteScript, /data-whatsapp-form|form_submitted|popup_blocked|window\.open\(/, 'legacy form must not retain a competing handler or conversion event');
});

test('floating WhatsApp follows form visibility without changing independent links', async () => {
  const { default: vm } = await import('node:vm');
  const form = {}, floating = { dataset: {} }, observations = [];
  const storage = { getItem: () => 'denied' };
  const window = { localStorage: storage, dataLayer: [] };
  const document = {
    querySelector: (selector) => selector === '[data-contact-form]' ? form : selector.includes('.floating-whatsapp') ? floating : null,
    querySelectorAll: () => [],
  };
  function IntersectionObserver(callback) { this.callback = callback; this.observe = target => observations.push({ callback, target }); }
  vm.runInNewContext(await read('script.js'), { window, document, localStorage: storage, IntersectionObserver });
  assert.equal(observations.length, 1);
  assert.equal(observations[0].target, form);
  observations[0].callback([{ isIntersecting: true }]);
  assert.equal(floating.dataset.contactVisible, 'true');
  observations[0].callback([{ isIntersecting: false }]);
  assert.equal(floating.dataset.contactVisible, 'false');
});
