-- Custom SQL migration file, put your code below! --

-- Backfill do `visible_at` (adicionado em 0005 como nullable).
-- Conversas que já existiam antes da coluna continuam visíveis pra todos os
-- membros. O comportamento novo (esconder o lado passivo de uma conversa
-- privada até a 1a mensagem) vale só pras conversas criadas daqui pra frente.
UPDATE "conversation_members" SET "visible_at" = "joined_at" WHERE "visible_at" IS NULL;