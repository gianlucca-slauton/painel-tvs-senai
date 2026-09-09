-- 006_owner.sql — marca o mestre FUNDADOR (criado pelo script inicial)
-- como dono do sistema: não pode ser removido nem rebaixado por outros.
ALTER TABLE users ADD COLUMN owner INTEGER NOT NULL DEFAULT 0;