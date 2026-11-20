# Home Service — Conecta Local

Plataforma regional para aproximar pessoas que procuram serviços de profissionais autônomos e pequenos empreendedores.

O projeto tem finalidade acadêmica e busca demonstrar investigação de problemas, levantamento de requisitos, desenvolvimento web, modelagem, segurança e testes.

## Estado atual — 20/11/2026

A branch `dev` contém a demonstração acadêmica funcional do Conecta Local. O PR #15 integrou cadastro, confirmação demonstrativa por código, login, sessão, atualização de perfil, criação de serviços, pausa/publicação e consulta pública com persistência no Google Sheets. Os PRs #16 (orientação a objetos), #17 (preservação dos serviços de exemplo) e #18 (relatório integrador) também foram integrados.

O PR #19 sincronizou o núcleo do protótipo de `dev` com `main`; a PR #20 atualizou documentação em `dev`. Em 20/11/2026, a PR #14 foi integrada a `dev` pelo merge commit `adb51e2f1de8b9d47fb59205938b3e33e21739a1`. Ela adiciona a POC-04 de sessão sintética como rota independente, mas **não a conecta ao login principal e permanece desabilitada**. `main` permanece em `49354a46863d5a5eb36ce32e450b975d4087fe3b`; o head corrente de `dev` pode ser consultado diretamente no GitHub.

**Validação funcional:** em 20/11/2026, após as integrações de #16, #17 e #14, o responsável informou ter repetido os testes do fluxo principal no Preview atualizado de `dev` e confirmou que a demonstração está funcionando. Os testes usam dados fictícios. A verificação adversarial específica de autorização entre dois profissionais continua como uma etapa técnica separada no roteiro.

**Ambientes**
- **Preview de `dev`:** ambiente destinado ao desenvolvimento e à demonstração funcional; contém as configurações privadas do backend com escopo Preview.
- **Production (`main`):** vitrine pública. O gateway bloqueia operações de negócio fora de Vercel Preview; não habilitar variáveis de backend em Production nesta etapa.

O projeto é acadêmico, usa somente dados fictícios e não deve receber credenciais ou dados pessoais reais. Não é serviço comercial, marketplace transacional ou aplicação aprovada para produção.

- **Repositório:** https://github.com/kleber-goncalves/home-service
- **Preview de demonstração:** https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app
- **Production (vitrine):** https://home-service-blush.vercel.app/
- **Frontend:** React, JavaScript/JSX, Vite 8 e Tailwind CSS 4.
- **Gateway HTTP:** Vercel Function em `api/app.js`, com regras em `server/app-gateway.js`.
- **Backend de negócio:** Google Apps Script em `apps-script/conecta-local/Code.gs`.
- **Persistência operacional atual:** Google Sheets nas abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS` e `AUDITORIA`.
- **Orientação a objetos:** classes `Usuario`, `Profissional` e `Servico` em `server/domain-entities.js`, integradas pelo PR #16.
- **POC-04:** integrada à `dev` pela PR #14 em 20/11/2026, como experimento independente de sessão sintética. O armazenamento temporário, nonces, segredo Apps Script e variáveis Vercel exclusivas foram limpos; a rota permanece desabilitada. Dois itens de hardening continuam bloqueando qualquer reativação: leitura limitada por stream e controles de rate limiting/capacidade. A POC não integra a autenticação principal e não deve ser ativada para a demonstração atual.

**Limitações conhecidas da demonstração:** recuperação e alteração de senha/e-mail, edição e remoção de serviços, upload de imagens no Google Drive, painel administrativo, denúncias/moderação e gestão administrativa de categorias/cidades ainda não estão implementados. A modelagem aprovada prevê 12 abas; o backend atual utiliza operacionalmente as oito listadas acima.

## Executar localmente

Recomendado: Node.js 24.

```bash
npm ci
npm run dev
```

## Validações

```bash
npm run lint
npm run check:occurrences
npm run build
npm audit --audit-level=high
```

O GitHub Actions executa essas verificações em pushes e Pull Requests direcionados às branches `main` e `dev`. O workflow de sincronização atualiza automaticamente a seção gerada de `docs/AI_CONTEXT.md`.

## Documentação

- [Contexto técnico para IAs e desenvolvedores](docs/AI_CONTEXT.md)
- [Roteiro de evolução acadêmica e prioridades](docs/ROADMAP_ESTUDOS.md)
- [Ativar o protótipo funcional com Google Sheets](docs/ATIVAR-PROTOTIPO-GOOGLE-SHEETS.md)
- [Fluxo da área do profissional](docs/PROTOTIPO_DEMO_LOCAL.md)
- [Especificação funcional do MVP (em revisão)](docs/ESPECIFICACAO_MVP.md)
- [Modelagem lógica e física dos dados](docs/MODELAGEM_DADOS.md)
- [Arquitetura de integração Vercel Functions + Apps Script](docs/ARQUITETURA_APPS_SCRIPT.md)
- [POC-01 — Comunicação React, Vercel Functions e Apps Script](docs/POC_01_COMUNICACAO.md)
- [POC-02 — HMAC e proteção contra replay](docs/POC_02_ASSINATURA_GATEWAY.md)
- [POC-03 — Investigação de armazenamento de senhas](docs/POC_03_ARMAZENAMENTO_SENHAS.md)
- [POC-04 — Sessão sintética via cookie](docs/POC_04_SESSOES.md)
- [Orientação a objetos no backend](docs/LOO_ORIENTACAO_OBJETOS.md)
- [Relatório integrador acadêmico](docs/PROJETO_INTEGRADOR_CONECTA_LOCAL.md)
- [Registro público de ocorrências](docs/REGISTRO_DE_OCORRENCIAS.md)

A POC-04 foi integrada à branch `dev` pela PR #14, mas permanece isolada e desabilitada. Não integra o fluxo de autenticação principal; consulte [POC-04 — Sessão sintética via cookie](docs/POC_04_SESSOES.md) para os limites e a decisão de não reativação.

## Créditos das imagens

As fotografias são gratuitas no Pexels e aparecem apenas como exemplos visuais. Não representam profissionais cadastrados no Conecta Local.

- Eletricista — Pexels, imagem 27928762.
- Encanador — [Bulat843 / Pexels](https://www.pexels.com/photo/plumber-repairing-pipe-with-wrench-indoors-32588548/).
- Limpeza residencial — [Helena Lopes / Pexels](https://www.pexels.com/photo/woman-cleaning-a-living-room-27176671/).
- Pintura — [Tima Miroshnichenko / Pexels](https://www.pexels.com/photo/man-painting-the-wall-6474471/).
- Jardinagem — [Helena Lopes / Pexels](https://www.pexels.com/photo/gardener-hands-over-plants-on-ground-27176054/).

## Princípios do projeto

- Priorizar as necessidades reais de profissionais e clientes da região.
- Manter o escopo proporcional ao prazo acadêmico.
- Separar funcionalidades implementadas, decisões vigentes e ideias futuras.
- Não publicar credenciais, dados pessoais ou evidências sensíveis.
- Validar operações e permissões no lado confiável do sistema, não apenas na interface.
