
require('dotenv').config();
const path=require('path'),fs=require('fs'),express=require('express'),cors=require('cors'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),fileUpload=require('express-fileupload');
const {Pool}=require('pg'); const http=require('http'); const {Server}=require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const app=express(), server=http.createServer(app), io=new Server(server,{cors:{origin:true,credentials:true}});
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const PORT=process.env.PORT||4000, JWT_SECRET=process.env.JWT_SECRET||'dev-secret-change-me';
app.use(cors({origin:true}));app.use(express.json({limit:'2mb'}));app.use(fileUpload({limits:{fileSize:10*1024*1024},abortOnLimit:true}));
const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET=process.env.SUPABASE_STORAGE_BUCKET||'cultural-files';
if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
  console.warn('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
  : null;
app.use(express.static(path.join(__dirname,'../../frontend')));

function sign(u){return jwt.sign({id:u.id,role:u.role},JWT_SECRET,{expiresIn:'7d'})}
async function auth(req,res,next){try{let h=req.headers.authorization||'';if(!h.startsWith('Bearer '))throw Error();req.user=jwt.verify(h.slice(7),JWT_SECRET);next()}catch{res.status(401).json({error:'Unauthorized'})}}
function admin(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Admin only'});next()}
async function q(text,params=[]){return (await pool.query(text,params)).rows}

app.post('/api/auth/login',async(req,res)=>{try{let {email,password}=req.body,u=(await q('SELECT * FROM users WHERE lower(email)=lower($1)',[email]))[0];if(!u||!(await bcrypt.compare(password,u.password_hash)))return res.status(401).json({error:'Invalid login'});let user={id:u.id,name:u.name,email:u.email,role:u.role};let groups=await q('SELECT g.* FROM groups g JOIN user_groups ug ON ug.group_id=g.id WHERE ug.user_id=$1 ORDER BY g.id',[u.id]);user.groups=groups;res.json({token:sign(u),user})}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/auth/me',auth,async(req,res)=>{let u=(await q('SELECT id,name,email,role FROM users WHERE id=$1',[req.user.id]))[0];u.groups=await q('SELECT g.* FROM groups g JOIN user_groups ug ON ug.group_id=g.id WHERE ug.user_id=$1 ORDER BY g.id',[u.id]);res.json({user:u})});
app.get('/api/dashboard',auth,async(req,res)=>{try{let is=req.user.role==='admin';let memberCount=(await q("SELECT count(*) n FROM users WHERE role='member'"))[0].n;let groupCount=(await q('SELECT count(*) n FROM groups'))[0].n;let competitions=(await q('SELECT count(*) n FROM competitions WHERE date>=CURRENT_DATE'))[0].n;let attendance=(await q(is?'SELECT count(*) n FROM attendance':'SELECT count(*) n FROM attendance WHERE user_id=$1',is?[]:[req.user.id]))[0].n;let present=(await q("SELECT count(*) n FROM attendance WHERE status='present'"))[0].n,late=(await q("SELECT count(*) n FROM attendance WHERE status='late'"))[0].n;let membersOrGroups=is?+memberCount:+((await q('SELECT count(*) n FROM user_groups WHERE user_id=$1',[req.user.id]))[0].n);res.json({memberCount:+memberCount,groupCount:+groupCount,competitions:+competitions,attendance:+attendance,present:+present,late:+late,membersOrGroups})}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.get('/api/members',auth,admin,async(req,res)=>res.json(await q(`SELECT u.id,u.name,u.email,u.role,COALESCE(json_agg(json_build_object('id',g.id,'name',g.name)) FILTER(WHERE g.id IS NOT NULL),'[]') groups FROM users u LEFT JOIN user_groups ug ON ug.user_id=u.id LEFT JOIN groups g ON g.id=ug.group_id WHERE u.role='member' GROUP BY u.id ORDER BY u.id`)));
app.post('/api/members',auth,admin,async(req,res)=>{try{let {name,email,password,groups=[]}=req.body;name=String(name||'').trim();email=String(email||'').trim().toLowerCase();password=String(password||'');if(!name||!email||!password)return res.status(400).json({error:'Name, email and password are required'});if(password.length<6)return res.status(400).json({error:'Password must be at least 6 characters'});if((await q('SELECT id FROM users WHERE lower(email)=lower($1)',[email]))[0])return res.status(409).json({error:'A user with this email already exists'});let h=await bcrypt.hash(password,12);let u=(await q("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'member') RETURNING id,name,email",[name,email,h]))[0];for(let g of (Array.isArray(groups)?groups:[]))await q('INSERT INTO user_groups(user_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[u.id,g]);res.json({ok:true,id:u.id,name:u.name,email:u.email})}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.put('/api/members/:id',auth,admin,async(req,res)=>{try{let {name,email,password,groups=[]}=req.body;name=String(name||'').trim();email=String(email||'').trim().toLowerCase();if(!name||!email)return res.status(400).json({error:'Name and email are required'});if((await q('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2',[email,req.params.id]))[0])return res.status(409).json({error:'Another user already uses this email'});await q('UPDATE users SET name=$1,email=$2 WHERE id=$3',[name,email,req.params.id]);if(String(password||'').trim()){if(String(password).length<6)return res.status(400).json({error:'Password must be at least 6 characters'});await q('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(String(password),12),req.params.id])}await q('DELETE FROM user_groups WHERE user_id=$1',[req.params.id]);for(let g of (Array.isArray(groups)?groups:[]))await q('INSERT INTO user_groups(user_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.params.id,g]);res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.delete('/api/members/:id',auth,admin,async(req,res)=>{await q('DELETE FROM users WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.get('/api/groups',auth,async(req,res)=>res.json(await q(`SELECT g.*,g.leader_id,COALESCE(u.name,'') leader_name FROM groups g LEFT JOIN users u ON u.id=g.leader_id ORDER BY g.id`)));
app.post('/api/groups',auth,admin,async(req,res)=>{let {name,description,leader_id}=req.body;let g=(await q('INSERT INTO groups(name,description,leader_id) VALUES($1,$2,$3) RETURNING id',[name,description||'',leader_id||null]))[0];res.json(g)});
app.put('/api/groups/:id',auth,admin,async(req,res)=>{let {name,description,leader_id}=req.body;await q('UPDATE groups SET name=$1,description=$2,leader_id=$3 WHERE id=$4',[name,description||'',leader_id||null,req.params.id]);res.json({ok:true})});
app.delete('/api/groups/:id',auth,admin,async(req,res)=>{await q('DELETE FROM groups WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.get('/api/competitions',auth,async(req,res)=>{try{res.json(await q('SELECT * FROM competitions ORDER BY date,time NULLS LAST,id'))}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.post('/api/competitions',auth,admin,async(req,res)=>{try{let x=req.body;res.json((await q('INSERT INTO competitions(title,date,time,venue,description,document_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[x.title,x.date,x.time||null,x.venue||'',x.description||'',x.document_url||'']))[0])}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.put('/api/competitions/:id',auth,admin,async(req,res)=>{try{let x=req.body,row=(await q('UPDATE competitions SET title=$1,date=$2,time=$3,venue=$4,description=$5,document_url=$6 WHERE id=$7 RETURNING *',[x.title,x.date,x.time||null,x.venue||'',x.description||'',x.document_url||'',req.params.id]))[0];if(!row)return res.status(404).json({error:'Competition not found'});res.json(row)}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.delete('/api/competitions/:id',auth,admin,async(req,res)=>{try{await q('DELETE FROM competitions WHERE id=$1',[req.params.id]);res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.get('/api/announcements',auth,async(req,res)=>res.json(await q('SELECT * FROM announcements ORDER BY created_at DESC')));
app.post('/api/announcements',auth,admin,async(req,res)=>{let x=req.body;res.json(await q('INSERT INTO announcements(title,text) VALUES($1,$2) RETURNING *',[x.title,x.text]))});
app.get('/api/profile',auth,async(req,res)=>{let u=(await q('SELECT id,name,email,role FROM users WHERE id=$1',[req.user.id]))[0],groups=await q('SELECT g.* FROM groups g JOIN user_groups ug ON ug.group_id=g.id WHERE ug.user_id=$1',[u.id]),records=await q('SELECT a.*,g.name group_name FROM attendance a JOIN groups g ON g.id=a.group_id WHERE a.user_id=$1 ORDER BY a.date DESC',[u.id]);let good=records.filter(x=>x.status!=='absent').length,absent=records.filter(x=>x.status==='absent').length;res.json({...u,groups,records,good,absent,percent:records.length?Math.round(good/records.length*100):0})});
app.get('/api/attendance',auth,admin,async(req,res)=>{let date=req.query.date,gs=await q('SELECT * FROM groups ORDER BY id');for(let g of gs){g.members=await q(`SELECT u.id,u.name,COALESCE((SELECT status FROM attendance WHERE user_id=u.id AND group_id=$1 AND date=$2),'') today,COALESCE((SELECT round(100.0*count(*) FILTER(WHERE status IN ('present','late'))/NULLIF(count(*),0)) FROM attendance WHERE user_id=u.id AND group_id=$1),0) percent FROM users u JOIN user_groups ug ON ug.user_id=u.id WHERE ug.group_id=$1 AND u.role='member' ORDER BY u.name`,[g.id,date])}res.json({groups:gs})});
app.post('/api/attendance',auth,admin,async(req,res)=>{try{let x=req.body;if(!x.user_id||!x.group_id||!x.date||!['present','late','absent'].includes(x.status))return res.status(400).json({error:'Invalid attendance data'});await q(`INSERT INTO attendance(user_id,group_id,date,status) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,group_id,date) DO UPDATE SET status=EXCLUDED.status`,[x.user_id,x.group_id,x.date,x.status]);io.emit('attendance_updated');res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.get('/api/groups/:id/messages',auth,async(req,res)=>{let allowed=(await q('SELECT 1 FROM user_groups WHERE user_id=$1 AND group_id=$2',[req.user.id,req.params.id])).length||req.user.role==='admin';if(!allowed)return res.status(403).json({error:'Not a group member'});res.json(await q('SELECT m.*,u.name user_name FROM messages m JOIN users u ON u.id=m.user_id WHERE group_id=$1 ORDER BY created_at',[req.params.id]))});
app.post('/api/groups/:id/messages',auth,async(req,res)=>{let allowed=(await q('SELECT 1 FROM user_groups WHERE user_id=$1 AND group_id=$2',[req.user.id,req.params.id])).length||req.user.role==='admin';if(!allowed)return res.status(403).json({error:'Not a group member'});let m=(await q('INSERT INTO messages(group_id,user_id,text) VALUES($1,$2,$3) RETURNING *',[req.params.id,req.user.id,req.body.text]))[0];io.to('group:'+req.params.id).emit('message',m);res.json(m)});
app.post('/api/upload',auth,async(req,res)=>{
  try{
    if(!supabase) return res.status(503).json({error:'Supabase Storage is not configured'});
    const file=req.files?.file;
    if(!file) return res.status(400).json({error:'No file uploaded'});
    const safe=String(file.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
    const objectPath=`${req.user.id}/${Date.now()}-${safe}`;
    const {error}=await supabase.storage.from(STORAGE_BUCKET).upload(
      objectPath,file.data,{contentType:file.mimetype||'application/octet-stream',upsert:false}
    );
    if(error) throw error;
    const { data: signed, error: signedError } =
      await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(objectPath, 60 * 60);

    if (signedError) throw signedError;

    res.json({
      url: signed.signedUrl,
      name: file.name,
      path: objectPath,
      bucket: STORAGE_BUCKET
    });
  }catch(e){console.error(e);res.status(500).json({error:'Upload failed'})}
});
io.on('connection',socket=>{socket.on('join_group',gid=>socket.join('group:'+gid))});
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});
server.listen(PORT,()=>console.log(`Cultura running on http://localhost:${PORT}`));
