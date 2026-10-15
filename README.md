# CRM ASR — base de integração

Código preparado para Cloudflare Worker com binding D1 `DB`. Nenhuma credencial ou dado comercial incluído.

## Estado
API preparada e validada localmente com SQLite. Publicação desta API, autenticação dos usuários, integração ao frontend e teste em duas sessões reais ainda pendentes. Não há disparos automáticos.

## Teste local
Node.js com módulo node:sqlite: `node tests/fluxo.mjs`.

## Instalação
Preservar e exportar código, configurações e banco existentes. Inspecionar o esquema remoto antes das migrações aditivas. Aplicar 002 e 003 sem apagar dados. Integrar worker-completo.mjs preservando rotas existentes. Configurar CRM_IDENTITIES_JSON como segredo com identidades individuais: id, papel, sha256, ativo e expira_em. Tokens não devem entrar no repositório ou frontend.

Ricardo edita metas, ofertas e representantes; Marketing edita leads e campanhas; diretoria consulta registros e auditoria.

A API usa asr_crm_registros e asr_crm_auditoria. Não há sincronização automática com as tabelas normalizadas originais nem endpoints de performance. Isso precisa ser definido antes da integração do painel.

A publicação precisa de autenticação própria no Cloudflare. A conexão GitHub não concede acesso ao Cloudflare ou ao projeto Vercel.
