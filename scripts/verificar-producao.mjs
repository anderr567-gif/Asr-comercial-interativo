import assert from 'node:assert/strict';
// Execucao explicita: cria uma oferta marcada como teste. Nunca agenda envios.
const {ASR_API_URL, ASR_TOKEN_RICARDO, ASR_TOKEN_DIRETORIA, ASR_TOKEN_MARKETING, ASR_EXECUTAR_TESTE}=process.env;
if(ASR_EXECUTAR_TESTE!=='SIM') throw new Error('Defina ASR_EXECUTAR_TESTE=SIM para criar o registro de teste.');
if(!ASR_API_URL||![ASR_TOKEN_RICARDO,ASR_TOKEN_DIRETORIA,ASR_TOKEN_MARKETING].every(x=>x&&x.length>=32))
 throw new Error('Configure URL e tokens individuais no ambiente seguro; nunca no codigo.');
const base=new URL(ASR_API_URL);
if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash) throw new Error('Use URL HTTPS sem credenciais ou parametros.');
async function call(token,method,path,body) {
 return fetch(new URL(path,base),{method,redirect:'error',signal:AbortSignal.timeout(15000),
 headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},
 ...(body?{body:JSON.stringify(body)}:{})});
}
async function main(){
 let r=await call(null,'GET','/api/health');
 assert.equal(r.status,200,'Health deve retornar 200');
 assert.equal((await r.json()).banco,'conectado');
 r=await call(null,'GET','/api/asr-crm/ofertas');
 assert.equal(r.status,401,'Leitura anonima deve ser negada');
 for(const token of [ASR_TOKEN_DIRETORIA,ASR_TOKEN_MARKETING]){
  r=await call(token,'POST','/api/asr-crm/ofertas',{titulo:'TESTE DE PERMISSAO — NAO COMERCIAL',teste:true});
  assert.equal(r.status,403,'Escrita de oferta deve ser negada ao papel');
 }
 r=await call(ASR_TOKEN_RICARDO,'POST','/api/asr-crm/ofertas',{
 titulo:'TESTE TECNICO — NAO E VENDA — '+new Date().toISOString(),teste:true,valor_centavos:0});
 assert.equal(r.status,201,'Ricardo deve salvar oferta');
 const saved=await r.json();
 // Requisicao separada, com identidade da diretoria; ainda nao equivale a duas sessoes de navegador.
 r=await call(ASR_TOKEN_DIRETORIA,'GET','/api/asr-crm/ofertas/'+saved.id);
 assert.equal(r.status,200);
 assert.ok((await r.json()).some(x=>x.id===saved.id),'Diretoria deve ler a mesma oferta');
 r=await call(ASR_TOKEN_DIRETORIA,'GET','/api/asr-crm/auditoria');
 assert.equal(r.status,200);
 assert.ok((await r.json()).some(x=>x.registro_id===saved.id&&x.acao==='criar'),'Auditoria deve registrar criacao');
 console.log(JSON.stringify({resultado:'PASS',oferta_teste_id:saved.id,health:true,permissoes:true,leitura_diretoria:true,auditoria:true,teste_duas_sessoes_navegador:'pendente'}));
}
main().catch(()=>{console.error('FAIL: verificacao nao concluida. Confira respostas no ambiente seguro. Tokens nao foram registrados.');process.exitCode=1;});
