# Home Service — Conecta Local

Plataforma regional para aproximar pessoas que procuram serviços de profissionais autônomos e pequenos empreendedores.

O projeto tem finalidade acadêmica e busca demonstrar investigação de problemas, levantamento de requisitos, desenvolvimento web, modelagem, segurança e testes.

**Contexto acadêmico:** o Conecta Local está sendo desenvolvido no âmbito de um curso Técnico em Informática. Ele não é o Projeto Integrador do curso de Análise e Desenvolvimento de Sistemas da Uniube.

## Estado atual — 24/11/2026

A branch `dev` contém a demonstração acadêmica funcional do Conecta Local. As principais entregas integradas incluem:

- **PR #22 — autorização e integridade:** identidade, papel e propriedade de serviços são validados no Apps Script; testes automatizados e ensaios manuais foram aprovados.
- **PR #23 — ciclo de vida dos serviços:** edição dos próprios serviços e remoção lógica, com histórico em `SERVICOS` e eventos em `AUDITORIA`.
- **PR #25 — cobertura por cidades:** um serviço pode atender vários municípios por meio de `SERVICO_CIDADES`; a persistência e a pesquisa pública foram validadas no Preview.
- **PR #26 — imagens de serviços:** upload retomável, até cinco imagens por serviço, remoção lógica e permissões por estado integrados e validados com Apps Script, Sheets e Drive de teste.
- **PRs #28 e #29 — catálogo público:** homepage, catálogo `/servicos`, categorias `/categorias`, detalhes `/servicos/:serviceId`, galeria e entrega segura de imagens pela rota same-origin.
- **PR #32 — edição do perfil:** alteração dos dados permitidos do profissional, com autorização no backend.
- **PR #33 — foto de perfil:** upload, substituição, remoção e entrega por gateway, com arquivo privado no Drive.
- **PR #34 — alteração de e-mail:** reautenticação, confirmação demonstrativa e revogação das sessões antigas. O fluxo não envia e-mail real.

**Estado operacional verificado em 24/11/2026:**

- Branch de integração: `dev`, commit `d16278c5b6df6df370645b18a05dfb5ea0effe08`.
- Preview: [abrir demonstração](https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app/).
- Deployment Vercel: `dpl_AfNaMm1WqRFJa3jhhwXhfkgwPUTv`, estado `READY`, associado ao commit atual de `dev`.
- Production (`main`) permanece no commit `49354a46863d5a5eb36ce32e450b975d4087fe3b`; não foi alterada nesta etapa.

**Próxima frente aprovada: redesign visual e de experiência da interface.** O responsável considera que a interface atual está funcional, mas visualmente genérica. O próximo trabalho será revisar a identidade visual, hierarquia, tipografia, composição, cartões, navegação e consistência entre as páginas públicas e a área do profissional. O escopo e a ordem estão em [Plano de redesign da interface](docs/PLANO_REDESIGN_INTERFACE.md). A direção visual ainda deverá ser definida antes de alterações de código; não foram escolhidas cores, fontes ou referências definitivas.

O catálogo está funcionalmente integrado e a entrega de imagens foi validada manualmente no Preview. A revisão visual ampla das páginas e a confirmação de todos os critérios de navegação/responsividade permanecem como trabalho da próxima frente, sem presumir que cada item tenha sido testado manualmente.

O projeto é acadêmico, usa somente dados fictícios e não deve receber credenciais ou dados pessoais reais. Não é serviço comercial, marketplace transacional ou aplicação aprovada para produção.

- **Repositório:** https://github.com/kleber-goncalves/home-service
- **Frontend:** React, JavaScript/JSX, Vite 8 e Tailwind CSS 4.
- **Gateway HTTP:** Vercel Function em `api/app.js`, com regras em `server/app-gateway.js`.
- **Backend de negócio:** Google Apps Script em `apps-script/conecta-local/Code.gs`.
- **Persistência operacional atual:** Google Sheets nas abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES`, `IMAGENS` e `AUDITORIA`.
- **Orientação a objetos:** classes `Usuario`, `Profissional` e `Servico` em `server/domain-entities.js`.
- **POC-04:** integrada à `dev` pela PR #14 como experimento independente de sessão sintética. Permanece desabilitada e não integra a autenticação principal; seus limites estão documentados em `docs/POC_04_SESSOES.md`.

**Limitações conhecidas da demonstração:** não há envio real de e-mail, recuperação de senha, painel administrativo funcional, fluxo de denúncias/moderação ou gestão administrativa de categorias e cidades. O fluxo de alteração de e-mail é demonstrativo e não envia mensagens. A pesquisa com moradores e profissionais continua pendente de orientação do professor/orientador. O gerenciamento de imagens e as demais funcionalidades integradas em `dev` permanecem fora de `main`/Production, que continuam sem backend habilitado.

## Executar localmente

Recomendado: Node.js 24.

```bash
npm ci
npm run dev
```

## Validações

```bash
npm run test:authorization
npm run lint
npm run check:occurrences
npm run build
npm audit --audit-level=high
```

O GitHub Actions executa essas verificações em pushes e Pull Requests direcionados às branches `main` e `dev`. O workflow de sincronização atualiza automaticamente a seção gerada de `docs/AI_CONTEXT.md`.

## Documentação

- [Contexto técnico para IAs e desenvolvedores](docs/AI_CONTEXT.md)
- [Roteiro de evolução acadêmica e prioridades](docs/ROADMAP_ESTUDOS.md)
- [Etapa 4 — arquitetura de imagens no Google Drive](docs/ETAPA_4_IMAGENS_DRIVE.md)
- [Plano — catálogo público, navegação e apresentação de imagens](docs/PLANO_CATALOGO_PUBLICO_E_NAVEGACAO.md)
- [Plano de redesign visual e de experiência da interface](docs/PLANO_REDESIGN_INTERFACE.md)
- [Questionários preliminares para moradores e profissionais](PESQUISA_COMUNIDADE.md)
- [Guia de aplicação da pesquisa com a comunidade](docs/GUIA_APLICACAO_PESQUISA_COMUNIDADE.md)
- [Roteiro detalhado de pesquisa exploratória](docs/ROTEIRO_PESQUISA_EXPLORATORIA.md)
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
