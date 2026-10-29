# Plano

O núcleo navegável e os fluxos de sugestão, aprovação, publicação bloqueada, preparação e envio bloqueado estão implementados. O que segue é a ordem para sair da demonstração.

1. Criar o projeto Supabase, aplicar um esquema Postgres equivalente a `lib/db/schema.ts` e políticas RLS por clínica. Trocar `lib/db` sem mudar os casos de uso.
2. Confirmar a versão atual da Graph API e os nomes de template aprovados na Meta antes de `APP_MODE=live`.
3. Concluir o OAuth do Google com uma conta de teste que tenha acesso a `business.manage` e um local selecionado. Sincronizar avaliações e publicar uma resposta aprovada num local de teste.
4. Receber um webhook assinado de entrega e conferir que o estado só avança com o identificador da mensagem.
5. Ligar o provedor de IA e revisar, com comentários reais, se a política continua recusando texto clínico.
6. Recuperação de senha por e-mail, quando houver provedor.
7. Retenção, exclusão e exportação completa além do JSON atual, conforme a política da clínica.

Não adicionar tela para um conector que ainda não tenha endpoint, estado e tratamento de falha definidos.
