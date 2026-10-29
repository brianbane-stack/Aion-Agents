# VetAgents

SaaS operacional para clínicas veterinárias. O Dr. Bruno prepara respostas de avaliações do Google Business Profile. O Lucas prepara mensagens de pós-consulta pela WhatsApp Cloud API. Publicação e envio só acontecem depois de aprovação e, no modo real, depois da confirmação do provedor.

O padrão desta instalação é o modo demonstração: dados fictícios, sem chamada ao Google, à Meta ou a um modelo externo.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

A senha das contas fictícias aparece na tela de entrar. Ela não vai para o repositório.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Documentação

O contexto para as próximas sessões está em `AGENTS.md` e em `docs/`. O estado verificado está em `docs/STATUS.md`.
