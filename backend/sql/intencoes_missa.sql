-- Tabela para REQ-07 (Intenções de Missa)
-- Executar na BD 'DataBase-ER' (PostgreSQL)
CREATE TABLE IF NOT EXISTS intencoes_missa (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  intencao TEXT NOT NULL,
  data_pretendida DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendente',
  solicitante_email TEXT NULL,
  celebracao_id INTEGER NULL,
  decisao_motivo TEXT NULL,
  decidido_em TIMESTAMP NULL,
  notificado_em TIMESTAMP NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

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
