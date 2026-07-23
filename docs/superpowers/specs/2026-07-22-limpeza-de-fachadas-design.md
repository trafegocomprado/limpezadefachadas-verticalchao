# Limpeza de fachadas Vertical Chão — especificação de design

## Objetivo

Reconstruir a landing page de limpeza de fachadas e vidros da Vertical Chão como um site estático, leve e publicável no Cloudflare Pages. A nova versão deve preservar os ativos e informações legítimas da página original, adotar o sistema visual institucional já aprovado e repetir o padrão técnico da landing page de Ecogranito.

## Contrato de referências

Status: `valid`

| Responsabilidade | URL | Uso autorizado |
| --- | --- | --- |
| Conteúdo, imagens, depoimentos, funcionalidades e tracking | https://limpezadefachadas.verticalchao.com.br/ | Fonte primária do serviço e única fonte dos IDs de tracking |
| Sistema visual | https://verticalchao-institucional.pages.dev/ | Paleta, tipografia, hero, cabeçalho e ritmo editorial |
| Padrão técnico aprovado | https://ecogranito-verticalchao.pages.dev/ | Formulário, consentimento, responsividade, galeria compacta, acessibilidade e pacote de deploy |

O tracking não será herdado das outras landing pages. A auditoria da origem encontrou somente o Google Tag Manager `GTM-M7GS29F`. Nenhum ID direto de GA4 ou Google Ads será inventado ou reaproveitado.

## Abordagem aprovada

Modernização fiel com a mesma arquitetura visual da página Ecogranito. Preservar fotos e depoimentos oficiais, reduzir a galeria para três imagens representativas e substituir contadores quebrados ou alegações sem comprovação por informações verificáveis sobre o serviço.

## Arquitetura

Site estático em HTML, CSS e JavaScript, com build determinístico para `dist/` e pacote de produção em `public/`. O repositório e o projeto Pages usarão o nome `limpezadefachadas-verticalchao`.

## Sistema visual

- Base grafite, vermelho institucional e superfícies claras em papel quente.
- Outfit nos títulos e Poppins no texto, servidas localmente.
- Hero fotográfico de largura total com sobreposição escura e CTA visível no primeiro fold.
- Cabeçalho transparente sobre o hero e sólido após rolagem.
- Navegação desktop enxuta. No mobile, somente a marca; nenhum menu sanduíche ou substituto.
- Galeria sem carrossel ou lightbox. Em telas de até 680 px, três imagens em proporção 4:3, com altura aproximada entre 240 e 290 px para viewport de 390 px.
- Movimento limitado a feedback funcional e compatível com `prefers-reduced-motion`.
- Contraste de texto, botões e indicadores de foco em conformidade com WCAG AA.

## Estrutura de conteúdo

1. Hero: limpeza profissional de fachadas e vidros para condomínios e empresas, com CTA de avaliação e telefone comercial.
2. Faixa de sinais: vistoria, definição do método, trabalho em altura e cuidado com o entorno; sem contadores numéricos.
3. Contexto do serviço: explicar que material, estado da superfície, acesso e tipo de sujeira orientam o escopo.
4. Processo: vistoria, planejamento e proteções, execução e inspeção final.
5. Galeria: três imagens oficiais da página original, selecionadas para mostrar execução e resultado sem deixar o mobile excessivamente alto.
6. Depoimentos: preservar autoria e teor dos relatos originais. Os depoimentos gerais devem ser apresentados como experiência com a empresa; os relatos específicos de limpeza podem ser identificados como tal.
7. Serviços relacionados: reposição de pastilhas, pintura de fachadas e aplicação de Ecogranito.
8. Orçamento: formulário acessível que monta uma mensagem e abre o WhatsApp comercial.
9. Rodapé: dados institucionais, contatos, atalhos e controle para rever preferências de cookies.

## Copy e legibilidade

A copy será finalizada antes da build e passará, nesta ordem, por:

1. `anti-ai-writing`, preservando a arquitetura de conversão e removendo fórmulas, superlativos vazios, abstrações e ritmo uniforme.
2. `text-editor-br` em modo `lp`, com diagnóstico de frases longas, voz passiva, gerundismo, nominalização, ecos e Flesch PT-BR.
3. Nova checagem anti-AI para impedir que as correções de legibilidade introduzam maneirismos artificiais.

Não criar números, prazos, garantias, certificações, resultados ou características químicas que não estejam sustentados pela origem. A copy final e os relatórios serão salvos em `analysis/` e copiados para `docs/quality/` no pacote do repositório.

## Contatos

- Comercial, cabeçalho, CTAs, formulário e widget: `(31) 99684-8477`.
- Ligação comercial: `tel:+5531996848477`.
- WhatsApp comercial: `https://api.whatsapp.com/send?phone=5531996848477&text=Ol%C3%A1,%20preciso%20de%20um%20atendimento!`.
- Segundo telefone, somente no rodapé: `(31) 98712-2106`, `tel:+5531987122106`.
- Remover `(31) 99471-1393`, `5531994711393` e qualquer card do Edvaldo.

## Tracking e privacidade

- Preservar somente o container encontrado na origem: `GTM-M7GS29F`.
- Carregar o GTM uma única vez e manter uma única versão `noscript`.
- Não configurar IDs diretos de GA4 ou Google Ads que não estejam presentes na origem.
- Consent Mode v2 com `analytics_storage`, `ad_storage`, `ad_user_data` e `ad_personalization` negados por padrão.
- Banner acessível para aceitar ou recusar e controle no rodapé para rever a escolha.
- Eventos próprios: `cta_clicked`, `form_submitted`, `popup_blocked` e `consent_updated`.
- Nunca enviar nome, telefone, e-mail, assunto ou mensagem ao `dataLayer`.

## Formulário

Campos: nome, telefone, e-mail opcional, assunto e mensagem. Validar no cliente, exibir mensagens próximas aos campos, marcar `aria-invalid` e mover o foco ao primeiro erro. Em envio válido, abrir uma aba detectável, zerar `opener`, navegar para o WhatsApp `5531996848477` e manter fallback caso o navegador bloqueie a janela.

## SEO e metadados

- Um único `h1` descritivo.
- Title, description, canonical, Open Graph e JSON-LD coerentes com limpeza de fachadas e vidros.
- Canonical inicial: `https://limpezadefachadas-verticalchao.pages.dev/`.
- Logo, favicon e imagens com dimensões declaradas, textos alternativos e carregamento adequado.
- `robots.txt` e `sitemap.xml` coerentes com a URL inicial.
- O README deve orientar a troca das URLs após a configuração do domínio personalizado.

## Tratamento de falhas

- Build deve falhar se algum ativo local obrigatório estiver ausente.
- Validação deve falhar se aparecerem telefones removidos, Edvaldo, menu móvel, tracking divergente, loader duplicado ou dados pessoais nos eventos.
- Se o WhatsApp for bloqueado, o formulário deve apresentar status e link de continuidade.
- Acesso ao `localStorage` deve ser protegido contra exceções.
- O Pages deve devolver a página principal como recuperação para rotas desconhecidas.

## Testes e critérios de aceite

- Contratos automatizados para contatos, tracking, links, SEO, sitemap, consentimento e conteúdo proibido.
- Build, validação e `git diff --check` sem erros.
- Playwright em 390×844, 375×667, 768×900 e 1280×900.
- Em 390 px: nenhum overflow, nenhum menu sanduíche, três imagens compactas e alvos interativos com pelo menos 24 px.
- CTA principal visível no primeiro fold em 375×667.
- Navegação por teclado, skip link, foco, contraste, validação, consentimento e retorno de foco testados.
- Formulário abre o número correto e eventos próprios não recebem dados pessoais.
- Produção sem imagens quebradas, erros de console ou falhas em ativos locais.
- Lighthouse mobile com metas mínimas de 90 para performance e 95 para acessibilidade, boas práticas e SEO.
- HTTP 200 e deployment de produção associado ao commit final da branch `main`.

## Publicação

Criar o repositório público `trafegocomprado/limpezadefachadas-verticalchao`, enviar `main`, criar o projeto Cloudflare Pages `limpezadefachadas-verticalchao` com integração GitHub e publicar `public/` após executar `npm run build`. A personalização do domínio fica fora do escopo, conforme solicitado pelo usuário.
