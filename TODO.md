# TODO / débito técnico conhecido

Pontos identificados durante a construção do `chat-service` e adiados de propósito — não são bugs ativos, são decisões conscientes de escopo. Cada um tem o motivo do adiamento e o gatilho pra quando vale revisitar.

## 1. Race condition na criação de conversa privada (TOCTOU)

`ChatServiceService.findExistingPrivateConversation` (SELECT) e o `insert` da conversa são operações separadas, sem lock entre elas. Duas requisições concorrentes pro mesmo par de usuários podem ambas não encontrar conversa existente e criar duas conversas privadas duplicadas.

**Por que foi adiado**: resolver direito exige uma tabela auxiliar `private_conversation_pairs` com `UNIQUE(userIdLow, userIdHigh)`, um índice único parcial em `conversations` (colunas de participante desnormalizadas, `WHERE type='private'`), ou um advisory lock do Postgres — complexidade que não se justifica com a concorrência praticamente nula de agora.

**Quando revisitar**: se duplicatas aparecerem de verdade em teste, ou antes de qualquer uso multiusuário real.

## 2. chat-service valida existência de usuário via chamada HTTP síncrona pro auth-service

`AuthClientService.verifyUsers` → `POST /auth/users/verify`. Acopla a disponibilidade de escrita do chat-service à disponibilidade do auth-service, mesmo os dois tendo bancos Postgres completamente separados.

**Por que foi adiado**: é a solução esperada da fase 1 ("REST puro") do roadmap em `CLAUDE.md`. Kafka entra na fase 3 — nesse ponto, o auth-service pode publicar um evento `user.created` e o chat-service manter um cache local mínimo de ids válidos, removendo o acoplamento síncrono.

**Quando revisitar**: quando o trabalho de Kafka (fase 3) começar, não antes.

## 3. `POST /auth/users/verify` no auth-service não tem autenticação de serviço

Qualquer cliente que alcance o auth-service diretamente (contornando o api-gateway) consegue chamar esse endpoint hoje.

**Por que foi adiado**: ainda não existe segmentação de rede entre os serviços (tudo roda em localhost, sem rede Docker/service mesh). É explicitamente um problema da fase 4 (containerização) do roadmap.

**Quando revisitar**: ao dockerizar os serviços (fase 4), não antes.

## 4. `ConversationResponse`/`ConversationMemberResponse` são interfaces, não classes decoradas

O api-gateway já tem Swagger configurado (`DocumentBuilder`/`SwaggerModule` no `main.ts`), mas interfaces são apagadas em tempo de compilação e não geram schema OpenAPI pros endpoints de chat.

**Por que foi adiado**: converter pra classes com `@ApiProperty` é mecânico, mas não vale a pena antes da superfície da API do chat-service parar de mudar.

**Quando revisitar**: quando as rotas de `chat-service` estabilizarem.
