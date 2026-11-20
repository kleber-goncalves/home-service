# Home Service — Conecta Local

Plataforma regional para aproximar pessoas que procuram serviços de profissionais autônomos e pequenos empreendedores.

O projeto tem finalidade acadêmica e busca demonstrar investigação de problemas, levantamento de requisitos, desenvolvimento web, modelagem, segurança e testes.

**Contexto acadêmico:** o Conecta Local está sendo desenvolvido no âmbito de um curso Técnico em Informática. Ele não é o Projeto Integrador do curso de Análise e Desenvolvimento de Sistemas da Uniube.

## Estado atual — 20/11/2026

A branch `dev` contém a demonstração acadêmica funcional do Conecta Local. As integrações mais recentes concluíram três frentes importantes:

- **PR #22 — autorização e integridade:** identidade, papel e propriedade de serviços são validados no Apps Script; testes automatizados e ensaios manuais de acesso cruzado e papel não profissional foram aprovados.
- **PR #23 — ciclo de vida dos serviços:** edição dos próprios serviços e remoção lógica, mantendo o histórico em `SERVICOS` e registrando eventos em `AUDITORIA`. O responsável confirmou os testes manuais no Preview atualizado.
- **PR #25 — cobertura por cidades:** um serviço pode atender vários municípios por meio da aba `SERVICO_CIDADES`. O responsável confirmou a sincronização/publicação do Apps Script e testou edição, persistência no Sheets e pesquisa pública do mesmo serviço nas duas cidades.

A **validação funcional principal da Etapa 3** foi concluída em 20/11/2026. A segunda cidade usada no ensaio foi temporária e foi removida depois dos testes; a planilha voltou a manter apenas a cidade original. Esses resultados refletem os testes relatados pelo responsável, além das evidências automatizadas disponíveis. Eles não equivalem a auditoria independente, teste de carga ou aprovação para produção.

A PR #25 foi integrada exclusivamente em `dev` pelo merge commit `5003604a51def9bdf58df9845d36c2ec75a4452e`. A CI do merge [#44820409487](https://github.com/kleber-goncalves/home-service/actions/runs/44820409487) concluiu **SUCCESS**. A atualização documental de 20/11 também passou na execução [#44825394280](https://github.com/kleber-goncalves/home-service/actions/runs/44825394280). O Preview fixo de `dev` está disponível em:

- **Preview:** https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app/
- **Deployment verificado:** `dpl_HxMw5f9zyTKFYbj9We6YbguNX58v`, estado `READY`.

**Production (`main`) permanece inalterada** no commit `49354a46863d5a5eb36ce32e450b975d4087fe3b`. O gateway bloqueia operações de negócio fora de Vercel Preview; não habilitar variáveis de backend em Production nesta etapa.

O projeto é acadêmico, usa somente dados fictícios e não deve receber credenciais ou dados pessoais reais. Não é serviço comercial, marketplace transacional ou aplicação aprovada para produção.

- **Repositório:** https://github.com/kleber-goncalves/home-service
- **Frontend:** React, JavaScript/JSX, Vite 8 e Tailwind CSS 4.
- **Gateway HTTP:** Vercel Function em `api/app.js`, com regras em `server/app-gateway.js`.
- **Backend de negócio:** Google Apps Script em `apps-script/conecta-local/Code.gs`.
- **Persistência operacional atual:** Google Sheets nas abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES` e `AUDITORIA`.
- **Orientação a objetos:** classes `Usuario`, `Profissional` e `Servico` em `server/domain-entities.js`.
- **POC-04:** integrada à `dev` pela PR #14 como experimento independente de sessão sintética. Permanece desabilitada e não integra a autenticação principal. Os recursos temporários foram limpos; os limites de hardening e a decisão de não reativação estão documentados em `docs/POC_04_SESSOES.md`.

**Limitações conhecidas da demonstração:** envio real de e-mail, recuperação/alteração de senha e e-mail, upload de imagens no Google Drive, painel administrativo, denúncias/moderação e gestão administrativa de categorias/cidades ainda não foram implementados. Pesquisa local com moradores e profissionais também continua pendente; os indicadores documentais não substituem dados primários de Capelinha.

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
