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

## 5. Conversa privada fica visível pro outro usuário antes da primeira mensagem ser enviada

`createPrivateConversation` insere os dois usuários em `conversation_members` na hora da criação, e `getUserConversations` lista qualquer conversa onde o usuário é membro ativo — então a conversa aparece na lista de quem foi convidado imediatamente, mesmo que quem criou nunca tenha mandado mensagem nenhuma. WhatsApp/Signal/Telegram não fazem isso: a conversa só "nasce" pro outro lado no envio da primeira mensagem, nunca na criação/abertura.

**Por que foi adiado**: a correção depende de saber "essa conversa já recebeu ao menos uma mensagem", que é informação do `message-service` — hoje ainda é só o scaffold do `nest g app`, sem schema nem endpoint nenhum. Não dá pra resolver direito antes dele existir.

**Quando revisitar**: quando `message-service` for construído (ainda fase 1, próximo passo depois do chat-service). A visibilidade por usuário provavelmente vira uma junção com "existe mensagem nessa conversa", ou um flag por membro tipo `visibleAt`.

## 6. `lastMessage`/preview no `ConversationResponse` — planejado como `null` por enquanto, mas pode virar impossível sob E2E

Plano combinado: `chat-service` consumiria o evento `chat.messages.persisted` (Kafka, fase 3) e preencheria um resumo da última mensagem em `conversations`, pra listagem estilo WhatsApp. Isso funciona enquanto as mensagens trafegam em texto plano.

**Por que isso pode mudar**: se a criptografia E2E (cogitada como funcionalidade futura) for implementada, o servidor nunca vê o conteúdo da mensagem em texto plano — só blobs cifrados. Nesse cenário o `chat-service` não tem como gerar um preview, porque literalmente não consegue ler o conteúdo. Deixaria de ser "ainda não implementado" e viraria uma limitação permanente do design — o preview teria que ser resolvido inteiramente no client, que decifra localmente.

**Quando revisitar**: ao decidir se E2E entra no roadmap de verdade. Se entrar, este item vira decisão arquitetural definitiva (preview só client-side), não mais um TODO de implementação futura.

## 7. `correlationId` de request não propagado entre serviços

O `AllExceptionsFilter` (`libs/common/src/filters/all-exceptions.filter.ts`) vai passar a padronizar o shape da resposta de erro (`statusCode`, `errorCode`, `message`, `path`, `timestamp`), mas sem um id de correlação — cada serviço loga o erro isoladamente, sem um identificador comum pra rastrear uma request através de `api-gateway → auth-service`/`chat-service`, ou futuramente através do fluxo assíncrono `ws-gateway → Kafka → message-service`.

**Por que foi adiado**: hoje a comunicação entre serviços é só síncrona (REST, fase 1), com poucos saltos — o ganho de correlacionar logs ainda é baixo pro esforço de propagar um header em toda chamada HTTP interna. O valor real aparece quando o fluxo assíncrono via Kafka existir (fase 3): aí um `correlationId` também precisaria ir nos headers da mensagem Kafka pra rastrear `message:send` → `chat.messages` → persistência → `chat.messages.persisted` → fan-out.

**Quando revisitar**: quando o trabalho de Kafka (fase 3) começar — nesse ponto, desenhar a propagação via HTTP e via headers de mensagem Kafka junto, não separado.

## 8. Sem hierarquia de exceções de domínio customizadas — `errorCode` viaja no payload das exceções nativas do Nest

Decisão consciente: em vez de criar uma hierarquia de exceções próprias (`extends HttpException`) desde já, o `errorCode` é passado como campo extra no objeto de resposta das exceções nativas do Nest (ex: `throw new NotFoundException({ message: 'User not found', errorCode: 'USER_NOT_FOUND' })`), lido pelo filter. Nenhum catálogo central de códigos foi criado — os códigos são adicionados um a um, só nos pontos que já lançam exceção, conforme necessidade.

**Por que foi adiado**: um catálogo central criado por antecipação tende a ficar obsoleto/morto (visto na prática num projeto de referência — `ErrorCode.ts` com um único valor, nunca importado em lugar nenhum). Com poucas exceções ativas hoje, a hierarquia própria seria boilerplate sem ganho imediato.

**Quando revisitar**: se uma exceção específica precisar carregar mais contexto estruturado do que `message` + `errorCode` (ex: lista de campos inválidos com metadata própria), ou se o número de `throw` sites crescer a ponto de duplicação de `errorCode` virar risco real de inconsistência — aí sim vale extrair uma classe base própria.
