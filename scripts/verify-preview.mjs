import assert from 'node:assert/strict';
import {pool} from '../server/database/db.js';
const base='http://127.0.0.1:3003/api';
const email=`preview-verification-${Date.now()}@example.test`;
async function request(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
try {
 assert.equal((await request('/health')).data.demo,false);
 assert.equal((await request('/auth/login',{email:'demo@mnnit.com',password:'demo123'})).status,401);
 const account=await request('/auth/register',{email,name:'Preview verification',password:'PreviewTest123!'});
 assert.equal(account.status,201);
 for(const path of ['/demo/reset','/demo/arrival','/demo/simulate'])assert.equal((await request(path,{huntId:1},account.data.token)).status,403);
 assert.equal((await request('/demo/checkpoints/1',null,account.data.token)).status,403);
 assert.equal((await request('/ai/generate-clue',{location:'Central Library'},account.data.token)).status,403);
 const page=await fetch('http://127.0.0.1:3003/login').then(r=>r.text());
 const script=page.match(/src="([^" ]+\.js)"/)?.[1];assert.ok(script);
 const code=await fetch('http://127.0.0.1:3003'+script).then(r=>r.text());assert.equal(code.includes('demo@mnnit.com'),false);assert.equal(code.includes('demo123'),false);
 console.log('PASS: public config health, seeded login rejection, authenticated demo/organizer denial, and credential-free browser build.');
}finally{await pool.query('DELETE FROM users WHERE email=$1',[email]);await pool.end();}
