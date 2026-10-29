# Integrações

Nenhuma credencial está configurada neste ambiente. As telas mostram `not_configured` e o modo demonstração recusa a chamada.

## Google Business Profile

Documentação consultada: [Google Business Profile APIs](https://developers.google.com/my-business/) e [dados de avaliações](https://developers.google.com/my-business/content/review-data).

- Autorização: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Escopo: `https://www.googleapis.com/auth/business.manage`
- Contas: `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`
- Locais: `GET https://mybusinessbusinessinformation.googleapis.com/v1/{account}/locations?readMask=name,title`
- Avaliações: `GET https://mybusiness.googleapis.com/v4/{parent}/reviews` com `pageSize` 50, no máximo 20 páginas
- Resposta: `PUT https://mybusiness.googleapis.com/v4/{reviewName}/reply` com `{ comment }`, até 4096 caracteres

Variáveis: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. O redirect é `{origem}/api/integrations/google/callback`. O token fica cifrado em `integration_secrets` e não volta ao navegador. Desconectar apaga o segredo local. A revogação no Google é tentativa; se falhar, a interface não afirma que o Google revogou o acesso.

Sem local selecionado ou sem identificador da avaliação, a publicação não é tentada e o estado não vira falha. Falha HTTP do provedor, no modo real, grava `publish_failed` com a mensagem sanitizada.

## WhatsApp Cloud API

Documentação de referência: [WhatsApp Business Developer Hub](https://whatsappbusiness.com/developers/developer-hub/) e Graph API. A versão padrão no código é `v26.0`, vinda de um resumo de changelog de setembro de 2026. Confirme a versão atual antes de produção e fixe `WHATSAPP_GRAPH_API_VERSION`.

- Envio: `POST https://graph.facebook.com/{version}/{phone-number-id}/messages`
- Corpo: template, não texto livre
- O `messages[0].id` significa aceite, não entrega
- Webhook: `GET` com `hub.mode`, `hub.verify_token`, `hub.challenge`
- Assinatura: `X-Hub-Signature-256` com HMAC-SHA256 do corpo cru e do segredo do aplicativo

Sem segredo armazenado o webhook responde 503. Assinatura inválida responde 401 e não grava o corpo. Evento repetido é ignorado pela chave única. Em demonstração, um webhook válido é registrado como `ignored_demonstration` e não muda entrega. Resposta recebida só vincula quando `context.id` coincide com o identificador da mensagem enviada. O trecho fica no registro da mensagem, com no máximo 400 caracteres, e não é copiado para a atividade.

Limite local: 20 envios aceitos por minuto por clínica. Não há retentativa automática de uma chamada com efeito externo.

## IA

`POST {AI_BASE_URL}/chat/completions`. A base precisa terminar em `/v1`; o caminho é concatenado, não resolvido a partir de uma barra inicial. Sem `APP_MODE=live` ou sem `AI_API_KEY`, `AI_BASE_URL` e `AI_MODEL`, o rascunho é o adaptador local `adaptador-local-de-demonstracao`. O comentário entra como dado não confiável. A política remove frase evitada, emoji quando a regra é não usar, e recusa promessa clínica ou vazamento de instrução.

## O que a interface pode afirmar

| Situação | Texto correto |
| --- | --- |
| Sem credencial | Não configurada |
| Demonstração | Nenhuma chamada foi feita |
| Envio aceito | Entrega não confirmada |
| Webhook de entrega no modo real | Entrega confirmada |
| Sugestão | Ainda não publicada |
