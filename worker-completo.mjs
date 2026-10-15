const tipos = ['metas','ofertas','representantes','leads','campanhas'];
const permissoes = {ricardo:['metas','ofertas','representantes'],marketing:['leads','campanhas'],diretoria:[]};
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function digest(token) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
}
// Retorna null fora do prefixo: o Worker existente continua responsavel pelas demais rotas.
export async function crmFetch(request,env) {
 const url = new URL(request.url);
 if (!url.pathname.startsWith('/api/asr-crm/')) return null;
 try {
  if (!env.DB || !env.CRM_IDENTITIES_JSON) return json({erro:'CRM nao configurado'},503);
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token || token.length<32) return json({erro:'Nao autenticado'},401);
  const identities = JSON.parse(env.CRM_IDENTITIES_JSON);
  const hash = await digest(token);
  const user = identities.find(u=>u.sha256===hash && u.ativo===true && Date.parse(u.expira_em)>Date.now());
  if (!user || !Object.hasOwn(permissoes,user.papel)) return json({erro:'Nao autenticado'},401);
  const parts=url.pathname.slice('/api/asr-crm/'.length).split('/');
  const [tipo,id]=parts;
  if (parts.length>2 || (id && !/^[a-zA-Z0-9-]{1,80}$/.test(id))) return json({erro:'Rota invalida'},404);
  if (tipo==='auditoria' && request.method==='GET' && user.papel==='diretoria') {
   return json((await env.DB.prepare('SELECT * FROM asr_crm_auditoria ORDER BY ocorrido_em DESC,id DESC LIMIT 200').all()).results);
  }
  if (!tipos.includes(tipo)) return json({erro:'Rota inexistente'},404);
  if (request.method==='GET') {
   if(user.papel!=='diretoria' && !permissoes[user.papel].includes(tipo)) return json({erro:'Sem permissao'},403);
   const q=id?env.DB.prepare('SELECT * FROM asr_crm_registros WHERE tipo=? AND id=?').bind(tipo,id):env.DB.prepare('SELECT * FROM asr_crm_registros WHERE tipo=? ORDER BY atualizado_em DESC,id DESC LIMIT 200').bind(tipo);
   return json((await q.all()).results.map(r=>({...r,dados:JSON.parse(r.dados_json),dados_json:undefined})));
  }
  if (!permissoes[user.papel].includes(tipo)) return json({erro:'Sem permissao'},403);
  if(!((request.method==='POST'&&!id)||(request.method==='PUT'&&id))) return json({erro:'Metodo nao permitido'},405);
  if(!request.headers.get('Content-Type')?.startsWith('application/json')) return json({erro:'Use application/json'},415);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>16384) return json({erro:'Registro grande demais'},413);
  let body; try {body=JSON.parse(raw);} catch{return json({erro:'JSON invalido'},400);}
  if(!body || typeof body!=='object' || Array.isArray(body) || typeof body.titulo!=='string' || !body.titulo.trim() || body.titulo.length>200) return json({erro:'Titulo obrigatorio, ate 200 caracteres'},400);
  if(body.valor_centavos!==undefined && (!Number.isSafeInteger(body.valor_centavos)||body.valor_centavos<0)) return json({erro:'Valor invalido'},400);
  if(request.method==='PUT') {
   const version=body.versao; delete body.versao;
   if(!Number.isSafeInteger(version)||version<1) return json({erro:'Versao obrigatoria'},400);
   const data=JSON.stringify(body);
   const result=await env.DB.batch([
    env.DB.prepare("INSERT INTO asr_crm_auditoria(id,registro_id,tipo,acao,ator_id,papel,antes_json,depois_json) SELECT ?,id,tipo,'editar',?,?,dados_json,? FROM asr_crm_registros WHERE id=? AND tipo=? AND versao=?").bind(crypto.randomUUID(),user.id,user.papel,data,id,tipo,version),
    env.DB.prepare('UPDATE asr_crm_registros SET dados_json=?,versao=versao+1,atualizado_por=?,atualizado_em=CURRENT_TIMESTAMP WHERE id=? AND tipo=? AND versao=?').bind(data,user.id,id,tipo,version)
   ]);
   return result[1].meta.changes===1?json({id,tipo,dados:body,versao:version+1}):json({erro:'Registro inexistente ou versao desatualizada'},409);
  }
  const newId=crypto.randomUUID(), data=JSON.stringify(body);
  await env.DB.batch([
   env.DB.prepare('INSERT INTO asr_crm_registros(id,tipo,dados_json,criado_por,atualizado_por) VALUES(?,?,?,?,?)').bind(newId,tipo,data,user.id,user.id),
   env.DB.prepare('INSERT INTO asr_crm_auditoria(id,registro_id,tipo,acao,ator_id,papel,depois_json) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),newId,tipo,'criar',user.id,user.papel,data)
  ]);
  return json({id:newId,tipo,dados:body},201);
 } catch {return json({erro:'Falha interna do CRM'},500);}
}

export default {
 async fetch(request,env,ctx) {
  if(new URL(request.url).pathname === '/api/health') {
   try {
    await env.DB.prepare('SELECT 1 AS ok').first();
    return Response.json({status:'ok',banco:'conectado'},{headers:{'Cache-Control':'no-store'}});
   } catch { return Response.json({status:'erro',banco:'indisponivel'},{status:503,headers:{'Cache-Control':'no-store'}}); }
  }
  const response=await crmFetch(request,env);
  if(response) return response;
  console.info({message:'Hello World Worker received a request!'});
  return new Response('Hello World!');
 }
};
