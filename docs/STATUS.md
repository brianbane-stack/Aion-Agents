# Status

Atualizado em 29 de outubro de 2026, por volta das 14h30 (horário de Brasília), depois dos testes automatizados, do build e da verificação no navegador.

## Implementado

- Aplicação Next.js com as rotas Hoje, Reputação, Pós-consulta, Atividade, Resultados, Integrações, Configurações e configuração inicial.
- Sessão HMAC, papéis, duas clínicas de demonstração e senha local não versionada.
- Sugestão local fiel ao comentário, edição, memória opcional, aprovação e publicação que não chama o Google em demonstração.
- Fluxos do Lucas com regras, consentimento, duplicidade, aprovação e estado `not_sent_demo`.
- Webhook que exige assinatura e, em demonstração, não altera entrega.
- Conectores Google e WhatsApp prontos para o modo real, sem credencial neste ambiente.
- Memória editável que altera a próxima sugestão.
- Relatório com fórmula de tempo e exportação sem segredo.

## Verificado no terminal

- `npm test`: 13 testes em `tests/operations.test.ts`, todos passando. Cobrem política de resposta, isolamento entre clínicas, aprovação sem publicação, memória desativada, convite neutro, duplicidade, demonstração sem entrega, webhook e exportação.
- `npm run typecheck`, `npm run lint` e `npm run build` concluíram sem erro.

## Verificado no navegador

Em 29 de outubro de 2026, à tarde (horário de Brasília), com `npm run dev` em `http://localhost:3000`:

- Login da conta fictícia da Horizonte, faixa de demonstração e fila real em Hoje.
- Avaliação de Carlos Mendes aprovada e, ao tentar publicar, aviso de que nenhuma chamada foi feita ao Google. O estado permaneceu “Aprovada, ainda não publicada”.
- Mensagem de Rita Alves em “Não enviada — demonstração”, com execução “Não executado”. Lúcia e Eduardo ficaram bloqueados por consentimento.
- Integrações do Google e do WhatsApp em “Não configurada”.
- Ricardo, da Vale Felino, cai em `/comecar` e não vê os registros da Horizonte.
- Menu mobile em largura de 390px abre as seções principais.
- Salvar a assinatura da clínica persiste após recarregar, o aviso de alteração não salva some depois do sucesso, e o texto original foi restaurado.

## Não verificado

- Publicação real no Google e entrega real na Meta. Não há credenciais.
- Navegação completa só por teclado.
- RLS de Postgres. O arquivo em `supabase/migrations` não foi aplicado.
- Scan da Aikido: o servidor pediu login e a varredura não rodou.

## Bloqueios

- Projeto Supabase ausente.
- Cliente OAuth do Google ausente.
- Token, segredo e template da WhatsApp Cloud API ausentes.
- Chave de IA ausente. O rascunho local cobre a demonstração.
