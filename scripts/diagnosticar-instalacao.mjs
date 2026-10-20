// Somente GET, sem tokens, gravacoes ou exibicao de dados comerciais.
const base = new URL(process.env.ASR_API_URL || 'https://spring-haze-aabf.ander-r567.workers.dev');
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
 throw new Error('Use uma URL HTTPS sem credenciais ou parametros.');
async function probe(path) {
 try {
  const r = await fetch(new URL(path, base), {redirect:'error', signal:AbortSignal.timeout(15000)});
  const body = await r.text();
  let data; try { data=JSON.parse(body); } catch {}
  return {status:r.status, data, hello:body.trim()==='Hello World!'};
 } catch { return {erro:'Sem resposta verificavel'}; }
}
const health=await probe('/api/health');
const api=await probe('/api/asr-crm/ofertas');
const banco=health.status===200 && health.data?.banco==='conectado';
let estado='resposta_inesperada';
if (api.hello) estado='codigo_inicial_sem_api';
else if (api.status===503 && api.data?.erro==='CRM nao configurado') estado='api_instalada_configuracao_pendente';
else if (api.status===401 && api.data?.erro==='Nao autenticado') estado='api_instalada_acesso_anonimo_bloqueado';
else if (api.erro) estado='conexao_nao_verificada';
console.log(JSON.stringify({banco_conectado:banco,api:estado,
 leitura_autenticada:'nao_testada',gravacao:'nao_testada',painel:'nao_testado'},null,2));
if (!banco || estado!=='api_instalada_acesso_anonimo_bloqueado') process.exitCode=1;
