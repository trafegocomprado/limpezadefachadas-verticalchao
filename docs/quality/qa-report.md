# Relatório de QA local

Data: 23 de julho de 2026.

## Resultado

Pronto para a etapa de publicação. A auditoria local terminou com health score 100/100, 26 contratos aprovados e nenhuma falha de build, validação ou link local.

- 390 × 844: sem overflow, menu sanduíche, alvo abaixo de 24 px, imagem quebrada, erro de console ou falha local. A galeria mediu 273 px nas três imagens.
- 375 × 667: o CTA principal ficou entre 479,4 e 527,4 px, dentro do primeiro fold. A captura de viewport confirma o botão inteiro.
- 768 × 900 e 1280 × 900: sem overflow, imagem quebrada, erro de console ou falha local.
- Formulário vazio: quatro campos marcados e foco em `nome`.
- E-mail inválido: mensagem próxima ao campo e foco em `email`.
- Popup permitido: abertura com `("", "_blank")`, `opener` limpo e destino no WhatsApp `5531996848477`.
- Popup bloqueado: status anunciado e link de recuperação visível.
- Consentimento: primeira visita sem roubo de foco; aceitar, reabrir, recusar, devolver foco e persistir após reload aprovados.
- Tracking: somente `GTM-M7GS29F`. Os quatro eventos próprios usam a lista aprovada de metadados e não levam dados pessoais.
- Acessibilidade: skip link no primeiro Tab, destino em `main#conteudo`, foco de campo com anel branco e vermelho, botões nomeados e imagens com atributo `alt`.
- Simulações de protanopia, deuteranopia, tritanopia e escala de cinza mantiveram leitura e hierarquia.

O `gtm.uniqueEventId` observado no navegador é acrescentado pelo próprio Google Tag Manager depois do `dataLayer.push`. Ele foi identificado separadamente e não faz parte do payload emitido pelo site.

## Design review

Classificação: landing page de marketing.

- Design Score: A
- AI Slop Score: A
- Accessibility Score: 100/100
- Error State Score: A
- Achados Critical, High ou Medium: 0

O primeiro viewport funciona como uma composição única: marca, serviço, contexto e ações comerciais aparecem sobre a foto oficial. O vermelho e o grafite mantêm a identidade já aprovada. No mobile, a navegação desaparece sem substituto e a galeria usa três quadros 4:3. As seções têm funções distintas e o ritmo alterna superfícies claras e escuras sem cair em grade genérica de SaaS.

### Litmus

1. Marca e serviço inequívocos no primeiro viewport: sim.
2. Âncora visual forte: sim, hero fotográfico de largura total.
3. Página compreensível pela leitura dos títulos: sim.
4. Uma função por seção: sim.
5. Cards usados como unidades de conteúdo: sim.
6. Movimento melhora feedback e hierarquia: sim, de forma contida e com redução de movimento.
7. O design continua sólido sem sombras decorativas: sim.

Nenhum critério de rejeição foi encontrado. A página não usa carrossel, menu móvel, hero em card, gradiente roxo, ícones em círculos ou grade de três recursos como primeira impressão.

## Produção

A publicação Git-integrada foi validada em `https://limpezadefachadas-verticalchao.pages.dev/`. A URL, o logo, `robots.txt` e `sitemap.xml` responderam corretamente. A página publicada manteve os telefones aprovados, três figuras, ausência de menu sanduíche, Consent Mode revisável e eventos próprios sem dados pessoais.

No navegador mobile em 390 × 844, não houve overflow, erro de console ou falha de recurso local. A galeria mediu 273 px nas três imagens, e o CTA principal ficou entre 484 e 532 px.

O Lighthouse foi executado com perfil mobile na URL de produção:

- Performance: 100
- Acessibilidade: 100
- Boas práticas: 100
- SEO: 100
- LCP: 1.773 ms
- CLS: 0,000108
- TBT: 38,5 ms

O container `GTM-M7GS29F` carregou em produção. A conta de Google Ads configurada dentro do próprio container também foi observada no DOM renderizado, sem inclusão de um ID direto no código-fonte.

## Próximo ajuste operacional

Quando o domínio personalizado entrar, trocar canonical, Open Graph, `robots.txt` e `sitemap.xml` para a URL definitiva.

## Evidências

As dez capturas e o resumo estruturado estão em `outputs/limpezadefachadas-verticalchao/lp/qa/`. O arquivo `qa-summary.json` contém as medidas dos quatro viewports e os resultados de formulário, consentimento, tracking, teclado e design.

PR summary: QA encontrou 0 problemas de entrega e exigiu 0 correções visuais. Health score 100 → 100; Design Score A → A; AI Slop Score A → A.
