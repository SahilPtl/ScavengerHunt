import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,config} from '../server/config.js';
const source=path.join(root,'server/.env'),backup=path.join(root,'server/.env.verification-backup');
if(fs.existsSync(backup))throw Error('Backup already exists; do not overwrite it');
const existed=fs.existsSync(source);
try{
 if(existed)fs.renameSync(source,backup);
 const result=spawnSync(process.execPath,[path.join(root,'server/database/setup.js')],{cwd:root,env:{...process.env,DATABASE_URL:config.database,OPENAI_API_KEY:''},stdio:'inherit'});
 if(result.status!==0)throw Error('Missing .env check failed');
 console.log('PASS: no .env file required when the PostgreSQL connection is supplied by the environment.');
}finally{if(existed)fs.renameSync(backup,source);}
