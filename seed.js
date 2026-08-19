
require('dotenv').config();
const {Pool}=require('pg');
const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{
 const c=await pool.connect();
 try{
  await c.query(require('fs').readFileSync(require('path').join(__dirname,'schema.sql'),'utf8'));
  const adminHash=await bcrypt.hash('Admin@123',12), memberHash=await bcrypt.hash('Member@123',12);
  await c.query(`INSERT INTO users(name,email,password_hash,role) VALUES
   ('Team Admin','admin@cultura.local',$1,'admin'),
   ('Aarav Member','member@cultura.local',$2,'member')
   ON CONFLICT(email) DO NOTHING`,[adminHash,memberHash]);
  await c.query(`INSERT INTO groups(name,description) VALUES
   ('Music','Singing, instruments and music'),('Dance','Classical, folk and contemporary dance'),('Acting','Drama, theatre and stage performance')
   ON CONFLICT DO NOTHING`);
  const member=(await c.query(`SELECT id FROM users WHERE email='member@cultura.local'`)).rows[0];
  const groups=(await c.query(`SELECT id FROM groups ORDER BY id LIMIT 2`)).rows;
  for(const g of groups) await c.query(`INSERT INTO user_groups(user_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[member.id,g.id]);
  const lead=(await c.query(`SELECT id FROM groups ORDER BY id LIMIT 2`)).rows;
  for(const g of lead) await c.query(`UPDATE groups SET leader_id=$1 WHERE id=$2`,[member.id,g.id]);
  await c.query(`INSERT INTO competitions(title,date,time,venue,description) VALUES
   ('Inter-College Cultural Fest','2026-09-12','10:00','Main Auditorium','Annual cultural competition.'),
   ('District Dance Championship','2026-09-26','09:00','City Hall','Dance teams compete across colleges.')`);
  await c.query(`INSERT INTO announcements(title,text) VALUES
   ('Practice schedule updated','Music and Dance practice timings have been updated.'),
   ('Registration deadline','All competition registrations close this Friday.')`);
  await c.query(`INSERT INTO attendance(user_id,group_id,date,status)
   SELECT $1,id,'2026-08-18','present' FROM groups WHERE name='Music'
   ON CONFLICT DO NOTHING`,[member.id]);
  await c.query(`INSERT INTO attendance(user_id,group_id,date,status)
   SELECT $1,id,'2026-08-19','late' FROM groups WHERE name='Music'
   ON CONFLICT DO NOTHING`,[member.id]);
  console.log('Database initialized. Demo users: admin@cultura.local / Admin@123 and member@cultura.local / Member@123');
 }finally{c.release();await pool.end()}
})().catch(e=>{console.error(e);process.exit(1)});
