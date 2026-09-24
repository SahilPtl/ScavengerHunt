import pg from 'pg';
import {config} from '../config.js';
export const pool=new pg.Pool({connectionString:config.database,max:10,connectionTimeoutMillis:4000});
export async function transaction(work){const client=await pool.connect();try{await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
