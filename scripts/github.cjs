// Token stays in memory; no credential helper or credentials in Git configuration.
const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
async function main() {
 const candidates = [path.join(process.env.USERPROFILE,'.pats'),path.resolve(root,'..','.pats')];
 const file = candidates.find(p=>fs.existsSync(p));
 if (!file) throw Error('No local PAT file found');
 const token = fs.readFileSync(file,'utf8').match(/(?:github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+)/)?.[0];
 if (!token) throw Error('No recognized PAT in local file');
 const headers = {Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'};
 const request=async(url,options={})=>{const r=await fetch('https://api.github.com'+url,{...options,headers:{...headers,...options.headers}}); if(!r.ok)throw Error('GitHub HTTP '+r.status); return r.status===204?null:r.json();};
 const user=await request('/user');
 if(user.login!=='SahilPtl') throw Error('Authenticated identity is not SahilPtl; writes blocked');
 const repo=await request('/repos/SahilPtl/ScavengerHunt');
 if(repo.owner.login!=='SahilPtl'||!repo.permissions?.push)throw Error('Wrong owner or no push permission');
 const git='C:/Users/sahil/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
 const read=(...args)=>cp.execFileSync(git,args,{cwd:root,encoding:'utf8'}).trim();
 if(read('remote','get-url','origin')!=='https://github.com/SahilPtl/ScavengerHunt.git'||read('config','user.name')!=='SahilPtl'||read('config','user.email')!=='SahilPtl@users.noreply.github.com')throw Error('Remote or local author mismatch');
 console.log(JSON.stringify({login:user.login,owner:repo.owner.login,defaultBranch:repo.default_branch,push:repo.permissions.push}));
 if(process.argv[2]==='archive') {
  const ref='refs/heads/archive/pre-rebuild-2026-09-25';
  await request('/repos/SahilPtl/ScavengerHunt/git/refs',{method:'POST',body:JSON.stringify({ref,sha:read('rev-parse','origin/main')})});
  console.log('Archived original main');
 }
 if(process.argv[2]==='push') {
  const env={...process.env,GIT_EXEC_PATH:path.dirname(git)+'/../mingw64/bin',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:'AUTHORIZATION: basic '+Buffer.from('x-access-token:'+token).toString('base64'),GIT_TERMINAL_PROMPT:'0'};
  cp.execFileSync(git,['-c','credential.helper=','push','origin',process.argv[3]||'HEAD'],{cwd:root,env,stdio:'inherit'});
 }
}
main().catch(e=>{console.error(e.message);process.exit(1)});
