## Comportamento padrão

Não edite arquivos diretamente em hipotese alguma. Por padrão, discuta, sugira e explique — não use as tools de edição/write sem confirmação.

# EchoChat

## Propósito

Sistema de chat distribuído (estilo WhatsApp/Telegram simplificado), construído do zero
como projeto de aprendizado — microserviços NestJS, mensageria com Kafka, tempo real
com WebSocket/Redis. Sucessor do projeto Chat4All (Java, feito via vibecoding com
conectores multi-plataforma); aqui o foco é diferente: entrega em tempo real e
fan-out de mensagens, sem a complexidade de conectores externos.

Projeto individual, propósito de aprendizado prático de sistemas distribuídos.

## Arquitetura

Monorepo NestJS (modo nativo `nest g app` / `nest g lib`), microserviços comunicando
via REST/HTTP (transporte síncrono entre gateway e serviços internos) e Kafka
(eventos assíncronos).

```
Next.js (web) ──HTTP──> api-gateway ──> auth-service (Postgres)
              └─WS────> ws-gateway  ──> chat-service (Postgres)
                          │            └─> message-service (MongoDB)
                     Redis adapter
                     (pub/sub multi-instância)
```

- **api-gateway**: REST, valida JWT, repassa pros serviços internos
- **ws-gateway**: Socket.IO, autentica no handshake via JWT, escalável horizontalmente
  via `@socket.io/redis-adapter`
- **auth-service**: usuários, login, refresh token — Postgres
- **chat-service**: conversas (1:1 e grupos), participantes — Postgres (dados relacionais)
- **message-service**: histórico de mensagens, status (sent/delivered/read) — MongoDB
  (alto volume de escrita, sem joins)

### Fluxo de mensagem

1. Cliente emite `message:send` via WebSocket → ws-gateway
2. ws-gateway produz no tópico Kafka `chat.messages` (key = `conversationId`, garante ordem)
3. message-service consome, persiste no Mongo, publica `chat.messages.persisted`
4. ws-gateway consome e faz fan-out via Redis adapter pros participantes online
5. Recibos de entrega/leitura seguem o mesmo caminho no tópico `chat.receipts`

## Stack

- NestJS (monorepo), TypeScript
- Kafka (mensageria entre serviços)
- Redis (Socket.IO adapter, presença online, cache)
- PostgreSQL (auth-service, chat-service)
- MongoDB (message-service)
- Next.js (frontend web)
- Docker Compose (orquestração local)

## Estrutura do monorepo

```
apps/
  api-gateway/
  ws-gateway/
  auth-service/
  chat-service/
  message-service/
libs/
  contracts/   # DTOs, eventos Kafka, interfaces compartilhadas entre serviços
  kafka/       # config reutilizável de producer/consumer
  common/      # guards, decorators, filters
```

## Ordem de construção (fase atual: [preencher])

1. auth + chat + message num app só, REST puro — chat funcional sem tempo real
2. ws-gateway com Socket.IO + Redis adapter — tempo real sem Kafka ainda
3. Kafka entre ws-gateway e message-service — pipeline distribuído
4. Quebra em serviços finais, cada um com Dockerfile
5. Recibos de leitura, presença, typing indicator, grupos

## Convenções

- Branches: `feature/`, `fix/`, `refactor/`, `chore/` + kebab-case
  (ex: `feature/login-form-validation`)
- DTOs e tipos de evento Kafka sempre em `libs/contracts`, nunca duplicados entre serviços
- [adicionar: padrão de commit, lint rules, etc conforme o projeto evoluir]

## O que evitar

- Não pular etapas da ordem de construção (ex: não introduzir Kafka antes do
  WebSocket básico funcionar)
- Não persistir mensagem sem passar pelo Kafka (quebra a garantia de zero message loss)
- Não colocar lógica de negócio no ws-gateway — ele só autentica, roteia e faz fan-out
