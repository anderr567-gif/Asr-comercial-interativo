-- Complemento aditivo e independente; sem envio de mensagens e sem importacao de totais como eventos.
CREATE TABLE IF NOT EXISTS asr_coletas_comerciais (
 id TEXT PRIMARY KEY, vendedor_id TEXT NOT NULL, caixa TEXT NOT NULL,
 inicio TEXT NOT NULL, fim_exclusivo TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('parcial','completa','erro')),
 escopo TEXT NOT NULL, coletado_em TEXT NOT NULL, erro TEXT,
 CHECK(fim_exclusivo > inicio)
);
CREATE TABLE IF NOT EXISTS asr_eventos_comerciais (
 id TEXT PRIMARY KEY, vendedor_id TEXT NOT NULL, oportunidade_id TEXT,
 cliente_id TEXT, produto_id TEXT, contato_id TEXT,
 tipo TEXT NOT NULL CHECK(tipo IN ('envio','entrega','falha_entrega','resposta_humana','resposta_automatica','reuniao_marcada','reuniao_realizada','proposta_enviada','negociacao','contrato_confirmado','recebimento','repasse')),
 finalidade TEXT NOT NULL CHECK(finalidade IN ('prospeccao','relacionamento','operacional','financeiro')),
 destinatario_externo INTEGER CHECK(destinatario_externo IN (0,1)),
 canal TEXT NOT NULL, ocorrido_em TEXT NOT NULL,
 provedor TEXT NOT NULL, caixa TEXT NOT NULL, evento_origem_id TEXT NOT NULL,
 message_id TEXT, thread_id TEXT, responde_message_id TEXT,
 destinatario_chave TEXT, fonte_ref TEXT NOT NULL, coleta_id TEXT REFERENCES asr_coletas_comerciais(id),
 criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(provedor,caixa,evento_origem_id,tipo)
);
CREATE INDEX IF NOT EXISTS idx_asr_eventos_vendedor_data ON asr_eventos_comerciais(vendedor_id,ocorrido_em,tipo);
CREATE TABLE IF NOT EXISTS asr_qualificacao_comercial (
 oportunidade_id TEXT PRIMARY KEY, originador_id TEXT, desenvolvedor_id TEXT,
 responsavel_atual_id TEXT NOT NULL, decisor TEXT, verba_confirmada INTEGER CHECK(verba_confirmada IN (0,1)),
 valor_centavos INTEGER CHECK(valor_centavos>=0), natureza_valor TEXT CHECK(natureza_valor IN ('proposta','contratado','custo','permuta')),
 fechamento_previsto TEXT, proxima_acao TEXT, proxima_acao_em TEXT,
 proposta_enviada_em TEXT, proposta_fonte TEXT, reuniao_realizada_em TEXT,
 revisado_em TEXT, revisado_por TEXT, fonte_ref TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS asr_planos_melhoria (
 id TEXT PRIMARY KEY, vendedor_id TEXT NOT NULL, indicador TEXT NOT NULL,
 diagnostico TEXT NOT NULL, acao TEXT NOT NULL, responsavel TEXT NOT NULL,
 prazo TEXT NOT NULL, meta_proposta REAL, unidade TEXT,
 aprovado_em TEXT, aprovado_por TEXT, resultado_observado TEXT, evidencia_ref TEXT,
 status TEXT NOT NULL DEFAULT 'proposto' CHECK(status IN ('proposto','aprovado','em_andamento','concluido','cancelado')),
 criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS asr_retratos_historicos (
 id TEXT PRIMARY KEY, vendedor TEXT NOT NULL, data_relatorio TEXT NOT NULL,
 inicio_cobertura TEXT, fim_cobertura TEXT, indicador TEXT NOT NULL, valor INTEGER NOT NULL,
 fonte_ref TEXT NOT NULL, verificacao TEXT NOT NULL DEFAULT 'relatorio_anterior_nao_reauditado',
 UNIQUE(vendedor,data_relatorio,indicador,fonte_ref)
);
-- Contagens observadas, nunca prova de cobertura completa. Sem linhas = sem dados importados.
CREATE VIEW IF NOT EXISTS asr_v_atividade_diaria AS
 SELECT vendedor_id, date(ocorrido_em,'-3 hours') AS dia_sp,
 SUM(CASE WHEN tipo='envio' AND destinatario_externo=1 AND finalidade IN ('prospeccao','relacionamento') THEN 1 ELSE 0 END) AS envios_comerciais_externos,
 SUM(CASE WHEN tipo='falha_entrega' THEN 1 ELSE 0 END) AS falhas_entrega,
 SUM(CASE WHEN tipo='resposta_humana' AND finalidade IN ('prospeccao','relacionamento') THEN 1 ELSE 0 END) AS respostas_humanas,
 SUM(CASE WHEN tipo='reuniao_realizada' THEN 1 ELSE 0 END) AS reunioes_realizadas,
 SUM(CASE WHEN tipo='proposta_enviada' THEN 1 ELSE 0 END) AS propostas_enviadas,
 SUM(CASE WHEN tipo='contrato_confirmado' THEN 1 ELSE 0 END) AS contratos_confirmados
 FROM asr_eventos_comerciais GROUP BY vendedor_id,date(ocorrido_em,'-3 hours');
CREATE VIEW IF NOT EXISTS asr_v_pendencias_qualificacao AS
 SELECT oportunidade_id,responsavel_atual_id,
 CASE WHEN valor_centavos IS NULL THEN 1 ELSE 0 END AS falta_valor,
 CASE WHEN fechamento_previsto IS NULL THEN 1 ELSE 0 END AS falta_previsao,
 CASE WHEN decisor IS NULL OR trim(decisor)='' THEN 1 ELSE 0 END AS falta_decisor,
 CASE WHEN proxima_acao_em IS NULL OR proxima_acao IS NULL THEN 1 ELSE 0 END AS falta_proxima_acao,
 CASE WHEN julianday(proxima_acao_em)<julianday('now') THEN 1 ELSE 0 END AS acao_vencida
 FROM asr_qualificacao_comercial;
