import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
function run(command,args,options={}){const r=spawnSync(command,args,{stdio:'inherit',...options});if(r.error||r.status!==0)throw Error(`Command failed: ${command} ${args.join(' ')}`);}
function npm(args){if(process.platform==='win32')run(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm '+args.join(' ')]);else run('npm',args);}
try{
 if(Number(process.versions.node.split('.')[0])<20)throw Error('Node.js 20 or newer is required');
 for(const part of ['server','client'])if(!fs.existsSync(path.join(root,part,'node_modules')))npm(['--prefix',part,'ci']);
 if(process.platform==='win32'&&fs.existsSync('.local/postgres/PG_VERSION')){
  const pg='C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe';
  const status=spawnSync(pg,['-D',path.join(root,'.local/postgres'),'status'],{stdio:'ignore'});
  if(status.status!==0)run(pg,['-D',path.join(root,'.local/postgres'),'-l',path.join(root,'.local/postgres.log'),'-o','-p 55432 -h 127.0.0.1','start']);
 }
 npm(['run','db:setup']);npm(['run','build']);
 const {config}=await import('../server/config.js');
 const url=`http://${config.host}:${config.port}`;
 const occupied=await fetch(url+'/api/health',{signal:AbortSignal.timeout(700)}).then(()=>true).catch(()=>false);
 if(occupied)throw Error(`Port ${config.port} is already serving HTTP. Run npm run stop, or choose PORT in server/.env.`);
 const child=spawn(process.execPath,[path.join(root,'server/server.js')],{cwd:root,stdio:'inherit'});
 fs.mkdirSync('.local',{recursive:true});fs.writeFileSync('.local/server-pid',String(child.pid));
 let ready=false;for(let i=0;i<30;i++){if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,500));ready=await fetch(url+'/api/health').then(r=>r.ok).catch(()=>false);if(ready)break;}
 if(!ready){child.kill();throw Error('API did not become healthy. Check database and port.');}
 console.log(`\nREADY: ${url}\nExplorer 1: demo@mnnit.com / demo123\nExplorer 2: player2@mnnit.com / demo123\nOpen independent browser tabs; tokens are isolated per tab.\nCtrl+C stops the API. npm run stop also stops the dedicated database.\n`);
 process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
 child.on('exit',code=>{try{fs.unlinkSync('.local/server-pid')}catch{}process.exitCode=code||0;});
}catch(e){console.error(e.message);process.exitCode=1;}
