# Home Service — Conecta Local

Plataforma regional para aproximar pessoas que procuram serviços de profissionais autônomos e pequenos empreendedores.

O projeto tem finalidade acadêmica e busca demonstrar investigação de problemas, levantamento de requisitos, desenvolvimento web, modelagem, segurança e testes.

## Estado atual

O repositório foi iniciado com React + Vite e está publicado na Vercel. A aplicação ainda está na etapa de fundação; as funcionalidades do Conecta Local permanecem planejadas até serem implementadas e validadas.

- **Repositório:** https://github.com/kleber-goncalves/home-service
- **Deploy:** https://home-service-blush.vercel.app/
- **Frontend:** React, JavaScript e Vite.
- **Backend planejado:** Google Apps Script.
- **Dados planejados:** Google Sheets.
- **Imagens planejadas:** Google Drive.

## Executar localmente

Recomendado: Node.js 24.

```bash
npm ci
npm run dev
```

O Vite exibirá o endereço local para abrir no navegador.

## Validações

```bash
npm run lint
npm run check:occurrences
npm run build
```

O GitHub Actions executa essas verificações em pushes e Pull Requests direcionados à branch principal. O workflow de sincronização atualiza automaticamente a seção gerada de `docs/AI_CONTEXT.md`.

## Documentação

- [Contexto técnico para IAs e desenvolvedores](docs/AI_CONTEXT.md)
- [Registro público de ocorrências](docs/REGISTRO_DE_OCORRENCIAS.md)

## Princípios do projeto

- Priorizar as necessidades reais de profissionais e clientes da região.
- Manter o escopo proporcional ao prazo acadêmico.
- Separar funcionalidades implementadas, decisões vigentes e ideias futuras.
- Não publicar credenciais, dados pessoais ou evidências sensíveis.
- Validar operações e permissões no lado confiável do sistema, não apenas na interface.
