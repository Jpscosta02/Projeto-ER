-- Migração REQ-07.2 (Intenções de Missa) - acrescenta colunas para decisão e notificação
-- Executar na BD 'DataBase-ER' (PostgreSQL)
ALTER TABLE intencoes_missa
  ADD COLUMN IF NOT EXISTS solicitante_email TEXT NULL,
  ADD COLUMN IF NOT EXISTS celebracao_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS decisao_motivo TEXT NULL,
  ADD COLUMN IF NOT EXISTS decidido_em TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMP NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'intencoes_missa_celebracao_fk'
  ) THEN
    ALTER TABLE intencoes_missa
      ADD CONSTRAINT intencoes_missa_celebracao_fk
      FOREIGN KEY (celebracao_id) REFERENCES celebracoes(id)
      ON DELETE SET NULL;
  END IF;
END $$;
