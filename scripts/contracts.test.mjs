import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readRequired(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      assert.fail(`Required site file is missing: ${relativePath}`);
    }
    throw error;
  }
}

function countMatches(source, expression) {
  return source.match(expression)?.length ?? 0;
}

function extractCalls(source, functionName) {
  const calls = [];
  const needle = `${functionName}(`;
  let cursor = 0;

  while ((cursor = source.indexOf(needle, cursor)) !== -1) {
    const before = source[cursor - 1] ?? '';
    if (/[\w$]/.test(before)) {
      cursor += needle.length;
      continue;
    }

    let depth = 1;
    let quote = '';
    let escaped = false;
    let index = cursor + needle.length;

    for (; index < source.length && depth > 0; index += 1) {
      const character = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quote) {
        if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
      }
    }

    calls.push(source.slice(cursor + needle.length, index - 1));
    cursor = index;
  }

  return calls;
}

function extractTagWithAttribute(html, tagName, attributeName, attributeValue) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? [];
  if (attributeValue === null) {
    return tags.filter((tag) => new RegExp(`\\b${attributeName}(?:\\s*=|[\\s>])`, 'i').test(tag));
  }
  return tags.filter((tag) => new RegExp(`\\b${attributeName}=["']${attributeValue}["']`, 'i').test(tag));
}

function extractAttribute(tag, attributeName) {
  return tag.match(new RegExp(`\\b${attributeName}=["']([^"']+)["']`, 'i'))?.[1] ?? '';
}

function assertRemovedPhoneAbsent(source) {
  const candidates = source.match(/(?:\+?\d[\s().-]*){10,}/g) ?? [];
  const normalized = candidates.map((candidate) => candidate.replace(/\D/g, ''));
  for (const removed of ['5531994711393', '31994711393']) {
    assert.ok(
      normalized.every((candidate) => !candidate.includes(removed)),
      `Removed phone detected after normalization: ${removed}`,
    );
  }
}

function extractFunctionBody(source, functionName) {
  const declaration = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*{`, 'g');
  const match = declaration.exec(source);
  if (!match) return '';

  let depth = 1;
  let quote = '';
  let escaped = false;
  let index = declaration.lastIndex;
  for (; index < source.length && depth > 0; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
    } else if (quote) {
      if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
    }
  }
  return source.slice(declaration.lastIndex, index - 1);
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...tokens) {
    for (const token of tokens) this.values.add(token);
  }

  remove(...tokens) {
    for (const token of tokens) this.values.delete(token);
  }

  toggle(token, force) {
    const shouldAdd = force === undefined ? !this.values.has(token) : Boolean(force);
    if (shouldAdd) this.values.add(token);
    else this.values.delete(token);
    return shouldAdd;
  }

  contains(token) {
    return this.values.has(token);
  }
}

class FakeElement {
  constructor(tagName = 'div', ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.children = [];
    this.dataset = {};
    this.hidden = false;
    this.href = '';
    this.name = '';
    this.required = false;
    this.textContent = '';
    this.type = '';
    this.value = '';
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, properties = {}) {
    const event = {
      currentTarget: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      target: this,
      type,
      ...properties,
    };
    for (const listener of this.listeners.get(type) ?? []) listener.call(this, event);
    return event;
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  getAttribute(name) {
    if (name === 'href') return this.href || null;
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    const normalized = String(value);
    this.attributes.set(name, normalized);
    if (name === 'href') this.href = normalized;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
    this.textContent = '';
  }

  querySelector(selector) {
    const name = selector.match(/^\[name=["']([^"']+)["']\]$/)?.[1];
    if (name && this.fields) return this.fields[name] ?? null;
    if (selector === 'a') return this.children.find((child) => child.tagName === 'A') ?? null;
    return null;
  }
}

function makeRuntimeHarness({ storedConsent = null, popupAllowed = true, storageThrows = false } = {}) {
  const document = {
    activeElement: null,
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
  };
  const makeElement = (tagName = 'div') => new FakeElement(tagName, document);
  const sentinel = makeElement('button');
  document.activeElement = sentinel;

  const header = makeElement('header');
  const hero = makeElement('section');
  const form = makeElement('form');
  const status = makeElement('p');
  const banner = makeElement('aside');
  const accept = makeElement('button');
  const deny = makeElement('button');
  const manage = makeElement('button');
  const cta = makeElement('a');
  banner.hidden = true;
  cta.dataset.ctaLocation = 'hero';
  cta.dataset.contactMethod = 'whatsapp';
  cta.textContent = 'Pedir avaliação pelo WhatsApp';

  const fieldDefinitions = {
    nome: { required: true, type: 'text' },
    telefone: { required: true, type: 'tel' },
    email: { required: false, type: 'email' },
    assunto: { required: true, type: 'text' },
    mensagem: { required: true, type: 'textarea' },
  };
  const fields = {};
  const errors = {};
  for (const [name, definition] of Object.entries(fieldDefinitions)) {
    const field = makeElement(definition.type === 'textarea' ? 'textarea' : 'input');
    field.name = name;
    field.required = definition.required;
    field.type = definition.type;
    fields[name] = field;
    const error = makeElement('span');
    error.dataset.errorFor = name;
    errors[name] = error;
  }
  form.fields = fields;
  form.elements = fields;

  const selectors = new Map([
    ['[data-site-header]', header],
    ['#inicio', hero],
    ['[data-whatsapp-form]', form],
    ['[data-form-status]', status],
    ['[data-consent-banner]', banner],
    ['[data-consent-accept]', accept],
    ['[data-consent-deny]', deny],
    ['[data-consent-manage]', manage],
  ]);
  document.querySelector = (selector) => selectors.get(selector) ?? null;
  document.querySelectorAll = (selector) => {
    if (selector === '[data-track-cta]') return [cta];
    if (selector === '[data-error-for]') return Object.values(errors);
    return [];
  };

  const storage = new Map();
  if (storedConsent !== null) storage.set('verticalchao_consent', storedConsent);
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error('storage unavailable');
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error('storage unavailable');
      storage.set(key, String(value));
    },
  };

  const popup = popupAllowed ? { location: { href: '' }, opener: 'unsafe' } : null;
  const openCalls = [];
  const gtagCalls = [];
  const observers = [];
  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe(target) {
      this.target = target;
    }
  }

  const window = {
    dataLayer: [],
    document,
    localStorage,
    open(...args) {
      openCalls.push(args);
      return popup;
    },
  };
  const gtag = (...args) => gtagCalls.push(args);
  window.gtag = gtag;

  return {
    context: {
      URL,
      clearTimeout,
      console,
      document,
      encodeURIComponent,
      gtag,
      IntersectionObserver: FakeIntersectionObserver,
      localStorage,
      setTimeout,
      window,
    },
    elements: { accept, banner, cta, deny, errors, fields, form, header, hero, manage, sentinel, status },
    gtagCalls,
    observers,
    openCalls,
    popup,
    storage,
    window,
  };
}

async function runSiteScript(harness) {
  const source = await readRequired('script.js');
  vm.runInNewContext(source, harness.context, { filename: 'script.js' });
  return harness;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('keeps committed outputs when post-commit backup cleanup partially fails', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'limpeza-build-contract-'));
  const stagedRoot = path.join(temporaryRoot, 'staged');
  const stagedDist = path.join(stagedRoot, 'dist');
  const stagedPublic = path.join(stagedRoot, 'public');

  try {
    for (const directory of [path.join(temporaryRoot, 'dist'), path.join(temporaryRoot, 'public'), stagedDist, stagedPublic]) {
      await mkdir(directory, { recursive: true });
    }
    await Promise.all([
      writeFile(path.join(temporaryRoot, 'dist', 'version.txt'), 'old-dist'),
      writeFile(path.join(temporaryRoot, 'public', 'version.txt'), 'old-public'),
      writeFile(path.join(stagedDist, 'version.txt'), 'new-dist'),
      writeFile(path.join(stagedPublic, 'version.txt'), 'new-public'),
    ]);

    const { replaceOutputs } = await import('./build.mjs');
    assert.equal(typeof replaceOutputs, 'function', 'replaceOutputs must be exported for safety testing');
    let rejectedCleanup = false;
    const remove = async (target, options) => {
      if (!rejectedCleanup && target.includes('.backup-')) {
        rejectedCleanup = true;
        throw new Error('simulated backup cleanup failure');
      }
      await rm(target, options);
    };

    await replaceOutputs(
      temporaryRoot,
      [
        { name: 'dist', stagedPath: stagedDist },
        { name: 'public', stagedPath: stagedPublic },
      ],
      { remove, logger: { warn() {} } },
    );

    assert.equal(await readFile(path.join(temporaryRoot, 'dist', 'version.txt'), 'utf8'), 'new-dist');
    assert.equal(await readFile(path.join(temporaryRoot, 'public', 'version.txt'), 'utf8'), 'new-public');
    await access(path.join(temporaryRoot, 'dist'));
    await access(path.join(temporaryRoot, 'public'));
    const preservedBackup = (await readdir(temporaryRoot)).find((entry) => entry.startsWith('.dist.backup-'));
    assert.ok(preservedBackup, 'Failed cleanup must preserve the prior output backup');
    assert.equal(await readFile(path.join(temporaryRoot, preservedBackup, 'version.txt'), 'utf8'), 'old-dist');
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('link checker parses srcset and rejects decoded Windows separators', async () => {
  const { collectReferences, localTarget } = await import('./check-links.mjs');
  assert.equal(typeof collectReferences, 'function');
  assert.equal(typeof localTarget, 'function');

  const references = collectReferences(
    '<img src="assets/fallback.webp" srcset="assets/small.webp 480w, assets/large.webp 960w">',
    '',
  );
  assert.deepEqual(references, ['assets/fallback.webp', 'assets/small.webp', 'assets/large.webp']);
  assert.throws(() => localTarget(root, 'assets%5Cprivate.webp'), /Windows path is forbidden/);
});

test('link checker ignores encoded SVG fragment references nested in data URLs', async () => {
  const { collectReferences, localTarget } = await import('./check-links.mjs');
  const styles = `.texture {
    background-image: url("data:image/svg+xml,%3Csvg%3E%3Cfilter id='n'%3E%3C/filter%3E%3Crect filter='url(%23n)'/%3E%3C/svg%3E");
  }`;
  const references = collectReferences('', styles);
  assert.ok(references.includes('%23n'), 'Fixture must exercise the nested encoded fragment');
  assert.equal(localTarget(root, '%23n'), null, 'An encoded fragment inside a data URL is not a local file');
});

test('production package excludes raw source candidates', async () => {
  const build = await readRequired('scripts/build.mjs');
  assert.doesNotMatch(
    build,
    /cp\(path\.join\(root,\s*['"]assets['"]\),[\s\S]{0,120}?recursive:\s*true/,
    'Build must not copy the complete assets tree',
  );
  for (const requiredAsset of [
    'assets/apple-touch-icon.png',
    'assets/favicon-32.png',
    'assets/fonts',
    'assets/img/webp',
  ]) {
    assert.match(build, new RegExp(requiredAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('declares the approved contacts and removes retired contacts everywhere', async () => {
  const files = await Promise.all([
    readRequired('index.html'),
    readRequired('styles.css'),
    readRequired('script.js'),
    readRequired('build.json'),
  ]);
  const combined = files.join('\n');
  const required = ['5531996848477', '5531987122106'];
  const forbidden = ['5531994711393', '99471-1393', 'Edvaldo'];

  for (const value of required) assert.match(combined, new RegExp(value));
  for (const value of forbidden) assert.doesNotMatch(combined, new RegExp(value, 'i'));
  assertRemovedPhoneAbsent(combined);
  assert.match(files[0], /\(31\)\s*99684-8477/);
  assert.match(files[0], /\(31\)\s*98712-2106/);

  const html = files[0];
  const normalizedHtml = html.replaceAll('&amp;', '&');
  const approvedWhatsApp = 'https://api.whatsapp.com/send?phone=5531996848477&text=Ol%C3%A1,%20preciso%20de%20um%20atendimento!';
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? '';
  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? '';
  const outsideFooter = html.replace(footer, '');
  const widget = extractTagWithAttribute(html, 'a', 'data-whatsapp-widget', null)[0] ?? '';
  const whatsappHrefs = (html.match(/<a\b[^>]*>/gi) ?? [])
    .map((tag) => extractAttribute(tag, 'href').replaceAll('&amp;', '&'))
    .filter((href) => /^https:\/\/api\.whatsapp\.com\/send(?:\?|$)/i.test(href));

  assert.match(html, /href=["']tel:\+5531996848477["']/);
  assert.match(normalizedHtml, new RegExp(approvedWhatsApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(header, 'A header element is required');
  assert.match(header, /href=["']tel:\+5531996848477["']/);
  assert.match(header.replaceAll('&amp;', '&'), new RegExp(approvedWhatsApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(whatsappHrefs.length > 0, 'At least one api.whatsapp.com/send link is required');
  for (const href of whatsappHrefs) {
    assert.equal(new URL(href).searchParams.get('phone'), '5531996848477', `Unexpected WhatsApp phone in ${href}`);
  }
  assert.ok(footer, 'A footer element is required');
  assert.match(footer, /href=["']tel:\+5531987122106["']/);
  assert.doesNotMatch(outsideFooter, /href=["']tel:\+5531987122106["']/);
  assert.doesNotMatch(outsideFooter, /\(31\)\s*98712-2106/);
  assert.ok(widget, 'The floating WhatsApp link must use data-whatsapp-widget');
  assert.match(widget.replaceAll('&amp;', '&'), new RegExp(approvedWhatsApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(files[2], /const\s+WHATSAPP_NUMBER\s*=\s*["']5531996848477["']/);
  assert.match(files[2], /api\.whatsapp\.com\/send\?phone=\$\{WHATSAPP_NUMBER\}&text=\$\{encodeURIComponent\(/);
});

test('uses exactly the original GTM container and no direct analytics IDs', async () => {
  const html = await readRequired('index.html');
  const script = await readRequired('script.js');
  const metadata = await readRequired('build.json');
  const combined = `${html}\n${script}\n${metadata}`;
  const trackingIds = [...new Set(combined.match(/(?:GTM|G|AW)-[A-Z0-9-]+/g) ?? [])];

  assert.deepEqual(trackingIds, ['GTM-M7GS29F']);
  assert.equal(countMatches(html, /googletagmanager\.com\/gtm\.js/gi), 1);
  assert.equal(countMatches(html, /googletagmanager\.com\/ns\.html\?id=GTM-M7GS29F/gi), 1);
  assert.equal(countMatches(html, /(?:window\.)?dataLayer\.push\(/g), 1, 'HTML may only contain the Consent/GTM bootstrap push');
});

test('has one H1 and canonical metadata for the Pages deployment', async () => {
  const html = await readRequired('index.html');
  const canonical = 'https://limpezadefachadas-verticalchao.pages.dev/';
  const canonicalTags = extractTagWithAttribute(html, 'link', 'rel', 'canonical');
  const ogUrlTags = extractTagWithAttribute(html, 'meta', 'property', 'og:url');

  assert.equal(countMatches(html, /<h1\b/gi), 1);
  assert.equal(canonicalTags.length, 1);
  assert.match(canonicalTags[0], new RegExp(`\\bhref=["']${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`));
  assert.equal(ogUrlTags.length, 1);
  assert.match(ogUrlTags[0], new RegExp(`\\bcontent=["']${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`));
  assert.match(html, /["']@type["']\s*:\s*["']HomeAndConstructionBusiness["']/);
});

test('ships exactly three static gallery figures and no mobile menu hooks', async () => {
  const html = await readRequired('index.html');
  const styles = await readRequired('styles.css');
  const script = await readRequired('script.js');
  const metadata = JSON.parse(await readRequired('build.json'));
  const combined = `${html}\n${styles}\n${script}`;
  const forbidden = ['menu-toggle', 'data-menu-toggle', 'hamburger'];

  assert.equal(countMatches(html, /<figure\b/gi), 3);
  for (const value of forbidden) assert.doesNotMatch(combined, new RegExp(value, 'i'));
  assert.equal(metadata.mobile_menu, false);
  assert.match(styles, /\.gallery\s+figure[^}]*aspect-ratio\s*:\s*4\s*\/\s*3/is);
});

test('provides revisable Consent Mode v2 with denied defaults', async () => {
  const html = await readRequired('index.html');
  const script = await readRequired('script.js');
  const combined = `${html}\n${script}`;

  assert.match(html, /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/);
  for (const signal of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
    assert.match(html, new RegExp(`${signal}\\s*:\\s*['\"]denied['\"]`));
    assert.match(script, new RegExp(signal));
  }
  for (const hook of ['data-consent-banner', 'data-consent-accept', 'data-consent-deny', 'data-consent-manage']) {
    assert.match(html, new RegExp(hook));
  }
  assert.match(script, /verticalchao_consent/);
  assert.match(script, /gtag\(\s*['"]consent['"]\s*,\s*['"]update['"]/);
  assert.match(script, /try\s*{[\s\S]*localStorage[\s\S]*}\s*catch\s*\(/);

  // This is the static contract; Task 7 adds browser-level behavior tests for these controls.
  const grantedMap = extractFunctionBody(script, 'getGrantedConsent');
  const deniedMap = extractFunctionBody(script, 'getDeniedConsent');
  for (const signal of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
    assert.match(grantedMap, new RegExp(`${signal}\\s*:\\s*['\"]granted['\"]`));
    assert.match(deniedMap, new RegExp(`${signal}\\s*:\\s*['\"]denied['\"]`));
  }
  assert.deepEqual(
    [...grantedMap.matchAll(/\b([a-z_][a-z\d_]*)\s*:/gi)].map((match) => match[1]).sort(),
    ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage'],
  );
  assert.deepEqual(
    [...deniedMap.matchAll(/\b([a-z_][a-z\d_]*)\s*:/gi)].map((match) => match[1]).sort(),
    ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage'],
  );
  assert.match(script, /consentAccept\??\.addEventListener\(\s*['"]click['"][\s\S]{0,300}?['"]granted['"]/);
  assert.match(script, /consentDeny\??\.addEventListener\(\s*['"]click['"][\s\S]{0,300}?['"]denied['"]/);
  assert.match(script, /consentManage\??\.addEventListener\(\s*['"]click['"][\s\S]{0,300}?showConsentBanner/);
});

test('builds an accessible WhatsApp form for the approved commercial number', async () => {
  const html = await readRequired('index.html');
  const script = await readRequired('script.js');

  assert.match(html, /<form\b[^>]*data-whatsapp-form[^>]*novalidate/);
  for (const name of ['nome', 'telefone', 'email', 'assunto', 'mensagem']) {
    assert.match(html, new RegExp(`name=["']${name}["']`));
  }
  assert.match(script, /5531996848477/);
  assert.match(script, /encodeURIComponent/);
  assert.match(script, /aria-invalid/);
  assert.match(script, /\.focus\(\)/);
});

test('uses a detectable WhatsApp popup with a safe opener and blocked fallback', async () => {
  const html = await readRequired('index.html');
  const script = await readRequired('script.js');

  assert.match(script, /window\.open\(\s*['"]['"]\s*,\s*['"]_blank['"]\s*\)/);
  assert.match(script, /popup\.opener\s*=\s*null/);
  assert.match(script, /popup\.location\.href\s*=\s*url/);
  assert.match(script, /popup_blocked/);
  assert.match(html, /(?:role=["']status["']|aria-live=["'](?:polite|assertive)["'])/);
});

test('keeps analytics event payloads free from personal form fields', async () => {
  const script = await readRequired('script.js');
  const calls = extractCalls(script, 'trackEvent').filter((call) => !/^\s*eventName\b/.test(call));
  const helperBody = extractFunctionBody(script, 'trackEvent');
  const allowedDeclaration = script.match(/const\s+TRACKING_METADATA_KEYS\s*=\s*new\s+Set\(\s*\[([\s\S]*?)\]\s*\)/)?.[1] ?? '';
  const declaredKeys = [...allowedDeclaration.matchAll(/["']([a-z_]+)["']/g)].map((match) => match[1]);
  const allowedKeys = ['block_reason', 'consent_choice', 'contact_method', 'cta_location', 'cta_text', 'form_name'];

  assert.ok(calls.length >= 4, 'Expected custom event calls for CTA, form, popup, and consent');
  assert.deepEqual([...declaredKeys].sort(), allowedKeys);
  assert.match(helperBody, /Object\.entries\(metadata\)/);
  assert.match(helperBody, /TRACKING_METADATA_KEYS\.has\(key\)/);
  assert.match(helperBody, /(?:window\.)?dataLayer\.push\(/);
  assert.equal(countMatches(script, /(?:window\.)?dataLayer\.push\(/g), 1, 'Only trackEvent may push to dataLayer');
  for (const call of calls) {
    assert.match(call, /^\s*["'][a-z_]+["']\s*,\s*{/, 'Tracking calls must use a literal event name and inline metadata object');
    assert.doesNotMatch(call, /\b(nome|telefone|email|assunto|mensagem|formData|fields|values|payload)\b/i);
    const metadataKeys = [...call.matchAll(/(?:\{|,)\s*([a-z_][a-z\d_]*)\s*(?=:|[,}])/gi)].map((match) => match[1]);
    for (const key of metadataKeys) assert.ok(allowedKeys.includes(key), `Forbidden tracking metadata key: ${key}`);
  }
  for (const eventName of ['cta_clicked', 'form_submitted', 'popup_blocked', 'consent_updated']) {
    assert.match(script, new RegExp(`["']${eventName}["']`));
  }
});

test('provides visible AA focus treatment and reduced-motion support', async () => {
  const styles = await readRequired('styles.css');

  assert.match(styles, /:focus-visible/);
  assert.match(styles, /outline\s*:\s*3px\s+solid\s+#fff(?:fff)?/i);
  assert.match(styles, /box-shadow\s*:\s*0\s+0\s+0\s+6px\s+var\(--red-dark\)/i);
  assert.match(styles, /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i);
  assert.doesNotMatch(styles, /transition\s*:\s*all\b/i);
});

test('publishes a sitemap that matches the canonical URL', async () => {
  const robots = await readRequired('robots.txt');
  const sitemap = await readRequired('sitemap.xml');
  const canonical = 'https://limpezadefachadas-verticalchao.pages.dev/';

  assert.match(robots, new RegExp(`Sitemap:\\s*${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}sitemap\\.xml`));
  assert.match(sitemap, new RegExp(`<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
});

test('declares exact build metadata for contacts and tracking', async () => {
  const metadata = JSON.parse(await readRequired('build.json'));

  assert.deepEqual(metadata.tracking, { gtm: 'GTM-M7GS29F' });
  assert.equal(metadata.mobile_menu, false);
  assert.equal(metadata.contacts.commercial, '+5531996848477');
  assert.equal(metadata.contacts.footer_secondary, '+5531987122106');
});

test('shows consent on first load without stealing focus', async () => {
  const harness = makeRuntimeHarness();
  await runSiteScript(harness);

  assert.equal(harness.elements.banner.hidden, false);
  assert.equal(harness.elements.sentinel, harness.context.document.activeElement);
  assert.equal(harness.gtagCalls.length, 0, 'No consent update is needed before a visitor chooses');
});

test('persists accepted consent and sends the exact four granted signals', async () => {
  const harness = makeRuntimeHarness();
  await runSiteScript(harness);
  harness.elements.accept.dispatch('click');

  assert.equal(harness.storage.get('verticalchao_consent'), 'granted');
  assert.equal(harness.elements.banner.hidden, true);
  assert.deepEqual(
    JSON.parse(JSON.stringify(harness.gtagCalls.at(-1))),
    [
      'consent',
      'update',
      {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      },
    ],
  );
  assert.deepEqual(plain(harness.window.dataLayer.at(-1)), {
    event: 'consent_updated',
    consent_choice: 'granted',
  });
});

test('manage consent focuses the dialog and denying restores focus to the manager', async () => {
  const harness = makeRuntimeHarness({ storedConsent: 'granted' });
  await runSiteScript(harness);
  harness.gtagCalls.length = 0;
  harness.window.dataLayer.length = 0;

  harness.elements.manage.focus();
  harness.elements.manage.dispatch('click');
  assert.equal(harness.elements.banner.hidden, false);
  assert.equal(harness.context.document.activeElement, harness.elements.accept);

  harness.elements.deny.dispatch('click');
  assert.equal(harness.storage.get('verticalchao_consent'), 'denied');
  assert.equal(harness.elements.banner.hidden, true);
  assert.equal(harness.context.document.activeElement, harness.elements.manage);
  assert.deepEqual(
    JSON.parse(JSON.stringify(harness.gtagCalls.at(-1))),
    [
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ],
  );
  assert.deepEqual(plain(harness.window.dataLayer.at(-1)), {
    event: 'consent_updated',
    consent_choice: 'denied',
  });
});

test('restores stored consent on reload without showing the banner or stealing focus', async () => {
  for (const choice of ['granted', 'denied']) {
    const harness = makeRuntimeHarness({ storedConsent: choice });
    await runSiteScript(harness);

    assert.equal(harness.elements.banner.hidden, true);
    assert.equal(harness.context.document.activeElement, harness.elements.sentinel);
    assert.deepEqual(plain(harness.gtagCalls), [
      [
        'consent',
        'update',
        {
          analytics_storage: choice,
          ad_storage: choice,
          ad_user_data: choice,
          ad_personalization: choice,
        },
      ],
    ]);
  }
});

test('keeps consent controls usable when browser storage is unavailable', async () => {
  const harness = makeRuntimeHarness({ storageThrows: true });
  await runSiteScript(harness);
  assert.equal(harness.elements.banner.hidden, false);
  assert.doesNotThrow(() => harness.elements.deny.dispatch('click'));
  assert.equal(harness.elements.banner.hidden, true);
});

test('marks form errors and focuses the first invalid field', async () => {
  const harness = makeRuntimeHarness();
  await runSiteScript(harness);

  const emptySubmit = harness.elements.form.dispatch('submit');
  assert.equal(emptySubmit.defaultPrevented, true);
  assert.equal(harness.context.document.activeElement, harness.elements.fields.nome);
  for (const name of ['nome', 'telefone', 'assunto', 'mensagem']) {
    assert.equal(harness.elements.fields[name].getAttribute('aria-invalid'), 'true');
    assert.ok(harness.elements.errors[name].textContent.trim(), `${name} must have an accessible error`);
  }

  Object.assign(harness.elements.fields.nome, { value: 'Ana' });
  Object.assign(harness.elements.fields.telefone, { value: '31 9999-999' });
  Object.assign(harness.elements.fields.email, { value: 'email-inválido' });
  Object.assign(harness.elements.fields.assunto, { value: 'Limpeza de fachada' });
  Object.assign(harness.elements.fields.mensagem, { value: 'Quero agendar uma vistoria.' });
  harness.elements.form.dispatch('submit');

  assert.equal(harness.context.document.activeElement, harness.elements.fields.telefone);
  assert.equal(harness.elements.fields.telefone.getAttribute('aria-invalid'), 'true');
  assert.equal(harness.elements.fields.email.getAttribute('aria-invalid'), 'true');
  assert.match(harness.elements.errors.telefone.textContent, /10/);
});

function fillValidForm(fields) {
  fields.nome.value = 'Ana Souza';
  fields.telefone.value = '(31) 99999-0000';
  fields.email.value = 'ana@example.com';
  fields.assunto.value = 'Limpeza de fachada';
  fields.mensagem.value = 'Quero agendar uma vistoria.';
}

test('opens a valid WhatsApp form safely and tracks only non-PII metadata', async () => {
  const harness = makeRuntimeHarness();
  fillValidForm(harness.elements.fields);
  await runSiteScript(harness);
  harness.window.dataLayer.length = 0;

  harness.elements.form.dispatch('submit');

  assert.deepEqual(harness.openCalls, [['', '_blank']]);
  assert.equal(harness.popup.opener, null);
  const destination = new URL(harness.popup.location.href);
  assert.equal(destination.origin + destination.pathname, 'https://api.whatsapp.com/send');
  assert.equal(destination.searchParams.get('phone'), '5531996848477');
  const message = destination.searchParams.get('text');
  for (const value of ['Ana Souza', '(31) 99999-0000', 'ana@example.com', 'Limpeza de fachada', 'Quero agendar uma vistoria.']) {
    assert.match(message, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal(harness.window.dataLayer.length, 1);
  assert.deepEqual(plain(harness.window.dataLayer[0]), {
    event: 'form_submitted',
    contact_method: 'whatsapp',
    form_name: 'limpeza_orcamento',
  });
  assert.doesNotMatch(JSON.stringify(harness.window.dataLayer), /Ana|99999|example\.com|vistoria/i);
});

test('accepts a blank optional email and still opens the approved WhatsApp destination', async () => {
  const harness = makeRuntimeHarness();
  fillValidForm(harness.elements.fields);
  harness.elements.fields.email.value = '';
  await runSiteScript(harness);

  harness.elements.form.dispatch('submit');

  assert.deepEqual(harness.openCalls, [['', '_blank']]);
  assert.equal(harness.popup.opener, null);
  const destination = new URL(harness.popup.location.href);
  assert.equal(destination.searchParams.get('phone'), '5531996848477');
  assert.match(destination.searchParams.get('text'), /E-mail: Não informado/);
  assert.equal(harness.elements.fields.email.getAttribute('aria-invalid'), null);
});

test('provides an accessible recovery link and event when the popup is blocked', async () => {
  const harness = makeRuntimeHarness({ popupAllowed: false });
  fillValidForm(harness.elements.fields);
  await runSiteScript(harness);
  harness.window.dataLayer.length = 0;

  harness.elements.form.dispatch('submit');

  const recoveryLink = harness.elements.status.querySelector('a');
  assert.ok(recoveryLink, 'Blocked popups must expose a real recovery link');
  assert.equal(recoveryLink.getAttribute('data-form-recovery'), '');
  assert.match(recoveryLink.href, /^https:\/\/api\.whatsapp\.com\/send\?phone=5531996848477&text=/);
  assert.match(harness.elements.status.textContent, /n[aã]o abriu|bloquead/i);
  assert.deepEqual(plain(harness.window.dataLayer), [
    {
      event: 'form_submitted',
      contact_method: 'whatsapp',
      form_name: 'limpeza_orcamento',
    },
    {
      event: 'popup_blocked',
      block_reason: 'browser',
      contact_method: 'whatsapp',
      form_name: 'limpeza_orcamento',
    },
  ]);
});

test('tracks CTA context and toggles the compact header through an observer', async () => {
  const harness = makeRuntimeHarness();
  await runSiteScript(harness);
  harness.window.dataLayer.length = 0;

  harness.elements.cta.dispatch('click');
  assert.deepEqual(plain(harness.window.dataLayer), [
    {
      event: 'cta_clicked',
      contact_method: 'whatsapp',
      cta_location: 'hero',
      cta_text: 'Pedir avaliação pelo WhatsApp',
    },
  ]);

  assert.equal(harness.observers.length, 1);
  harness.observers[0].callback([{ isIntersecting: false }]);
  assert.equal(harness.elements.header.classList.contains('is-scrolled'), true);
  harness.observers[0].callback([{ isIntersecting: true }]);
  assert.equal(harness.elements.header.classList.contains('is-scrolled'), false);
});

test('declares exactly one literal tracking call for each approved custom event', async () => {
  const script = await readRequired('script.js');
  const literalEventNames = extractCalls(script, 'trackEvent')
    .map((call) => call.match(/^\s*["']([a-z_]+)["']/)?.[1])
    .filter(Boolean)
    .sort();

  assert.deepEqual(literalEventNames, [
    'consent_updated',
    'cta_clicked',
    'form_submitted',
    'popup_blocked',
  ]);
});
