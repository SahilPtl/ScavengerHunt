export async function generateClue(checkpoint,{key=process.env.OPENAI_API_KEY,fetcher=fetch,timeout=3500}={}){
 const fallback={clue:checkpoint.clue,source:'Prepared clue'};
 if(!key?.trim())return fallback;
 try{
  const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key.trim()}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(timeout),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',input:`Write a playful university scavenger hunt clue in 1–3 sentences for ${checkpoint.name}. Never include the destination name. Return only the clue.`,max_output_tokens:160,store:false})});
  if(!response.ok)return fallback;
  const body=await response.json();const text=body.output?.flatMap(i=>i.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join(' ').trim();
  if(!text||text.length>700||text.toLowerCase().includes(checkpoint.name.toLowerCase()))return fallback;
  return {clue:text,source:'AI-generated draft'};
 }catch{return fallback;}
}
