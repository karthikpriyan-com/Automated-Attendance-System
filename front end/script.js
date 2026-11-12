/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>d.toISOString().slice(0,10);
const today=()=>iso(new Date());
const nowT=()=>new Date().toTimeString().slice(0,5);
const LOW=75;
let n=100;const uid=p=>p+(++n);
const col=v=>v<LOW?'var(--bad)':v<85?'var(--warn)':'var(--ok)';

/* ---------- demo database (in memory) ---------- */
const db={
  faculty:[{id:'F1',name:'Dr. Meera Iyer',dept:'CSE',email:'f1@college.edu',pw:'1234'},{id:'F2',name:'Prof. Arjun Rao',dept:'CSE',email:'f2@college.edu',pw:'1234'}],
  subjects:[{id:'SUB1',name:'Data Structures',fac:'F1'},{id:'SUB2',name:'Database Systems',fac:'F1'},{id:'SUB3',name:'Operating Systems',fac:'F2'},{id:'SUB4',name:'Software Engineering',fac:'F2'}],
  students:[],records:[],sessions:[]
};
const admin={id:'A1',name:'Admin',email:'admin@college.edu',pw:'admin'};
(function seed(){
  const names=['Aarav Shah','Diya Menon','Kabir Singh','Isha Verma','Rohan Das','Sana Khan','Vikram Nair','Priya Pillai'];
  const rates=[.95,.9,.82,.68,.6,.88,.78,.92];
  names.forEach((nm,i)=>db.students.push({id:'S'+(101+i),name:nm,dept:'CSE',year:2,sec:'A',email:'s'+(101+i)+'@college.edu',pw:'1234'}));
  for(let d=1;d<=20;d++){
    const dt=iso(new Date(Date.now()-d*864e5));
    db.subjects.forEach((b,k)=>db.students.forEach((s,i)=>db.records.push({sid:s.id,sub:b.id,date:dt,time:'0'+(9+k)+':05',status:Math.random()<rates[i]?'Present':'Absent',note:''})));
  }
})();
const pct=(sid,sub)=>{const r=db.records.filter(x=>x.sid==sid&&(!sub||x.sub==sub));const p=r.filter(x=>x.status=='Present').length;return{p,t:r.length,v:r.length?Math.round(p/r.length*100):0}};
const subName=id=>(db.subjects.find(b=>b.id==id)||{name:id}).name;
const stuName=id=>(db.students.find(s=>s.id==id)||{name:id}).name;
const todayRec=(sid,sub)=>db.records.find(x=>x.sid==sid&&x.sub==sub&&x.date==today());
function setStatus(sid,sub,st,note=''){
  const r=todayRec(sid,sub);
  if(r){r.status=st;r.time=nowT();if(note)r.note=note}
  else db.records.push({sid,sub,date:today(),time:nowT(),status:st,note});
}

/* ---------- state ---------- */
let me=null,tab='';
let rep={type:'student',sub:'',val:''};
const TABS={student:[['dashboard','Dashboard'],['history','History']],faculty:[['sessions','Class sessions'],['reports','Reports']],admin:[['overview','Overview'],['students','Students'],['subjects','Faculty & subjects'],['reports','Reports']]};

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600)}

/* ---------- login ---------- */
function viewLogin(msg=''){
  $('#root').innerHTML=`<div class="login">
  <section class="hero"><div class="frame"><i></i><i></i><i></i><i></i><b></b>
    <svg viewBox="0 0 100 100"><circle cx="50" cy="38" r="18"/><path d="M16 92c2-24 16-34 34-34s32 10 34 34"/></svg></div>
    <div><h1>Automated Attendance System</h1><p>Scan your face, get marked present, and track every class.</p></div></section>
  <section class="formwrap"><form class="formbox" onsubmit="login(event)">
    <h2>Log in</h2>
    <label for="em">Email</label><input id="em" type="email" required autocomplete="username">
    <label for="pw">Password</label><input id="pw" type="password" required autocomplete="current-password">
    <div class="err" id="err" role="alert">${msg}</div>
    <button class="btn" style="width:100%">Log in</button>
    <p class="muted" style="margin:1.2rem 0 .4rem">Try a demo account:</p>
    <div class="demo">
      <button type="button" class="btn ghost sm" onclick="fill('s101@college.edu','1234')">Student</button>
      <button type="button" class="btn ghost sm" onclick="fill('f1@college.edu','1234')">Faculty</button>
      <button type="button" class="btn ghost sm" onclick="fill('admin@college.edu','admin')">Admin</button>
    </div></form></section></div>`;
}
function fill(e,p){$('#em').value=e;$('#pw').value=p}
function login(ev){
  ev.preventDefault();
  const e=$('#em').value.trim().toLowerCase(),p=$('#pw').value;
  let role=null,u=null;
  if(e==admin.email&&p==admin.pw){role='admin';u=admin}
  else if(u=db.faculty.find(x=>x.email==e&&x.pw==p))role='faculty';
  else if(u=db.students.find(x=>x.email==e&&x.pw==p))role='student';
  if(!role){$('#err').textContent='Email or password is incorrect. Check both and try again.';return}
  me={role,id:u.id,name:u.name};tab=TABS[role][0][0];render();
}
function logout(){closeScan();me=null;viewLogin()}

/* ---------- shell ---------- */
function render(){
  const views={student:vStudent,faculty:vFaculty,admin:vAdmin};
  $('#root').innerHTML=`<header class="top"><h2>Automated Attendance System</h2><span>${esc(me.name)} · ${me.role}</span><button class="btn ghost sm" style="color:#fff;border-color:#4a5b7a" onclick="logout()">Log out</button></header>
  <nav>${TABS[me.role].map(t=>`<button class="${t[0]==tab?'on':''}" onclick="go('${t[0]}')">${t[1]}</button>`).join('')}</nav>
  <main>${views[me.role]()}</main>`;
}
function go(t){tab=t;render()}

/* ---------- student ---------- */
function vStudent(){
  const s=db.students.find(x=>x.id==me.id);
  if(tab=='history'){
    const r=db.records.filter(x=>x.sid==s.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,40);
    return `<div class="card"><h3>Attendance history</h3><div class="scroll"><table><tr><th>Date</th><th>Time</th><th>Subject</th><th>Status</th></tr>
    ${r.map(x=>`<tr><td>${x.date}</td><td>${x.time}</td><td>${esc(subName(x.sub))}</td><td><span class="pill ${x.status=='Present'?'p':'a'}">${x.status}</span></td></tr>`).join('')}</table></div></div>`;
  }
  const o=pct(s.id);
  const lows=db.subjects.filter(b=>{const q=pct(s.id,b.id);return q.t&&q.v<LOW});
  const act=db.sessions.filter(x=>x.active);
  return `${lows.length?`<div class="alert"><b>Low attendance:</b> ${lows.map(b=>esc(b.name)+' ('+pct(s.id,b.id).v+'%)').join(', ')}. You need at least ${LOW}% in each subject.</div>`:`<div class="alert ok">Your attendance is above ${LOW}% in every subject.</div>`}
  <div class="grid mb">
    <div class="card"><h3>Overall attendance</h3><div class="overall"><div class="ring" style="--v:${o.v};--c:${col(o.v)}"><b>${o.v}%</b></div>
    <div><div class="muted">${o.p} present of ${o.t} classes</div><div class="muted">${esc(s.name)} · ${s.id}</div></div></div></div>
    <div class="card"><h3>Mark attendance</h3>${act.length?act.map(x=>{
      const done=todayRec(s.id,x.sub);const ok=done&&done.status=='Present';
      return `<div class="row sp mb"><div><b>${esc(subName(x.sub))}</b><div class="muted">Room ${esc(x.room||'-')}</div></div>
      ${ok?'<span class="pill p">Marked</span>':`<button class="btn sm" onclick="openScan('${x.id}')">Scan face</button>`}</div>`}).join(''):'<p class="muted">No class is open right now. Your faculty starts a session before you can mark attendance.</p>'}</div>
  </div>
  <div class="card"><h3>Subject-wise attendance</h3>${db.subjects.map(b=>{const q=pct(s.id,b.id);
    return `<div class="bar"><div class="t"><span>${esc(b.name)}</span><b>${q.v}% <span class="muted">(${q.p}/${q.t})</span></b></div><div class="b"><i style="width:${q.v}%;background:${col(q.v)}"></i></div></div>`}).join('')}</div>`;
}

/* ---------- face scan flow (student) ---------- */
let scan={sess:null,tries:0,stream:null};
function openScan(id){
  scan={sess:id,tries:0,stream:null};
  $('#manual').hidden=true;$('#scanBtn').disabled=false;$('#scanBtn').textContent='Scan face';
  $('#scanMsg').textContent='Position your face inside the frame.';
  $('#scanDlg').showModal();
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({video:true}).then(st=>{scan.stream=st;$('#vid').srcObject=st}).catch(()=>{$('#scanMsg').textContent='Camera is blocked or missing. Demo mode: scanning is simulated.'});
  }else $('#scanMsg').textContent='Camera not supported here. Demo mode: scanning is simulated.';
}
function closeScan(){
  if(scan.stream)scan.stream.getTracks().forEach(t=>t.stop());
  scan.stream=null;const d=$('#scanDlg');if(d.open)d.close();
}
function doScan(){
  if(!$('#manual').hidden){
    if($('#manId').value.trim().toUpperCase()!==me.id){$('#scanMsg').textContent='That ID does not match your account. Check it and try again.';return}
    return markMe('Manual entry');
  }
  const b=$('#scanBtn');b.disabled=true;$('#scanMsg').textContent='Scanning…';
  setTimeout(()=>{
    b.disabled=false;
    if(Math.random()>.35)return markMe('Face recognition');
    scan.tries++;
    if(scan.tries>=3){$('#manual').hidden=false;b.textContent='Mark with ID';$('#scanMsg').textContent='Face not recognized 3 times. Enter your student ID to mark manually.'}
    else $('#scanMsg').textContent='Face not recognized. Attempt '+scan.tries+' of 3. Face the light and try again.';
  },1100);
}
function markMe(note){
  const se=db.sessions.find(x=>x.id==scan.sess);
  const r=todayRec(me.id,se.sub);
  closeScan();
  if(r&&r.status=='Present'){toast('Already marked present for this class');return}
  setStatus(me.id,se.sub,'Present',note);
  toast('Attendance marked');render();
}

/* ---------- faculty ---------- */
function vFaculty(){
  if(tab=='reports')return vReports(db.subjects.filter(b=>b.fac==me.id).map(b=>b.id));
  const mine=db.subjects.filter(b=>b.fac==me.id);
  return `<div class="grid">${mine.map(b=>{
    const se=db.sessions.find(x=>x.sub==b.id&&x.active);
    return `<div class="card" style="${se?'grid-column:1/-1':''}"><div class="row sp"><div><h3 style="margin:0">${esc(b.name)}</h3><div class="muted">${se?'Session open · Room '+esc(se.room||'-'):'No open session'}</div></div>
    ${se?`<button class="btn bad sm" onclick="endSession('${se.id}')">End session</button>`:`<div class="row"><input id="rm${b.id}" placeholder="Room" style="width:90px"><button class="btn sm" onclick="startSession('${b.id}')">Start session</button></div>`}</div>
    ${se?`<div class="scroll" style="margin-top:.8rem"><table><tr><th>Student</th><th>Status</th><th>Edit</th></tr>${db.students.map(s=>{const r=todayRec(s.id,b.id);
      return `<tr><td>${esc(s.name)} <span class="muted">${s.id}</span></td><td>${r?`<span class="pill ${r.status=='Present'?'p':'a'}">${r.status}</span>`:'<span class="pill n">Not marked</span>'}${r&&r.note?` <span class="muted">· ${esc(r.note)}</span>`:''}</td>
      <td class="row"><button class="btn ghost sm" onclick="facMark('${s.id}','${b.id}','Present')">Present</button><button class="btn ghost sm" onclick="facMark('${s.id}','${b.id}','Absent')">Absent</button></td></tr>`}).join('')}</table></div>`:''}</div>`}).join('')||'<div class="card">No subjects are assigned to you yet. Ask an admin to assign one.</div>'}</div>`;
}
function startSession(sub){db.sessions.push({id:uid('SE'),sub,room:$('#rm'+sub).value.trim(),date:today(),active:true});toast('Session started. Students can now scan.');render()}
function facMark(sid,sub,st){setStatus(sid,sub,st,'Edited by faculty');render()}
function endSession(id){
  const se=db.sessions.find(x=>x.id==id);let a=0;
  db.students.forEach(s=>{if(!todayRec(s.id,se.sub)){setStatus(s.id,se.sub,'Absent','Not scanned');a++}});
  se.active=false;toast('Session ended. '+a+' student'+(a==1?'':'s')+' marked absent.');render();
}

/* ---------- reports (faculty + admin) ---------- */
function repRows(allowed){
  let r=db.records.filter(x=>allowed.includes(x.sub)&&(!rep.sub||x.sub==rep.sub)&&(!rep.val||x.date.startsWith(rep.val)));
  const key=rep.type=='subject'?'sub':'sid',g={};
  r.forEach(x=>{const o=g[x[key]]=g[x[key]]||{p:0,t:0};o.t++;if(x.status=='Present')o.p++});
  return Object.keys(g).sort().map(k=>({name:key=='sub'?subName(k):stuName(k)+' ('+k+')',p:g[k].p,t:g[k].t,v:Math.round(g[k].p/g[k].t*100)}));
}
function vReports(allowed){
  const rows=repRows(allowed),low=rows.filter(r=>r.v<LOW).length;
  return `<div class="card"><h3>Attendance reports</h3>
  <div class="form2 mb"><div><label for="rt">Report</label><select id="rt" onchange="repSet('type',this.value,true)">
    ${[['student','Student-wise'],['subject','Subject-wise'],['daily','Daily'],['monthly','Monthly']].map(o=>`<option value="${o[0]}" ${rep.type==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
  <div><label for="rs">Subject</label><select id="rs" onchange="repSet('sub',this.value)"><option value="">All subjects</option>${allowed.map(i=>`<option value="${i}" ${rep.sub==i?'selected':''}>${esc(subName(i))}</option>`).join('')}</select></div>
  ${rep.type=='daily'?`<div><label for="rv">Date</label><input id="rv" type="date" value="${rep.val}" onchange="repSet('val',this.value)"></div>`:''}
  ${rep.type=='monthly'?`<div><label for="rv">Month</label><input id="rv" type="month" value="${rep.val}" onchange="repSet('val',this.value)"></div>`:''}
  <div><button class="btn" onclick="exportCsv()">Export CSV</button></div></div>
  ${low?`<div class="alert">${low} row${low==1?' is':'s are'} below ${LOW}% attendance.</div>`:''}
  <div class="scroll"><table><tr><th>${rep.type=='subject'?'Subject':'Student'}</th><th>Present</th><th>Total</th><th>Attendance</th><th>Status</th></tr>
  ${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.p}</td><td>${r.t}</td><td><b style="color:${col(r.v)}">${r.v}%</b></td><td><span class="pill ${r.v<LOW?'a':'p'}">${r.v<LOW?'Low':'OK'}</span></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No records match these filters. Choose another date, month or subject.</td></tr>'}</table></div></div>`;
}
function repSet(k,v,reset){rep[k]=v;if(reset){rep.val=''}render()}
function exportCsv(){
  const allowed=me.role=='admin'?db.subjects.map(b=>b.id):db.subjects.filter(b=>b.fac==me.id).map(b=>b.id);
  const rows=repRows(allowed);
  const csv=['Name,Present,Total,Percent'].concat(rows.map(r=>`"${r.name}",${r.p},${r.t},${r.v}`)).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='attendance_report.csv';a.click();
  toast('Report exported');
}

/* ---------- admin ---------- */
function vAdmin(){
  if(tab=='reports')return vReports(db.subjects.map(b=>b.id));
  if(tab=='students')return `<div class="card mb"><h3>Add student</h3>
    <form class="form2" onsubmit="addStudent(event)">
      <div><label>Name</label><input id="sn" required></div><div><label>Department</label><input id="sd" value="CSE" required></div>
      <div><label>Year</label><input id="sy" type="number" min="1" max="6" value="1" required></div><div><label>Section</label><input id="ss" value="A" required></div>
      <div><label>Email</label><input id="se" type="email" required></div><div><label>Password</label><input id="sp" value="1234" required></div>
      <div><button class="btn">Add student</button></div></form></div>
    <div class="card"><h3>Students (${db.students.length})</h3><div class="scroll"><table><tr><th>ID</th><th>Name</th><th>Dept</th><th>Year</th><th>Sec</th><th>Overall</th><th></th></tr>
    ${db.students.map(s=>{const o=pct(s.id);return `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td>${esc(s.dept)}</td><td>${s.year}</td><td>${esc(s.sec)}</td><td><b style="color:${col(o.v)}">${o.v}%</b></td><td><button class="btn ghost sm" onclick="delStudent('${s.id}')">Delete</button></td></tr>`}).join('')}</table></div></div>`;
  if(tab=='subjects')return `<div class="grid mb">
    <div class="card"><h3>Add faculty</h3><form onsubmit="addFaculty(event)"><label>Name</label><input id="fn" required><label>Email</label><input id="fe" type="email" required><div style="margin-top:1rem"><button class="btn">Add faculty</button></div></form></div>
    <div class="card"><h3>Add subject</h3><form onsubmit="addSubject(event)"><label>Subject name</label><input id="bn" required><label>Assign to faculty</label><select id="bf">${db.faculty.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select><div style="margin-top:1rem"><button class="btn">Add subject</button></div></form></div></div>
    <div class="card"><h3>Subjects</h3><div class="scroll"><table><tr><th>ID</th><th>Subject</th><th>Faculty</th></tr>
    ${db.subjects.map(b=>`<tr><td>${b.id}</td><td>${esc(b.name)}</td><td>${esc((db.faculty.find(f=>f.id==b.fac)||{name:'-'}).name)}</td></tr>`).join('')}</table></div></div>`;
  const lows=db.students.map(s=>({s,o:pct(s.id)})).filter(x=>x.o.v<LOW);
  const avg=Math.round(db.students.reduce((a,s)=>a+pct(s.id).v,0)/(db.students.length||1));
  return `<div class="grid mb">
    <div class="card"><div class="muted">Students</div><div class="stat">${db.students.length}</div></div>
    <div class="card"><div class="muted">Faculty</div><div class="stat">${db.faculty.length}</div></div>
    <div class="card"><div class="muted">Subjects</div><div class="stat">${db.subjects.length}</div></div>
    <div class="card"><div class="muted">Average attendance</div><div class="stat" style="color:${col(avg)}">${avg}%</div></div></div>
    <div class="card"><h3>Students below ${LOW}%</h3>${lows.length?`<table><tr><th>Student</th><th>Attendance</th></tr>${lows.map(x=>`<tr><td>${esc(x.s.name)} <span class="muted">${x.s.id}</span></td><td><b style="color:var(--bad)">${x.o.v}%</b></td></tr>`).join('')}</table>`:'<p class="muted">Every student is at or above the required percentage.</p>'}</div>`;
}
function addStudent(e){
  e.preventDefault();
  const em=$('#se').value.trim().toLowerCase();
  if(db.students.some(s=>s.email==em)){toast('A student with this email already exists');return}
  db.students.push({id:'S'+(101+db.students.length+Math.floor(Math.random()*900)),name:$('#sn').value.trim(),dept:$('#sd').value.trim(),year:+$('#sy').value,sec:$('#ss').value.trim(),email:em,pw:$('#sp').value});
  toast('Student added');render();
}
function delStudent(id){
  if(!confirm('Delete '+stuName(id)+' and all their attendance records?'))return;
  db.students=db.students.filter(s=>s.id!=id);db.records=db.records.filter(r=>r.sid!=id);toast('Student deleted');render();
}
function addFaculty(e){e.preventDefault();db.faculty.push({id:'F'+(db.faculty.length+1),name:$('#fn').value.trim(),dept:'CSE',email:$('#fe').value.trim().toLowerCase(),pw:'1234'});toast('Faculty added');render()}
function addSubject(e){e.preventDefault();db.subjects.push({id:'SUB'+(db.subjects.length+1),name:$('#bn').value.trim(),fac:$('#bf').value});toast('Subject added');render()}

viewLogin();
