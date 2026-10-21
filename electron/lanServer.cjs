const http=require('node:http'),os=require('node:os'),crypto=require('node:crypto'),dgram=require('node:dgram');
const MULTICAST='239.255.42.99',DISCOVERY=45825,LIMIT=48*1024*1024;
const localIPv4=ip=>/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)||ip==='127.0.0.1';
function address(value){const u=new URL('http://'+value);if(!localIPv4(u.hostname)||!/^\d+$/.test(u.port)||Number(u.port)>65535||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Usa la dirección IP local y puerto mostrados por el receptor.');return u;}
function request(host,route,body){const u=address(host),encoded=body?Buffer.from(JSON.stringify(body)):null;return new Promise((ok,no)=>{const req=http.request({hostname:u.hostname,port:u.port,path:route,method:body?'POST':'GET',timeout:30000,headers:{'content-type':'application/json','content-length':encoded?.length||0}},res=>{let size=0,chunks=[];res.on('data',b=>{size+=b.length;if(size>LIMIT){res.destroy();no(Error('Transferencia demasiado grande.'));}else chunks.push(b);});res.on('end',()=>{try{const r=JSON.parse(Buffer.concat(chunks));if(res.statusCode!==200)throw Error(r.error||'Conexión rechazada.');ok(r);}catch(e){no(e);}});});req.on('timeout',()=>req.destroy(Error('El dispositivo no respondió.')));req.on('error',no);if(encoded)req.write(encoded);req.end();});}
function createReceiver(meta){
 let state={phase:'waiting'},server,udp,timer;const expires=Date.now()+5*60*1000,session=crypto.randomUUID();let attempts=0,activeRequest=false;
 const hello={...meta,protocol:1,session,expires,name:os.hostname()};
 const stop=async()=>{clearInterval(timer);if(udp){try{udp.close();}catch{}}if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}state={phase:'closed'};};
 const start=()=>new Promise((ok,no)=>{
  server=http.createServer(async(req,res)=>{
   const reply=(status,value)=>{const encoded=Buffer.from(JSON.stringify(value));res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','content-length':encoded.length});res.end(encoded);};
   if(!localIPv4((req.socket.remoteAddress||'').replace('::ffff:','')))return reply(403,{error:'Solo red local.'});
   if(Date.now()>expires)return reply(410,{error:'El código caducó.'});
   if(req.headers.origin)return reply(403,{error:'Origen no permitido.'});
   if(req.method==='GET'&&req.url==='/hello')return reply(200,hello);
   if(req.method==='GET'&&req.url==='/status/'+state.ticket)return reply(200,{phase:state.phase});
   if(req.method!=='POST'||!['/pair','/transfer'].includes(req.url))return reply(404,{error:'Ruta inválida.'});
   if(activeRequest)return reply(429,{error:'Espera a la transferencia actual.'});
   if(req.url==='/pair'&&(state.phase!=='waiting'||++attempts>5))return reply(429,{error:'Emparejamiento no disponible. Genera otro código.'});
   activeRequest=true;
   try{const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>(req.url==='/pair'?8192:LIMIT))throw Error('Transferencia demasiado grande.');chunks.push(b);}const body=JSON.parse(Buffer.concat(chunks));
    if(req.url==='/pair'){state={phase:'pairing',ticket:crypto.randomUUID(),packet:body};reply(200,{ticket:state.ticket});}
    else{if(state.phase!=='accepted'||body.ticket!==state.ticket)throw Error('Conexión no autorizada.');if(!body.packet?.iv||typeof body.packet?.data!=='string')throw Error('Contenido inválido.');state={...state,phase:'received',packet:body.packet};reply(200,{ok:true});}
   }catch(e){reply(400,{error:e.message});}finally{activeRequest=false;}
  });server.requestTimeout=30000;server.headersTimeout=10000;server.on('error',no);server.listen(0,'0.0.0.0',()=>{
   const port=server.address().port,ips=Object.values(os.networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal&&localIPv4(n.address)).map(n=>n.address);
   udp=dgram.createSocket('udp4');udp.on('error',()=>{});const announce=()=>{if(Date.now()>expires){stop();return;}const payload=Buffer.from(JSON.stringify({elara:1,name:hello.name,port,edition:meta.edition,version:meta.version}));udp.send(payload,DISCOVERY,MULTICAST,()=>{});};timer=setInterval(announce,2000);announce();ok({...hello,addresses:ips.map(ip=>ip+':'+port),port});
  });
 });
 return {start,stop,status:()=>({...state,expires}),accept:ticket=>{if(Date.now()>expires||state.phase!=='pairing'||ticket!==state.ticket)throw Error('Solicitud caducada.');state.phase='accepted';},reject:()=>{state={phase:'waiting'};},finish:()=>{state={phase:'done',ticket:state.ticket};}};
}
function discover(){return new Promise(resolve=>{const found=new Map(),socket=dgram.createSocket({type:'udp4',reuseAddr:true});let done=false;const finish=()=>{if(done)return;done=true;try{socket.close();}catch{}resolve([...found.values()]);};socket.on('error',finish);socket.on('message',(data,remote)=>{try{const a=JSON.parse(data);if(a.elara===1&&localIPv4(remote.address)&&Number.isInteger(a.port)&&a.port>0&&a.port<65536)found.set(remote.address+':'+a.port,{...a,address:remote.address+':'+a.port});}catch{}});socket.bind(DISCOVERY,()=>{try{socket.addMembership(MULTICAST);}catch{finish();}});setTimeout(finish,3500);});}
module.exports={createReceiver,request,discover,address};
