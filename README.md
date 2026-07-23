# Limpeza de Fachadas — Vertical Chão

Landing page estática da Vertical Chão para serviços de limpeza de fachadas e vidros. O projeto usa HTML, CSS e JavaScript sem framework e está preparado para publicação no Cloudflare Pages com integração ao GitHub.

## Verificação e build

Requisito: Node.js 20 ou mais recente.

```powershell
npm run check
npm run build
```

`npm run check` executa os contratos automatizados, gera o pacote e valida a estrutura e os links locais. O build publicado pelo Cloudflare Pages fica em `public/`; `dist/` inclui também os metadados de build usados no handoff.

## Publicação

- Repositório: `trafegocomprado/limpezadefachadas-verticalchao`
- Branch de produção: `main`
- Projeto Cloudflare Pages: `limpezadefachadas-verticalchao`
- Comando de build: `npm run build`
- Diretório de saída: `public`

O domínio inicial e canonical são `https://limpezadefachadas-verticalchao.pages.dev/`. Depois que o domínio personalizado for configurado, atualize `canonical`, `og:url`, `robots.txt`, `sitemap.xml` e as URLs correspondentes em `build.json`.

## Contatos e tracking

- Comercial: `(31) 99684-8477`
- Telefone secundário do rodapé: `(31) 98712-2106`
- WhatsApp comercial: `https://api.whatsapp.com/send?phone=5531996848477&text=Ol%C3%A1,%20preciso%20de%20um%20atendimento!`
- Google Tag Manager: `GTM-M7GS29F`

O Consent Mode v2 começa negado e pode ser revisto pelo visitante. Os eventos próprios enviam somente metadados de interface, sem nome, telefone, e-mail, assunto ou mensagem.

## Estrutura principal

- `index.html`: conteúdo, SEO, JSON-LD e bootstrap do GTM
- `styles.css`: sistema visual institucional e responsividade
- `script.js`: formulário, consentimento e eventos
- `assets/`: imagens, ícones e fontes locais
- `docs/quality/`: relatórios de copy e QA
- `public/`: pacote de produção para o Cloudflare Pages
