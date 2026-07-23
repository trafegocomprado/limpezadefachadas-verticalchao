# Limpeza de Fachadas Vertical Chão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, testar e publicar uma landing page estática de limpeza de fachadas e vidros com o sistema visual institucional, os contatos comerciais atuais e somente o tracking encontrado na página original.

**Architecture:** HTML, CSS e JavaScript sem framework, ativos locais e build determinístico para `dist/` e `public/`. Contratos em `node:test` verificam conteúdo, contatos, tracking, SEO e pacote; Playwright valida responsividade, acessibilidade, consentimento e formulário. A copy é fechada e auditada antes de entrar no HTML.

**Tech Stack:** HTML5, CSS3, JavaScript ES2022, Node.js 20+, `node:test`, Playwright, GitHub CLI, Cloudflare Pages API e Wrangler 4.

---

## Estrutura de arquivos

```text
outputs/limpezadefachadas-verticalchao/
  research/
    source-contract.json
    source-copy.txt
    original-desktop.png
    original-mobile.png
  analysis/
    copy-original.md
    copy-humanizada.md
    anti-ai-report.md
    text-editor-analysis.json
    text-editor-report.html
    copy-final.md
  lp/
    prompt_limpezadefachadas-verticalchao.md
    build/
    qa/
    deploy/github-cloudflare/
      assets/
      docs/quality/
      docs/superpowers/
      scripts/
      public/
      index.html
      styles.css
      script.js
      package.json
      build.json
      package-manifest.json
      robots.txt
      sitemap.xml
      _headers
      _redirects
      README.md
```

`index.html` contém semântica e copy; `styles.css`, o sistema visual e breakpoints; `script.js`, formulário, consentimento e eventos. Cada arquivo em `scripts/` tem uma responsabilidade: contratos, build, validação estrutural ou links.

---

### Task 1: Congelar fonte, ativos, copy e tracking

**Files:**
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/research/source-contract.json`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/research/source-copy.txt`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/analysis/copy-original.md`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/lp/prompt_limpezadefachadas-verticalchao.md`

- [ ] **Step 1: Reextrair a origem imediatamente antes da build**

Ler `https://limpezadefachadas.verticalchao.com.br/`, registrar o texto visível, os depoimentos, os links de WhatsApp e as URLs de imagens oficiais.

- [ ] **Step 2: Criar o contrato da fonte**

Salvar em `source-contract.json`:

```json
{
  "source_url": "https://limpezadefachadas.verticalchao.com.br/",
  "tracking": { "gtm": "GTM-M7GS29F" },
  "contacts": {
    "source_phone": "+5531987122106",
    "approved_commercial": "+5531996848477",
    "approved_footer_secondary": "+5531987122106"
  },
  "reference_urls": [
    "https://limpezadefachadas.verticalchao.com.br/",
    "https://verticalchao-institucional.pages.dev/",
    "https://ecogranito-verticalchao.pages.dev/"
  ]
}
```

- [ ] **Step 3: Criar o prompt PageMind**

O prompt deve declarar `PAGEMIND-PARADIGMA: mainstream`, as três referências, os contatos permitidos, o telefone removido e o único ID de tracking:

```markdown
## REQUIRED TRACKING IDS
- GTM-M7GS29F
- forbidden direct IDs: G-* and AW-* unless rediscovered in the source
```

- [ ] **Step 4: Validar o snapshot**

Run:

```powershell
$c = Get-Content -Raw 'D:\OpenAI-Codex\PageMind Skills\outputs\limpezadefachadas-verticalchao\research\source-contract.json' | ConvertFrom-Json
if ($c.tracking.gtm -ne 'GTM-M7GS29F') { throw 'GTM divergente' }
if ($c.tracking.PSObject.Properties.Count -ne 1) { throw 'Tracking extra encontrado' }
if ($c.reference_urls.Count -ne 3) { throw 'Referências incompletas' }
```

Expected: exit 0.

---

### Task 2: Fechar a copy antes da build

**Files:**
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/analysis/copy-humanizada.md`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/analysis/anti-ai-report.md`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/analysis/text-editor-analysis.json`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/analysis/text-editor-report.html`
- Create: `D:/OpenAI-Codex/PageMind Skills/outputs/limpezadefachadas-verticalchao/analysis/copy-final.md`

- [ ] **Step 1: Ler integralmente as skills e o léxico**

Run:

```powershell
Get-Content -Raw 'C:\Users\Marcilio\.codex\skills\anti-ai-writing\SKILL.md'
Get-Content -Raw 'C:\Users\Marcilio\.codex\skills\anti-ai-writing\references\lexicon.md'
Get-Content -Raw 'C:\Users\Marcilio\.codex\skills\text-editor-br\SKILL.md'
```

Expected: leitura completa antes da reescrita.

- [ ] **Step 2: Produzir a copy humanizada**

Manter a arquitetura de conversão, fatos e depoimentos da origem. Remover contadores quebrados, superlativos sem suporte, promessas absolutas, paralelismo negativo e linguagem formulaica. Explicar que vistoria, material, acesso e estado da superfície orientam o serviço.

- [ ] **Step 3: Rodar `text-editor-br` em modo LP**

Run:

```powershell
python 'C:\Users\Marcilio\.codex\skills\text-editor-br\scripts\analyze.py' --input 'D:\OpenAI-Codex\PageMind Skills\outputs\limpezadefachadas-verticalchao\analysis\copy-humanizada.md' --content-type lp --output 'D:\OpenAI-Codex\PageMind Skills\outputs\limpezadefachadas-verticalchao\analysis\text-editor-analysis.json'
python 'C:\Users\Marcilio\.codex\skills\text-editor-br\scripts\report.py' --json 'D:\OpenAI-Codex\PageMind Skills\outputs\limpezadefachadas-verticalchao\analysis\text-editor-analysis.json' --output 'D:\OpenAI-Codex\PageMind Skills\outputs\limpezadefachadas-verticalchao\analysis\text-editor-report.html'
```

Expected: JSON e HTML gerados sem erro.

- [ ] **Step 4: Corrigir e repetir o scan anti-AI**

Resolver frases difíceis, nominalizações, gerundismo, ecos e inícios repetidos. Repassar as 12 categorias e salvar a versão aprovada em `copy-final.md`.

- [ ] **Step 5: Executar o gate textual**

Run:

```powershell
$copy = Get-Content -Raw 'D:\OpenAI-Codex\PageMind Skills\outputs\limpezadefachadas-verticalchao\analysis\copy-final.md'
if ($copy -match 'Não é .+\. É ') { throw 'Paralelismo negativo encontrado' }
if ($copy -match '\b(crucial|robusto|jornada|mergulhar|alavancar)\b') { throw 'Vocabulário artificial encontrado' }
if ($copy -match '\b0\s*\+?\b') { throw 'Contador quebrado encontrado' }
if ($copy -match 'impecável|solução ideal|transformar completamente') { throw 'Superlativo sem suporte encontrado' }
```

Expected: exit 0.

---

### Task 3: Criar contratos e build seguro com TDD

**Files:**
- Create: `package.json`
- Create: `scripts/contracts.test.mjs`
- Create: `scripts/build.mjs`
- Create: `scripts/validate-site.mjs`
- Create: `scripts/check-links.mjs`

- [ ] **Step 1: Escrever contratos que falham**

Os testes devem ler arquivos com `readFile` e exigir:

```js
const required = ['GTM-M7GS29F', '5531996848477', '5531987122106'];
const forbidden = ['5531994711393', '99471-1393', 'Edvaldo', 'menu-toggle', 'data-menu-toggle'];

assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
assert.match(html, /https:\/\/limpezadefachadas-verticalchao\.pages\.dev\//);
assert.deepEqual([...new Set(combined.match(/(?:GTM|G|AW)-[A-Z0-9-]+/g) ?? [])], ['GTM-M7GS29F']);
```

Também exigir três figuras, sitemap, consentimento revisável, formulário WhatsApp, popup detectável, foco AA e eventos sem chaves pessoais.

- [ ] **Step 2: Confirmar RED**

Run: `npm test`

Expected: FAIL porque `index.html`, `styles.css`, `script.js` e `build.json` ainda não existem.

- [ ] **Step 3: Implementar o build atômico**

`scripts/build.mjs` deve validar e copiar `index.html`, `styles.css`, `script.js`, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects` e `assets/` para staging; só depois substituir `dist/` e `public/`. `build.json` entra em `dist/`, mas não em `public/`.

- [ ] **Step 4: Implementar validação e links**

`validate-site.mjs` repete os invariantes críticos. `check-links.mjs` rejeita traversal, caminhos Windows, barras duplas e ativos ausentes.

- [ ] **Step 5: Configurar scripts**

```json
{
  "name": "limpezadefachadas-verticalchao",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test scripts/contracts.test.mjs",
    "build": "node scripts/build.mjs",
    "validate": "node scripts/validate-site.mjs && node scripts/check-links.mjs",
    "check": "npm test && npm run build && npm run validate"
  }
}
```

- [ ] **Step 6: Confirmar que o harness falha somente pelos arquivos ausentes**

Run: `npm test`

Expected: FAIL nos contratos do site, sem erro de sintaxe do harness.

- [ ] **Step 7: Commit**

```powershell
git add package.json scripts
git commit -m "test: define limpeza de fachadas landing page contract"
```

---

### Task 4: Baixar e normalizar ativos oficiais

**Files:**
- Create: `assets/img/webp/logo.webp`
- Create: `assets/img/webp/limpeza-obra-1.webp`
- Create: `assets/img/webp/limpeza-obra-2.webp`
- Create: `assets/img/webp/limpeza-obra-3.webp`
- Create: `assets/favicon-32.png`
- Create: `assets/apple-touch-icon.png`
- Create: `assets/fonts/outfit-700.woff2`
- Create: `assets/fonts/poppins-400.woff2`
- Create: `assets/fonts/poppins-600.woff2`

- [ ] **Step 1: Selecionar três imagens oficiais**

Baixar somente imagens servidas por `limpezadefachadas.verticalchao.com.br/wp-content/uploads/`. Escolher uma foto horizontal ou suficientemente ampla para o hero e três fotos que mostrem execução ou resultado da limpeza.

- [ ] **Step 2: Converter para WebP**

Preservar orientação, limitar o maior lado a 1600 px e usar qualidade entre 80 e 86. Gerar nomes estáveis e registrar as URLs de origem em `build.json`.

- [ ] **Step 3: Baixar marca e fontes**

Usar logo e favicon da origem. Reaproveitar os arquivos locais Outfit 700 e Poppins 400/600 do projeto Ecogranito, por serem o sistema visual aprovado.

- [ ] **Step 4: Verificar os arquivos**

Run:

```powershell
Get-ChildItem assets -Recurse -File | ForEach-Object { if ($_.Length -eq 0) { throw "Ativo vazio: $($_.FullName)" } }
```

Expected: nenhum ativo vazio.

- [ ] **Step 5: Commit**

```powershell
git add assets
git commit -m "assets: add official limpeza de fachadas media"
```

---

### Task 5: Implementar HTML, SEO e tracking

**Files:**
- Create: `index.html`
- Create: `robots.txt`
- Create: `sitemap.xml`
- Create: `build.json`
- Create: `package-manifest.json`

- [ ] **Step 1: Criar a estrutura semântica**

Usar a copy final e os hooks:

```html
<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
<header class="site-header" data-site-header>...</header>
<main id="conteudo" tabindex="-1">...</main>
<form data-whatsapp-form novalidate>...</form>
<aside data-consent-banner aria-labelledby="consent-title">...</aside>
<button type="button" data-consent-manage>Alterar preferências de cookies</button>
```

Incluir exatamente três figuras. Não criar menu móvel, carrossel, lightbox ou contadores.

- [ ] **Step 2: Inserir SEO**

Canonical e `og:url`: `https://limpezadefachadas-verticalchao.pages.dev/`. JSON-LD: `HomeAndConstructionBusiness`, telefones aprovados e nenhum `aggregateRating` inventado.

- [ ] **Step 3: Preservar somente o tracking da origem**

Antes do loader GTM, executar:

```html
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied', ad_storage: 'denied',
  ad_user_data: 'denied', ad_personalization: 'denied'
});
</script>
```

Carregar `GTM-M7GS29F` uma vez e incluir um único `noscript`. Não configurar `G-*` ou `AW-*`.

- [ ] **Step 4: Criar metadados de build**

`build.json` deve registrar `mobile_menu: false`, contatos, `tracking: { "gtm": "GTM-M7GS29F" }`, referências, ativos e caminhos dos relatórios. `package-manifest.json` deve registrar build `npm run build`, saída `public`, raiz `/` e branch `main`.

- [ ] **Step 5: Rodar contratos**

Run: `npm test`

Expected: HTML, SEO e tracking passam; testes dependentes de CSS/JS podem permanecer RED de forma específica.

- [ ] **Step 6: Commit**

```powershell
git add index.html robots.txt sitemap.xml build.json package-manifest.json
git commit -m "feat: add limpeza de fachadas content and tracking"
```

---

### Task 6: Aplicar o sistema visual responsivo

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Definir tokens e tipografia**

Usar `--ink: #17191c`, `--paper: #f4f0e8`, `--paper-light: #fbf8f1`, `--red: #c91f25`, `--red-dark: #b91f24`, Outfit e Poppins. Corpo mínimo de 16 px e texto com medida entre 45 e 75 caracteres.

- [ ] **Step 2: Criar header e hero**

Header transparente no topo e `.is-scrolled` sobre grafite. No mobile, ocultar `.main-nav` e `.header-actions` sem exibir substituto.

- [ ] **Step 3: Criar as seções e a galeria**

Desktop usa grade editorial. Em até 780 px, a galeria passa para uma coluna; em até 680 px:

```css
.gallery figure { min-height: 0; aspect-ratio: 4 / 3; }
.gallery figure:nth-child(2) { transform: none; }
```

- [ ] **Step 4: Garantir foco e contraste**

Botões com branco sobre `#c91f25`; marcadores escuros com vermelho claro suficiente. Campos:

```css
.field input:focus-visible,
.field select:focus-visible,
.field textarea:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 0;
  box-shadow: 0 0 0 6px var(--red-dark);
}
```

Nunca usar `transition: all`; respeitar `prefers-reduced-motion`.

- [ ] **Step 5: Verificar GREEN parcial**

Run: `npm test`

Expected: contratos de estilo, contraste, galeria e menu passam.

- [ ] **Step 6: Commit**

```powershell
git add styles.css
git commit -m "feat: apply institutional limpeza visual system"
```

---

### Task 7: Implementar formulário, eventos e consentimento

**Files:**
- Create: `script.js`
- Modify: `scripts/contracts.test.mjs`

- [ ] **Step 1: Escrever testes de regressão**

Exigir popup detectável, foco acessível, armazenamento defensivo e payloads sem PII:

```js
assert.match(script, /window\.open\(\s*['"]['"]\s*,\s*['"]_blank['"]\s*\)/);
assert.match(script, /popup\.opener\s*=\s*null/);
assert.match(script, /popup\.location\.href\s*=\s*url/);
assert.doesNotMatch(trackedPayload, /\b(nome|telefone|email|assunto|mensagem)\s*:/i);
```

- [ ] **Step 2: Confirmar RED**

Run: `npm test`

Expected: FAIL porque os fluxos ainda não existem.

- [ ] **Step 3: Implementar formulário**

Validar nome, telefone com pelo menos 10 dígitos, assunto e mensagem; validar e-mail somente quando preenchido. Construir URL com `encodeURIComponent`, registrar `form_submitted` com `form_name: "limpeza_orcamento"` e abrir:

```js
const popup = window.open('', '_blank');
if (popup) {
  popup.opener = null;
  popup.location.href = url;
} else {
  // status acessível, fallback e popup_blocked sem PII
}
```

- [ ] **Step 4: Implementar consentimento**

Persistir `granted` ou `denied` em `verticalchao_consent`. Atualizar os quatro sinais, não roubar foco na primeira visita e devolver foco ao controle que reabriu o banner.

- [ ] **Step 5: Implementar eventos**

`cta_clicked` envia somente `cta_text`, `cta_location` e `contact_method`. `form_submitted`, `popup_blocked` e `consent_updated` usam apenas metadados de interface.

- [ ] **Step 6: Confirmar GREEN**

Run: `npm run check`

Expected: todos os contratos, build, validação e links passam.

- [ ] **Step 7: Commit**

```powershell
git add script.js scripts/contracts.test.mjs
git commit -m "feat: add limpeza form consent and events"
```

---

### Task 8: Empacotar, revisar e executar QA local

**Files:**
- Create: `README.md`
- Create: `_headers`
- Create: `_redirects`
- Create: `docs/quality/anti-ai-report.md`
- Create: `docs/quality/text-editor-analysis.json`
- Create: `docs/quality/text-editor-report.html`
- Create: `docs/quality/qa-report.md`
- Create: `docs/quality/qa-summary.json`
- Modify: `build.json`

- [ ] **Step 1: Documentar o pacote**

README deve registrar `npm run check`, build `npm run build`, saída `public`, branch `main`, nomes GitHub/Pages, contatos, tracking e troca de canonical após o domínio personalizado.

- [ ] **Step 2: Configurar headers e recuperação**

`_headers`:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), geolocation=(), microphone=()

/assets/*
  Cache-Control: public, max-age=86400, must-revalidate
```

`_redirects`: `/* /index.html 200`.

- [ ] **Step 3: Rodar verificação fresca**

Run:

```powershell
npm run check
git diff --check
```

Expected: exit 0 e 0 falhas.

- [ ] **Step 4: Rodar Playwright**

Em 390×844, 375×667, 768×900 e 1280×900, coletar overflow, menu, H1, imagens, galeria, alvos, erros de console e falhas locais. Mobile 390 deve produzir `[273, 273, 273]` ou três alturas entre 240 e 290 px; CTA deve estar no primeiro fold em 375×667.

- [ ] **Step 5: Testar comportamento**

Validar formulário vazio, e-mail inválido, popup permitido, popup bloqueado, aceitar consentimento, reabrir, recusar e reload. Confirmar `GTM-M7GS29F`, nenhum ID extra e nenhum dado pessoal no `dataLayer`.

- [ ] **Step 6: Rodar design review e corrigir achados**

Comparar visualmente com a página institucional e a landing Ecogranito. Corrigir todos os achados Critical/High e os Medium que prejudiquem clareza, acessibilidade ou mobile. Repetir QA depois das correções.

- [ ] **Step 7: Registrar evidências**

Copiar relatórios de copy para `docs/quality/`; salvar screenshots e `qa-summary.json` em `lp/qa/`; atualizar `build.json` com métricas reais. Copiar `dist/` para `lp/build/`.

- [ ] **Step 8: Commit**

```powershell
git add README.md _headers _redirects docs/quality build.json public
git commit -m "docs: complete limpeza deployment handoff"
```

---

### Task 9: Revisar, integrar e publicar via GitHub

**Files:**
- Merge: `feature/limpeza-build` into `main`

- [ ] **Step 1: Solicitar revisão final independente**

Revisar o diff desde `f634001`, corrigir todos os achados Critical/Important e repetir `npm run check`.

- [ ] **Step 2: Integrar por fast-forward**

```powershell
git switch main
git merge --ff-only feature/limpeza-build
npm run check
```

Expected: merge e testes com exit 0.

- [ ] **Step 3: Criar o GitHub público**

```powershell
gh repo create trafegocomprado/limpezadefachadas-verticalchao --public --source . --remote origin --push --description "Landing page de limpeza de fachadas da Vertical Chão"
```

Expected: `main` publicada no novo repositório.

- [ ] **Step 4: Criar Pages com fonte GitHub**

Usar a API oficial de Pages, autenticada pelo token vigente do Wrangler, para criar `limpezadefachadas-verticalchao` com:

```json
{
  "production_branch": "main",
  "build_config": {
    "build_command": "npm run build",
    "destination_dir": "public",
    "root_dir": ""
  },
  "source": {
    "type": "github",
    "config": {
      "owner": "trafegocomprado",
      "repo_name": "limpezadefachadas-verticalchao",
      "production_branch": "main",
      "production_deployments_enabled": true,
      "preview_deployment_setting": "all"
    }
  }
}
```

- [ ] **Step 5: Disparar e acompanhar o build**

Fazer push de `main`, listar deployments com `npx wrangler pages deployment list --project-name limpezadefachadas-verticalchao` e confirmar `latest_stage.status: success` pela API.

- [ ] **Step 6: Verificar produção**

Confirmar HTTP 200, assets, sitemap, contatos, ausência do telefone removido/Edvaldo/menu móvel, tracking único, galeria, formulário e consentimento em `https://limpezadefachadas-verticalchao.pages.dev/`.

- [ ] **Step 7: Rodar Lighthouse mobile**

Meta: performance ≥90; acessibilidade, boas práticas e SEO ≥95. Corrigir contraste ou regressões e repetir a auditoria se necessário.

- [ ] **Step 8: Encerrar a branch**

Após produção associada ao commit final, seguir `superpowers:finishing-a-development-branch`: remover o worktree isolado e apagar a branch já integrada.
