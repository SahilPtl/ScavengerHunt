import {pool,transaction} from '../database/db.js';
import {fail,distance,coordinates,integer} from '../utils.js';
import {config} from '../config.js';
export async function participant(db,user,hunt,lock=false){const {rows:[p]}=await db.query('SELECT * FROM hunt_participants WHERE user_id=$1 AND hunt_id=$2'+(lock?' FOR UPDATE':''),[user,integer(hunt)]);if(!p)throw fail(404,'Join this hunt first');return p;}
export async function target(db,p){return (await db.query('SELECT * FROM checkpoints WHERE hunt_id=$1 AND sequence_number=$2',[p.hunt_id,p.current_checkpoint])).rows[0];}
export async function progress(user,hunt){return transaction(async db=>{const p=await participant(db,user,hunt,true),c=await target(db,p);const completed=(await db.query('SELECT c.id,c.name,c.latitude,c.longitude,cc.points_awarded FROM checkpoint_completions cc JOIN checkpoints c ON c.id=cc.checkpoint_id WHERE participant_id=$1 ORDER BY c.sequence_number',[p.id])).rows;const location=(await db.query('SELECT latitude,longitude,mode,updated_at FROM player_locations WHERE participant_id=$1',[p.id])).rows[0]||null;const hint=c&&(await db.query('SELECT 1 FROM hints_used WHERE participant_id=$1 AND checkpoint_id=$2',[p.id,c.id])).rowCount?c.hint:null;return {...p,completed,location,clue:c?{id:c.id,text:c.clue,source:'Prepared clue',hint}:null,total:6};});}
export async function saveLocation(db,p,body){const point=coordinates(body);const mode=body.mode==='demo'?'demo':'gps';if(mode==='demo'&&!config.demo)throw fail(403,'Demo location disabled');await db.query('INSERT INTO player_locations(participant_id,latitude,longitude,mode) VALUES($1,$2,$3,$4) ON CONFLICT(participant_id) DO UPDATE SET latitude=$2,longitude=$3,mode=$4,updated_at=now()',[p.id,point.latitude,point.longitude,mode]);return point;}
export async function location(user,hunt,body){return transaction(async db=>{const p=await participant(db,user,hunt,true);await saveLocation(db,p,body);return {saved:true};});}
export async function check(user,hunt,checkpointId,complete){return transaction(async db=>{
 const p=await participant(db,user,hunt,true);const id=integer(checkpointId);
 const previous=(await db.query('SELECT points_awarded FROM checkpoint_completions WHERE participant_id=$1 AND checkpoint_id=$2',[p.id,id])).rows[0];
 if(previous&&complete)return {alreadyCompleted:true,points:previous.points_awarded};
 const c=await target(db,p);if(!c||c.id!==id)throw fail(409,'Checkpoint order changed; refresh your progress');
 const loc=(await db.query("SELECT * FROM player_locations WHERE participant_id=$1 AND updated_at > now()-interval '5 minutes'",[p.id])).rows[0];if(!loc)throw fail(400,'Update your location first');
 const meters=distance(loc,c),reached=meters<=c.radius;if(!reached)throw fail(422,`You are ${Math.round(meters)} meters away from the destination`);
 if(!complete)return {reached,distance:Math.round(meters)};
 const {rows:[timing]}=await db.query('SELECT EXTRACT(EPOCH FROM (now()-COALESCE(MAX(completed_at),$2::timestamptz)))::float AS seconds FROM checkpoint_completions WHERE participant_id=$1',[p.id,p.started_at]);
 const bonus=Math.max(0,50-Math.floor(timing.seconds/6));const final=c.sequence_number===6;const points=c.score_reward+bonus+(final?200:0);
 await db.query('INSERT INTO checkpoint_completions(participant_id,checkpoint_id,points_awarded) VALUES($1,$2,$3)',[p.id,c.id,points]);
 await db.query('UPDATE hunt_participants SET score=score+$1,current_checkpoint=current_checkpoint+1,completed_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$3',[points,final,p.id]);
 return {reached:true,points,completed:final,distance:Math.round(meters)};
});}
export async function hint(user,hunt,checkpointId){return transaction(async db=>{const p=await participant(db,user,hunt,true),c=await target(db,p);if(!c||c.id!==integer(checkpointId))throw fail(409,'Checkpoint changed');const inserted=await db.query('INSERT INTO hints_used VALUES($1,$2) ON CONFLICT DO NOTHING',[p.id,c.id]);if(inserted.rowCount)await db.query('UPDATE hunt_participants SET score=score-20 WHERE id=$1',[p.id]);return {hint:c.hint,charged:!!inserted.rowCount};});}
export async function leaderboard(hunt){return (await pool.query('SELECT p.user_id,p.team_name,p.score,p.current_checkpoint-1 AS completed,p.completed_at,p.started_at,u.simulated FROM hunt_participants p JOIN users u ON u.id=p.user_id WHERE p.hunt_id=$1 ORDER BY score DESC,current_checkpoint DESC,completed_at ASC NULLS LAST,started_at ASC,p.id ASC',[integer(hunt)])).rows;}
