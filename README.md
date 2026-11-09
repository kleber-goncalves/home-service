# Home Service — Conecta Local

Plataforma regional para aproximar pessoas que procuram serviços de profissionais autônomos e pequenos empreendedores.

O projeto tem finalidade acadêmica e busca demonstrar investigação de problemas, levantamento de requisitos, desenvolvimento web, modelagem, segurança e testes.

## Estado atual

A homepage pública foi construída como experiência demonstrativa em React + Vite. Ela apresenta a identidade visual, categorias, exemplos ilustrativos de serviços, busca local de demonstração, explicação da jornada, FAQ e navegação responsiva.

A demonstração **não** representa um marketplace operacional: não há cadastro real de profissionais, backend integrado, autenticação, planilha operacional, pesquisa geográfica ou fluxo de contratação.

- **Repositório:** https://github.com/kleber-goncalves/home-service
- **Deploy:** https://home-service-blush.vercel.app/
- **Frontend:** React, JavaScript, Vite 8 e Tailwind CSS 4.
- **Componentes:** primitivas locais editáveis no padrão visual shadcn/ui, configuradas para JavaScript.
- **Ícones:** Lucide React.
- **Backend planejado:** Google Apps Script.
- **Dados planejados:** Google Sheets.
- **Imagens:** fotografias ilustrativas externas do Pexels; fontes e créditos abaixo.

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
- [Especificação funcional do MVP (em revisão)](docs/ESPECIFICACAO_MVP.md)
- [Registro público de ocorrências](docs/REGISTRO_DE_OCORRENCIAS.md)

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
