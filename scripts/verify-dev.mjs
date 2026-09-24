import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const children=[];
try {
 for(const [part,url] of [['server','http://127.0.0.1:3001/api/health'],['client','http://127.0.0.1:3002']]){
  const child=process.platform==='win32'?spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm run dev'],{cwd:path.join(root,part),stdio:'pipe',windowsHide:true}):spawn('npm',['run','dev'],{cwd:path.join(root,part),stdio:'pipe'});
  children.push(child);child.stdout.on('data',data=>process.stdout.write(data));child.stderr.on('data',data=>process.stderr.write(data));
  let ready=false;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,500));ready=await fetch(url).then(r=>r.ok).catch(()=>false);if(ready)break;}
  if(!ready)throw Error(part+' dev failed health check');console.log('PASS '+part+' npm run dev '+url);
 }
 const proxy=await fetch('http://127.0.0.1:3002/api/health').then(r=>r.json());if(!proxy.success)throw Error('Vite proxy failed');console.log('PASS Vite /api proxy to PostgreSQL-backed API');
}finally{for(const child of children){if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill();}}
