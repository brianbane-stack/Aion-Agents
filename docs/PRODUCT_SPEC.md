# VetAgents

Plataforma B2B para o responsável, a gestão ou um profissional autorizado de uma clínica veterinária. O produto reduz trabalho manual de reputação e de relacionamento sem pedir que a pessoa aprenda uma ferramenta de marketing nem fique vigiando a IA.

## Perguntas que a operação precisa responder

1. O que está acontecendo?
2. O que pede intervenção humana?
3. O que os agentes fizeram e o que foi confirmado?
4. O que os registros sustentam como melhoria?

## Agentes

**Dr. Bruno** lê avaliações armazenadas, redige uma sugestão fiel ao comentário e à memória explícita da clínica, e só publica depois de aprovação e de uma integração Google válida. Não inventa procedimento, animal ou tutor.

**Lucas** prepara fluxos de pós-consulta. O convite para avaliação é neutro: sem recompensa e sem excluir alguém por uma nota presumida. Consentimento, limite de tentativas e duplicidade são verificados de novo na execução. Aceite de envio não é entrega.

## Áreas

Hoje, Reputação, Pós-consulta, Atividade, Resultados, Integrações e Configurações (clínica, memória, agentes, equipe). A configuração inicial fica em `/comecar` e, quando há avaliação aberta, segue para a mais antiga.

## Critérios do MVP

Uma pessoa entra, configura a clínica, vê o estado da operação, navega pelas áreas, trabalha uma sugestão sem confundi-la com publicação, configura e acompanha um fluxo, consulta a atividade, ajusta a memória e vê o que falta na integração. Com credenciais e `APP_MODE=live`, as chamadas usam os endpoints documentados. Sem isso, os dados são demonstração explícita.

## Fora deste núcleo

Não há Supabase conectado, agendador, disparo em massa, benchmark local, ranking ou afirmação de que a automação causou uma nota. Dados clínicos que não servem à resposta pública ou à mensagem autorizada não são armazenados.
