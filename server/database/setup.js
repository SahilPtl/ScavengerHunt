import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import {pool,transaction} from './db.js';
import {config} from '../config.js';
try{
 await transaction(async db=>{
  await db.query(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
  await db.query(await fs.readFile(new URL('./seed.sql',import.meta.url),'utf8'));
  if(config.demo){
   const hash=await bcrypt.hash('demo123',12);
   for(const [name,email,role,simulated] of [['Explorer One','demo@mnnit.com','organizer',false],['Explorer Two','player2@mnnit.com','player',false],['Rahul','rahul@example.test','player',true],['Priya','priya@example.test','player',true],['Arjun','arjun@example.test','player',true]]){
    const {rows:[user]}=await db.query('INSERT INTO users(name,email,password_hash,role,simulated,demo_account) VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id',[name,email,hash,role,simulated]);
    if(simulated)await db.query('INSERT INTO hunt_participants(hunt_id,user_id,team_name) VALUES(1,$1,$2) ON CONFLICT DO NOTHING',[user.id,name]);
   }
  }
 });console.log('Schema and playable seeds ready (existing progress preserved).');
}catch(e){console.error('Database setup failed:',e.code||'connection/configuration error');process.exitCode=1;}finally{await pool.end();}
