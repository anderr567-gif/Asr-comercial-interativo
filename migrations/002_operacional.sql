-- Complemento isolado: nao altera tabelas existentes.
CREATE TABLE IF NOT EXISTS asr_crm_registros (
 id TEXT PRIMARY KEY, tipo TEXT NOT NULL CHECK(tipo IN ('metas','ofertas','representantes','leads','campanhas')),
 dados_json TEXT NOT NULL CHECK(json_valid(dados_json)), versao INTEGER NOT NULL DEFAULT 1,
 criado_por TEXT NOT NULL, atualizado_por TEXT NOT NULL,
 criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS asr_crm_auditoria (
 id TEXT PRIMARY KEY, registro_id TEXT NOT NULL, tipo TEXT NOT NULL,
 acao TEXT NOT NULL, ator_id TEXT NOT NULL, papel TEXT NOT NULL,
 antes_json TEXT, depois_json TEXT, ocorrido_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_asr_reg_tipo ON asr_crm_registros(tipo,atualizado_em);
CREATE INDEX IF NOT EXISTS idx_asr_audit_reg ON asr_crm_auditoria(registro_id,ocorrido_em);
