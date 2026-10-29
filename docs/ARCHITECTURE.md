# Arquitetura

Next.js 16 App Router, React 19, TypeScript estrito, Tailwind 4. O proxy em `proxy.ts` só verifica a presença do cookie assinado. A autorização real está em `lib/auth/guard.ts`: usuário, hash da sessão e associação à clínica.

## Módulos

- `app/`: rotas, páginas e endpoints.
- `components/`: navegação, formulários e primitivos.
- `features/`: ações de servidor. O estado do formulário mora em `features/action-state.ts` porque um arquivo `"use server"` só exporta funções assíncronas.
- `lib/db`: SQLite, esquema, seed e consultas.
- `lib/reputation`, `lib/postvisit`, `lib/settings`, `lib/ops`: casos de uso.
- `lib/integrations`: Google, WhatsApp, segredos e webhooks.
- `lib/ai`: política e provedor.
- `tests`: Vitest, sem subir o Next.

## Dados

Arquivo SQLite com WAL e chaves estrangeiras. Seed só quando `APP_MODE` não é `live` e a tabela `users` está vazia. Duas clínicas fictícias: Horizonte Animal (onboarding concluído) e Vale Felino (onboarding pendente, avaliação do Milo). Consultas operacionais recebem `clinicId` da sessão, não da URL.

Papéis: responsável, administração, operação, aprovação e leitura. Leitura não aprova, não publica e não vê telefone completo. A clínica precisa manter um responsável.

Segredos de integração: AES-256-GCM, chave derivada do segredo de sessão. A configuração pública só expõe identificadores e booleanos `hasAccessToken`, `hasAppSecret` e `hasVerifyToken`.

## Estados

Avaliação: `unanswered`, `suggestion_ready`, `approved_pending_publish`, `published`, `publish_failed`, `discarded`.

Mensagem: `prepared`, `awaiting_approval`, `approved`, `send_accepted`, `sent`, `delivered`, `read`, `replied`, `failed`, `not_sent_demo`, `blocked_consent`, `skipped_duplicate`.

`source_mode` é `demonstration` ou `provider`. Um registro de demonstração não é reclassificado como vindo do Google.

## Segurança aplicada no código

Validação Zod nas ações. Limite de 8 falhas de login em 10 minutos por e-mail. Webhook com comparação de assinatura em tempo constante. Cabeçalhos `nosniff`, `DENY` de frame, referrer estrito e permissões de câmera, microfone e localização desligadas. Não há CSP, porque o Next injeta script. Exportação JSON, só para responsável e administração, não inclui hash de senha nem segredo.

## O que não está ligado

Supabase, RLS de Postgres, cron, e-mail de recuperação de senha e um provedor de IA real. A recuperação de acesso informa que nenhum e-mail é enviado nesta versão.
