# Instalação do Worker ASR

Preparação de publicação; não comprova instalação em produção.

## Destino

O arquivo wrangler.jsonc aponta para spring-haze-aabf, conta 93644cd21998fca2ef421cba4f0b49ca, banco existente asr-funil-sql e binding DB. Não cria outro banco. Configuração baseada em https://developers.cloudflare.com/workers/wrangler/configuration/.

## Estado e limites

O código informado pelo usuário atende /api/health e retorna Hello World nas demais rotas. worker-completo.mjs acrescenta /api/asr-crm/ com autenticação, permissões e auditoria. A raiz continua retornando Hello World: este pacote não contém o painel visual.

A API usa asr_crm_registros e asr_crm_auditoria, sem sincronizar tabelas antigas, e-mails ou negociações de carros. A conexão ao banco não comprova esses recursos.

## Publicação em ambiente autenticado

1. Guardar a versão atualmente ativa e as configurações do Worker para recuperação.
2. Executar `node --check worker-completo.mjs` e `node tests/fluxo.mjs`.
3. Usar Wrangler autenticado na conta acima e executar `npx wrangler deploy --dry-run` para conferir o pacote. Conferir os bindings existentes antes de aplicar a configuração, pois outros bindings não estão descritos aqui.
4. Usar o esquema já conferido. Não reaplicar SQL por rotina. Esta API requer as duas tabelas asr_crm; tabelas antigas de clientes ou oportunidades não as substituem. Se a conferência anterior não cobriu essas duas tabelas, verificar somente essa compatibilidade antes de liberar acesso. A migração 003 não é necessária para esta API.
5. Configurar CRM_IDENTITIES_JSON como segredo pelo painel ou `npx wrangler secret put CRM_IDENTITIES_JSON`. Cada identidade precisa de id individual, papel (ricardo, marketing ou diretoria), sha256 do token, ativo true e expira_em futura. Usar tokens aleatórios individuais, de pelo menos 32 caracteres. Não usar os tokens fictícios dos testes nem colocar tokens no código, GitHub ou conversa. Nenhum usuário real foi provisionado neste pacote.
6. Publicar com `npx wrangler deploy`. Não há aplicação automática de migrações neste projeto.
7. Executar `node scripts/diagnosticar-instalacao.mjs`. O diagnóstico faz apenas duas consultas GET públicas e não grava dados.
8. Com as identidades provisionadas, executar scripts/verificar-producao.mjs conforme suas variáveis de ambiente. Esse segundo teste cria uma oferta identificada como teste; manter o identificador para auditoria.

## Critério de conclusão

Banco conectado + API instalada ainda não equivalem ao CRM completo. Faltam validar leitura e escrita autenticadas, integrar o painel e testar duas sessões reais. A integração de e-mail e do agente comercial precisa de configuração própria e não é ativada pela publicação deste Worker.
