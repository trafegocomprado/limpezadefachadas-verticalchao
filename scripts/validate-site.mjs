import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readRequired(root, relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Required site file is missing: ${relativePath}`);
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
    if (/[\w$]/.test(source[cursor - 1] ?? '')) {
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
      } else if (quote) {
        if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
      } else if (character === '"' || character === "'" || character === '`') {
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

export async function validateSite(root = defaultRoot) {
  const [html, styles, script, robots, sitemap, metadataSource] = await Promise.all([
    readRequired(root, 'index.html'),
    readRequired(root, 'styles.css'),
    readRequired(root, 'script.js'),
    readRequired(root, 'robots.txt'),
    readRequired(root, 'sitemap.xml'),
    readRequired(root, 'build.json'),
  ]);
  const metadata = JSON.parse(metadataSource);
  const combined = `${html}\n${styles}\n${script}\n${metadataSource}`;

  for (const required of ['GTM-M7GS29F', '5531996848477', '5531987122106']) {
    assert.match(combined, new RegExp(required), `Missing required value: ${required}`);
  }
  for (const forbidden of ['5531994711393', '99471-1393', 'Edvaldo', 'menu-toggle', 'data-menu-toggle', 'hamburger']) {
    assert.doesNotMatch(combined, new RegExp(forbidden, 'i'), `Forbidden value found: ${forbidden}`);
  }
  assertRemovedPhoneAbsent(combined);

  const approvedWhatsApp = 'https://api.whatsapp.com/send?phone=5531996848477&text=Ol%C3%A1,%20preciso%20de%20um%20atendimento!';
  const normalizedHtml = html.replaceAll('&amp;', '&');
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? '';
  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? '';
  const outsideFooter = html.replace(footer, '');
  const widget = extractTagWithAttribute(html, 'a', 'data-whatsapp-widget', null)[0] ?? '';
  const whatsappHrefs = (html.match(/<a\b[^>]*>/gi) ?? [])
    .map((tag) => extractAttribute(tag, 'href').replaceAll('&amp;', '&'))
    .filter((href) => /^https:\/\/api\.whatsapp\.com\/send(?:\?|$)/i.test(href));
  assert.match(html, /href=["']tel:\+5531996848477["']/, 'Exact commercial tel link is missing');
  assert.match(normalizedHtml, new RegExp(approvedWhatsApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'Approved WhatsApp URL is missing');
  assert.ok(header, 'A header element is required');
  assert.match(header, /href=["']tel:\+5531996848477["']/, 'Header must contain the exact commercial tel link');
  assert.match(header.replaceAll('&amp;', '&'), new RegExp(approvedWhatsApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'Header must contain the approved WhatsApp URL');
  assert.ok(whatsappHrefs.length > 0, 'At least one api.whatsapp.com/send link is required');
  for (const href of whatsappHrefs) {
    assert.equal(new URL(href).searchParams.get('phone'), '5531996848477', `Unexpected WhatsApp phone in ${href}`);
  }
  assert.ok(footer, 'A footer element is required');
  assert.match(footer, /href=["']tel:\+5531987122106["']/, 'Secondary tel link must be in footer');
  assert.doesNotMatch(outsideFooter, /href=["']tel:\+5531987122106["']/, 'Secondary tel link is restricted to footer');
  assert.doesNotMatch(outsideFooter, /\(31\)\s*98712-2106/, 'Secondary display phone is restricted to footer');
  assert.ok(widget, 'Floating WhatsApp link must use data-whatsapp-widget');
  assert.match(widget.replaceAll('&amp;', '&'), new RegExp(approvedWhatsApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const trackingIds = [...new Set(combined.match(/(?:GTM|G|AW)-[A-Z0-9-]+/g) ?? [])];
  assert.deepEqual(trackingIds, ['GTM-M7GS29F'], 'Tracking must contain only GTM-M7GS29F');
  assert.equal(countMatches(html, /googletagmanager\.com\/gtm\.js/gi), 1, 'GTM loader must appear once');
  assert.equal(
    countMatches(html, /googletagmanager\.com\/ns\.html\?id=GTM-M7GS29F/gi),
    1,
    'GTM noscript must appear once',
  );
  assert.equal(countMatches(html, /(?:window\.)?dataLayer\.push\(/g), 1, 'HTML may only contain the Consent/GTM bootstrap push');

  assert.equal(countMatches(html, /<h1\b/gi), 1, 'HTML must contain exactly one H1');
  assert.equal(countMatches(html, /<figure\b/gi), 3, 'Gallery must contain exactly three figures');
  const canonical = 'https://limpezadefachadas-verticalchao.pages.dev/';
  const canonicalTags = extractTagWithAttribute(html, 'link', 'rel', 'canonical');
  const ogUrlTags = extractTagWithAttribute(html, 'meta', 'property', 'og:url');
  assert.equal(canonicalTags.length, 1, 'HTML must contain one canonical link');
  assert.match(canonicalTags[0], new RegExp(`\\bhref=["']${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`), 'Canonical href must be exact');
  assert.equal(ogUrlTags.length, 1, 'HTML must contain one og:url');
  assert.match(ogUrlTags[0], new RegExp(`\\bcontent=["']${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`), 'og:url must be exact');
  assert.match(html, /<form\b[^>]*data-contact-form[^>]*novalidate/, 'Email form contract is missing');
  for (const value of ['contact-config.js', 'contact-form.js', 'data-form-name="limpeza_orcamento"']) assert.ok(html.includes(value), `Missing contact integration: ${value}`);
  assert.match(html, /(?:role=["']status["']|aria-live=["'](?:polite|assertive)["'])/, 'Form status must be announced');

  assert.match(html, /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/, 'Consent default is missing');
  for (const signal of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
    assert.match(html, new RegExp(`${signal}\\s*:\\s*['\"]denied['\"]`), `${signal} must default to denied`);
    assert.match(script, new RegExp(signal), `${signal} must be revisable`);
  }
  for (const hook of ['data-consent-banner', 'data-consent-accept', 'data-consent-deny', 'data-consent-manage']) {
    assert.match(html, new RegExp(hook), `Missing consent hook: ${hook}`);
  }
  assert.match(script, /verticalchao_consent/, 'Consent preference key is missing');
  assert.match(script, /gtag\(\s*['"]consent['"]\s*,\s*['"]update['"]/, 'Consent update is missing');
  assert.match(script, /try\s*{[\s\S]*localStorage[\s\S]*}\s*catch\s*\(/, 'localStorage must be guarded');
  // Static guarantees here are complemented by the Task 7 browser/runtime behavior suite.
  const grantedMap = extractFunctionBody(script, 'getGrantedConsent');
  const deniedMap = extractFunctionBody(script, 'getDeniedConsent');
  for (const signal of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
    assert.match(grantedMap, new RegExp(`${signal}\\s*:\\s*['\"]granted['\"]`), `${signal} must map to granted`);
    assert.match(deniedMap, new RegExp(`${signal}\\s*:\\s*['\"]denied['\"]`), `${signal} must map to denied`);
  }
  assert.deepEqual(
    [...grantedMap.matchAll(/\b([a-z_][a-z\d_]*)\s*:/gi)].map((match) => match[1]).sort(),
    ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage'],
    'Granted consent map must contain exactly four signals',
  );
  assert.deepEqual(
    [...deniedMap.matchAll(/\b([a-z_][a-z\d_]*)\s*:/gi)].map((match) => match[1]).sort(),
    ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage'],
    'Denied consent map must contain exactly four signals',
  );
  assert.match(script, /consentAccept\??\.addEventListener\(\s*['"]click['"][\s\S]{0,300}?['"]granted['"]/, 'Accept handler must persist granted');
  assert.match(script, /consentDeny\??\.addEventListener\(\s*['"]click['"][\s\S]{0,300}?['"]denied['"]/, 'Deny handler must persist denied');
  assert.match(script, /consentManage\??\.addEventListener\(\s*['"]click['"][\s\S]{0,300}?showConsentBanner/, 'Manage handler must reopen consent');


  assert.match(styles, /:focus-visible/, 'Visible focus styles are missing');
  assert.match(styles, /outline\s*:\s*3px\s+solid\s+#fff(?:fff)?/i, 'Field focus outline must be white and 3px');
  assert.match(styles, /box-shadow\s*:\s*0\s+0\s+0\s+6px\s+var\(--red-dark\)/i, 'Field focus ring must use red-dark');
  assert.match(styles, /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i, 'Reduced motion support is missing');
  assert.doesNotMatch(styles, /transition\s*:\s*all\b/i, 'transition: all is forbidden');

  const eventCalls = extractCalls(script, 'trackEvent').filter((call) => !/^\s*eventName\b/.test(call));
  const trackingHelper = extractFunctionBody(script, 'trackEvent');
  const allowedDeclaration = script.match(/const\s+TRACKING_METADATA_KEYS\s*=\s*new\s+Set\(\s*\[([\s\S]*?)\]\s*\)/)?.[1] ?? '';
  const declaredKeys = [...allowedDeclaration.matchAll(/["']([a-z_]+)["']/g)].map((match) => match[1]);
  const allowedKeys = ['consent_choice', 'contact_method', 'cta_location', 'cta_text'];
  assert.equal(eventCalls.length, 2, 'Expected CTA and consent events; email conversion is handled separately');
  assert.deepEqual([...declaredKeys].sort(), allowedKeys, 'Tracking metadata whitelist must be exact');
  assert.match(trackingHelper, /Object\.entries\(metadata\)/, 'Tracking helper must inspect metadata entries');
  assert.match(trackingHelper, /TRACKING_METADATA_KEYS\.has\(key\)/, 'Tracking helper must enforce its whitelist');
  assert.match(trackingHelper, /(?:window\.)?dataLayer\.push\(/, 'Tracking helper must own the dataLayer push');
  assert.equal(countMatches(script, /(?:window\.)?dataLayer\.push\(/g), 1, 'Direct dataLayer pushes outside trackEvent are forbidden');
  for (const call of eventCalls) {
    assert.match(call, /^\s*["'][a-z_]+["']\s*,\s*{/, 'Tracking calls must use a literal event name and inline metadata object');
    assert.doesNotMatch(call, /\b(nome|telefone|email|assunto|mensagem|formData|fields|values|payload)\b/i, 'Event payload contains a sensitive identifier or value');
    const metadataKeys = [...call.matchAll(/(?:\{|,)\s*([a-z_][a-z\d_]*)\s*(?=:|[,}])/gi)].map((match) => match[1]);
    for (const key of metadataKeys) assert.ok(allowedKeys.includes(key), `Forbidden tracking metadata key: ${key}`);
  }

  assert.match(robots, /Sitemap:\s*https:\/\/limpezadefachadas-verticalchao\.pages\.dev\/sitemap\.xml/);
  assert.match(sitemap, new RegExp(`<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
  assert.deepEqual(metadata.tracking, { gtm: 'GTM-M7GS29F' });
  assert.equal(metadata.mobile_menu, false);
  assert.equal(metadata.contacts?.commercial, '+5531996848477');
  assert.equal(metadata.contacts?.footer_secondary, '+5531987122106');

  return { trackingIds, figureCount: 3, canonical };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateSite();
  console.log('Site contracts validated.');
}
