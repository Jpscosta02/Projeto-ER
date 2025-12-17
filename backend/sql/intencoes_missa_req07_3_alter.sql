-- Migração REQ-07.3 (Intenções de Missa) - ligar intenção a uma missa (celebracao)
-- Executar na BD 'DataBase-ER' (PostgreSQL)
ALTER TABLE intencoes_missa
  ADD COLUMN IF NOT EXISTS celebracao_id INTEGER NULL;

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
