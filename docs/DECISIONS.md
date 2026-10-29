# Decisões

## Banco local em vez de um projeto Supabase inexistente

Não há projeto Supabase configurado neste ambiente. Inventar uma conexão remota deixaria o produto dependente de uma credencial que não existe. O runtime usa SQLite (`node:sqlite`) em `data/vetagents.db`, com o esquema em `lib/db/schema.ts`. O isolamento entre clínicas é aplicado nas consultas e na sessão. `supabase/migrations/0001_not_applied.sql` só registra que o Postgres com RLS ainda não foi aplicado.

## Modo demonstração bloqueia toda chamada externa

`APP_MODE` diferente de `live` faz `externalCallsAllowed()` retornar falso. Google, WhatsApp e o provedor de IA não são chamados, mesmo se houver chaves no ambiente. Uma publicação ou entrega simulada não é gravada como confirmada.

## Cache Components desligados

O scaffold do Next.js 16 ligava cache compartilhado. Os dados são por clínica. Um cache compartilhado entre requisições poderia vazar o estado de uma clínica para outra. A autorização continua no servidor, em `requireUser`, e não apenas no `proxy.ts`.

## Cookie de sessão

Cookie `va_session`, HMAC, httpOnly, SameSite=lax, 7 dias. `Secure` só quando `COOKIE_SECURE=true`, para o desenvolvimento em HTTP continuar possível. O `clinicId` do cookie é ignorado se o usuário não for membro daquela clínica.

## Aprovação não executa

Aprovar uma resposta deixa o estado `approved_pending_publish`. Aprovar uma mensagem deixa `approved`. Publicar e enviar são ações separadas. Em demonstração elas terminam sem chamada externa: a avaliação continua aprovada e não publicada; a mensagem fica `not_sent_demo`.

## Aceite de envio não é entrega

`send_accepted` e `sent` não preenchem `delivered_at`. Entrega, leitura e resposta só avançam por webhook assinado, e somente com `APP_MODE=live`.

## Memória explícita

Frases preferidas, frases evitadas, regras e exemplos só entram se alguém salvar a clínica, registrar memória ou marcar “lembrar” no editor. Desativar ou remover uma frase reescreve a lista usada no próximo rascunho. Correções sem essa marca valem só para a resposta atual.

## Autonomia por fluxo

Sugestão não envia. Supervisionado exige aprovação. Restrita pode executar o que já está dentro do limite, mas só quando alguém dispara o ciclo. Não há agendador em segundo plano. A confiança do modelo não autoriza ação externa.

## Convite de avaliação neutro

O fluxo `postvisit-review` rejeita modelos com recompensa, nota induzida ou exclusão de tutores. A checagem é por trecho, então a negação da palavra também é recusada.

## Tempo economizado

6 minutos por resposta com publicação confirmada e 3 minutos por mensagem com entrega confirmada por webhook. A fórmula está em `TIME_SAVED_METHOD`. Rascunho, aprovação e envio apenas aceito não entram.

## shadcn parcial

`components.json` segue o estilo New York, mas os primitivos usados (botão, diálogo, campo) foram escritos para a paleta do VetAgents. Não há o catálogo completo.

## Formulário da clínica

A clínica usa React Hook Form e Zod no cliente e o mesmo esquema Zod no servidor. Os outros formulários operacionais validam no servidor e usam `useActionState`.
