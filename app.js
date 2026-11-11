// CinePass · SPA con rutas por hash. Todo es simulación local (sin backend).
const $=s=>document.querySelector(s), main=$('#main');
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $$=n=>'$'+n.toFixed(2), HOLD=8*60000, CLOSE=15*60000, EDIT=2*3600000;
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let S=JSON.parse(sessionStorage.getItem('cp_s')||'{"sel":null,"hold":0,"user":null,"res":null}');
const save=()=>sessionStorage.setItem('cp_s',JSON.stringify(S));
const users=()=>{const u=ld('cp_u',[]);if(!u.length){u.push({n:'Cliente Demo',e:'demo@cinepass.test',p:'demo1234'});sv('cp_u',u)}return u};
const reservas=()=>ld('cp_r',[]).filter(r=>fn(r.fn));
const fmtDia=t=>new Date(t).toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'});
const fmtHora=t=>new Date(t).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
const fn=id=>FN.find(f=>f.id===id), peli=id=>PELIS.find(p=>p.id==id);
const vendible=f=>f.ini-Date.now()>CLOSE;
const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
const ROWS='ABCDEFGH'.split('');
function ocupados(f){ // asientos ocupados: ficticios + reservas confirmadas de esta demo
  const o=new Set();ROWS.forEach((r,i)=>{for(let c=1;c<=10;c++)if((hash(f.id)+i*7+c*13)%100<22)o.add(r+c)});
  reservas().filter(r=>r.fn===f.id&&r.estado==='Confirmada').forEach(r=>r.seats.forEach(s=>o.add(s)));return o}
const libres=f=>80-ocupados(f).size;
const precio=(f,t)=>PRECIO[t]+(f.fmt==='3D'?2:0);
const extra=x=>'GH'.includes(x[0])?2:0, acc=x=>x==='A1'||x==='A10';
const nTix=()=>S.sel?Object.values(S.sel.tix).reduce((a,b)=>a+b,0):0;
const total=()=>S.sel?Object.entries(S.sel.tix).reduce((a,[t,n])=>a+n*precio(fn(S.sel.fn),t),0)+(S.sel.seats||[]).reduce((a,x)=>a+extra(x),0):0;
const poster=p=>p.img?`<div class="poster has" style="--h:${p.h}"><img src="${p.img}" alt="Póster de ${esc(p.t)}" loading="lazy"></div>`:`<div class="poster" style="--h:${p.h}" role="img" aria-label="Póster de ${esc(p.t)}"><span>${esc(p.t)}</span></div>`;

/* ---------- Modales (M-xx) ---------- */
function modal(h,btns){const d=document.createElement('dialog');
  d.innerHTML=`<div>${h}</div><div class="acts">${btns.map((b,i)=>`<button class="${b.c||''}" data-i="${i}">${b.l}</button>`).join('')}</div>`;
  d.addEventListener('click',e=>{const i=e.target.dataset.i;if(i!=null){d.close();d.remove();btns[i].f&&btns[i].f()}});
  d.addEventListener('cancel',()=>d.remove());document.body.append(d);d.showModal()}
const go=h=>{location.hash=h};
const release=()=>{S.hold=0;S.sel=null;save()};

/* ---------- Encabezado (C-01) ---------- */
function nav(){const u=S.user;
  $('#nav').innerHTML=`<a href="#/" data-leave>Inicio</a><a href="#/cartelera" data-leave>Cartelera</a><a href="#/alimentos" data-leave>Alimentos y bebidas</a><a href="#/reservas" data-leave>Mis reservas</a>`+`<form class="hs" id="hs" role="search"><input type="search" aria-label="Buscar películas" placeholder="Buscar películas" value="${esc(F.q)}"></form>`+(u?`<span class="mut small">${esc(u.n.split(' ')[0])}</span><button id="out">Salir</button>`:`<a href="#/login" data-leave>Iniciar sesión</a><a href="#/registro" data-leave>Crear cuenta</a>`);
  $('#hs').onsubmit=e=>{e.preventDefault();const v=$('#hs input').value;const ir=()=>{F.q=v;HM=4;location.hash==='#/cartelera'?route():go('#/cartelera')};S.hold?abandonar(ir):ir()};
  const o=$('#out');if(o)o.onclick=()=>{const x=()=>{S.user=null;release();nav();go('#/')};S.hold?abandonar(x):x()}}
function abandonar(ok){modal('<h2>¿Abandonar la reserva?</h2><p>Se liberarán los asientos retenidos y perderás la selección.</p>',[{l:'Salir',c:'pri',f:()=>{release();ok()}},{l:'Continuar aquí'}])}
document.addEventListener('click',e=>{const a=e.target.closest('[data-leave]');if(a&&S.hold){e.preventDefault();abandonar(()=>go(a.getAttribute('href')))}});

/* ---------- Temporizador (C-05) y pasos (RNF-13) ---------- */
let tick;
const timerHTML=()=>S.hold?`<span class="timer" data-t role="timer" aria-label="Tiempo restante de la retención"></span>`:'';
function pasos(n){return `<ol class="steps">${['Boletos','Asientos','Resumen','Pago'].map((s,i)=>`<li class="${i+1===n?'on':''}" ${i+1===n?'aria-current="step"':''}>${i+1} · ${s}</li>`).join('')}${timerHTML()}</ol>`}
function runTimer(){clearInterval(tick);const upd=()=>{const el=document.querySelector('[data-t]');if(!S.hold){return}const ms=S.hold-Date.now();
  if(ms<=0){clearInterval(tick);release();modal('<h2>Retención expirada</h2><p>El tiempo terminó. No se realizó ningún cobro.</p>',[{l:'Volver a elegir asientos',c:'pri',f:()=>go('#/boletos')},{l:'Cambiar de función',f:()=>go('#/')}]);return}
  if(el){const s=Math.ceil(ms/1000);el.textContent=`Retención ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;el.classList.toggle('low',s<60)}};upd();tick=setInterval(upd,1000)}

/* ---------- Router ---------- */
const R={'':home,cartelera:()=>{home();setTimeout(()=>$('#cartelera').scrollIntoView(),60)},alimentos,p:detalle,boletos,asientos,resumen,pago,resultado,login,registro,reservas,reserva};
function route(){const[a,b]=location.hash.slice(2).split('/');if(S.sel&&!fn(S.sel.fn)){S.sel=null;S.hold=0}
nav();main.className=a===''||a==='cartelera'?'home':'';document.body.classList.toggle('booking',['boletos','asientos','resumen','pago','resultado','reservas','reserva'].includes(a));(R[a]||nofound)(b);runTimer();main.focus();scrollTo(0,0)}
addEventListener('hashchange',route);
const nofound=()=>main.innerHTML=`<p class="eyebrow">Error 404</p><h1>Esta sala no existe</h1><p class="mut">La dirección no corresponde a ninguna pantalla.</p><a class="btn pri" href="#/">Volver al inicio</a>`;
const needSel=()=>{if(!S.sel){go('#/');return true}};

/* ---------- P-01 Inicio + cartelera (RF-01, RF-02) ---------- */
let F={q:'',g:[],c:[],i:[],f:[],d:''},QS={d:0,t:null},HF=0,HM=4,heroT;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const dKey=t=>new Date(t).toDateString(), dayN=i=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);return d};
const cur=()=>PELIS[HF%PELIS.length];
function iniciar(fid){const g=()=>{S.sel={fn:fid,tix:{G:1,N:0,A:0},seats:[]};S.hold=0;save();go('#/boletos')};S.hold&&S.sel&&S.sel.fn!==fid?abandonar(g):g()}
function slide(p,m){const bg=p.bd?` style="background-image:linear-gradient(90deg,#050507ee,#050507aa 40%,#0000),url('${p.bd}')"`:'';
  return `<div class="sl" style="--h:${p.h}"><div class="sbg" data-t="${esc(p.t)}"${bg}></div><div class="sc"><p class="tag">${p.g} · ${p.d} min · ${CLAS[p.c]}</p>${m?'<h1>':'<h2>'}${esc(p.t)}${m?'</h1>':'</h2>'}${m?`<p class="lead">${esc(p.s)}</p><div class="acts"><button class="pri" id="tr">▶ Ver tráiler</button><a class="btn" href="#/p/${p.id}" data-leave>Ver detalles</a></div>`:''}</div>${m?`<div class="ctrl"><span class="small mut">${HF%PELIS.length+1} / ${PELIS.length}</span><button class="cir" data-step="-1" aria-label="Película anterior">‹</button><button class="cir" data-step="1" aria-label="Película siguiente">›</button></div>`:''}</div>`}
function heroHTML(){const n=PELIS.length,i=HF%n;return `<section class="car" id="hero" aria-label="Películas destacadas"><div class="side l" data-step="-1" aria-hidden="true">${slide(PELIS[(i+n-1)%n])}</div>${slide(PELIS[i],1)}<div class="side r" data-step="1" aria-hidden="true">${slide(PELIS[(i+1)%n])}</div></section>`}
function selector(){const p=cur(),dk=dKey(dayN(QS.d)),ts=FN.filter(f=>f.p===p.id&&dKey(f.ini)===dk&&vendible(f));
  return `<div><h2 class="sm">Elige fecha</h2><div class="days" role="group" aria-label="Fecha">${[...Array(7)].map((_,i)=>`<button data-qd="${i}" aria-pressed="${i===QS.d}">${dayN(i).toLocaleDateString('es',{weekday:'short',day:'numeric'})}</button>`).join('')}</div></div><div><h2 class="sm">Elige horario · ${esc(p.t)}</h2><div class="days" role="group" aria-label="Horario">${ts.map(f=>`<button data-qt="${f.id}" aria-pressed="${QS.t===f.id}">${fmtHora(f.ini)}</button>`).join('')||'<span class="mut small">Sin funciones disponibles este día</span>'}</div></div><button class="pri" id="buy" ${QS.t?'':'disabled'}>Comprar entradas</button>`}
function bindTop(){const p=cur();
  $('#tr').onclick=()=>modal(p.yt?`<h2>Tráiler · ${esc(p.t)}</h2><div style="aspect-ratio:16/9"><iframe src="https://www.youtube-nocookie.com/embed/${p.yt}" title="Tráiler de ${esc(p.t)}" style="width:100%;height:100%;border:0" allow="encrypted-media;picture-in-picture" allowfullscreen></iframe></div><p class="small"><a href="https://www.youtube.com/watch?v=${p.yt}" target="_blank" rel="noopener">Abrir en YouTube</a></p>`:`<h2>Tráiler · ${esc(p.t)}</h2><div class="poster" style="--h:${p.h};aspect-ratio:16/9" role="img" aria-label="Tráiler de demostración"><span>▶ Tráiler de demostración</span></div><p class="small mut">Con la API de TMDB aquí se reproduce el tráiler oficial.</p>`,[{l:'Cerrar'},{l:'Reservar',c:'pri',f:()=>go('#/p/'+p.id)}]);
  main.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const n=PELIS.length,st=+b.dataset.step;HF=(HF%n+st+n)%n;QS.t=null;top_();const c=main.querySelector(`.ctrl [data-step="${st}"]`);if(c&&b.classList.contains('cir'))c.focus()});
  main.querySelectorAll('[data-qd]').forEach(b=>b.onclick=()=>{QS.d=+b.dataset.qd;QS.t=null;top_()});
  main.querySelectorAll('[data-qt]').forEach(b=>b.onclick=()=>{QS.t=b.dataset.qt;top_()});
  $('#buy').onclick=()=>iniciar(QS.t)}
function top_(){$('#hero').outerHTML=heroHTML();$('#qs').innerHTML=selector();bindTop()}
function home(){clearInterval(heroT);
  const op=(k,arr)=>arr.map(v=>`<label class="chip"><input type="checkbox" data-k="${k}" value="${esc(v)}" ${F[k].includes(v)?'checked':''}><span>${esc(k==='c'?CLAS[v]:v)}</span></label>`).join('');
  const uniq=f=>[...new Set(PELIS.flatMap(f))],iso=d=>d.toLocaleDateString('sv');
  main.innerHTML=heroHTML()+`<section class="wrap qs" id="qs"></section><section class="wrap" id="cartelera"><div class="rowh"><h2>Cartelera</h2><button type="button" class="pill" id="all">Ver todo</button></div><p class="small mut" id="src">${SRC==='tmdb'?'Fuente: TMDB (películas reales). Horarios y asientos son de demostración.':SRC==='error'?'No se pudo conectar con TMDB: se muestran datos locales.':'Datos locales de demostración. Conecta TMDB desde el pie de página.'}</p>
  <form class="filters" role="search" onsubmit="return false"><div><label for="q">Buscar por título</label><input type="search" id="q" value="${esc(F.q)}" autocomplete="off"><div class="err" id="qe"></div></div>
  <div class="chips"><span class="l">Género</span>${op('g',uniq(p=>[p.g]))}</div><div class="chips"><span class="l">Clasificación</span>${op('c',['A','B','C'])}</div>
  <div class="chips"><span class="l">Idioma</span>${op('i',uniq(p=>p.i))}</div><div class="chips"><span class="l">Formato</span>${op('f',uniq(p=>p.fm))}</div>
  <div><label for="d">Fecha de función</label><input type="date" id="d" min="${iso(dayN(0))}" max="${iso(dayN(14))}" value="${F.d}"></div></form>
  <div class="tags" id="tags" aria-live="polite"></div><p class="mut small" id="cnt"></p><div id="res"></div></section>`;
  $('#qs').innerHTML=selector();bindTop();
  $('#all').onclick=()=>{HM=99;draw()};$('#q').oninput=e=>{F.q=e.target.value;HM=4;draw()};$('#d').onchange=e=>{F.d=e.target.value;draw()};
  main.querySelectorAll('.chip input').forEach(i=>i.onchange=()=>{const a=F[i.dataset.k];i.checked?a.push(i.value):a.splice(a.indexOf(i.value),1);draw()});draw();
  if(!reduce)heroT=setInterval(()=>{const h=$('#hero');if(!h){clearInterval(heroT);return}if(h.matches(':hover,:focus-within')||document.querySelector('dialog'))return;HF++;QS.t=null;top_()},9000)}
function draw(){
  const qe=$('#qe'),q=norm(F.q.trim());qe.textContent=F.q.trim().length===1?'Escribe al menos 2 caracteres para buscar.':'';
  const act=q.length>=2?q:'';
  const list=PELIS.filter(p=>{const fs=FN.filter(f=>f.p===p.id&&vendible(f));if(!fs.length)return false; // RN-22
    if(act&&!norm(p.t).includes(act))return false;
    if(F.g.length&&!F.g.includes(p.g))return false;if(F.c.length&&!F.c.includes(p.c))return false;
    if(F.i.length&&!fs.some(f=>F.i.includes(f.idi)))return false;if(F.f.length&&!fs.some(f=>F.f.includes(f.fmt)))return false;
    if(F.d&&!fs.some(f=>new Date(f.ini).toLocaleDateString('sv')===F.d))return false;return true});
  const tags=[...F.g,...F.c.map(c=>CLAS[c]),...F.i,...F.f,...(F.d?[F.d]:[])];
  $('#tags').innerHTML=tags.length?tags.map(t=>`<button type="button" data-rm="${esc(t)}" aria-label="Quitar filtro ${esc(t)}">${esc(t)} ✕</button>`).join('')+'<button type="button" class="link" id="clr">Limpiar filtros</button>':'';
  const clr=()=>{F={q:'',g:[],c:[],i:[],f:[],d:''};home()};
  if($('#clr'))$('#clr').onclick=clr;
  $('#tags').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const t=b.dataset.rm;for(const k of['g','i','f'])F[k]=F[k].filter(x=>x!==t);F.c=F.c.filter(c=>CLAS[c]!==t);if(F.d===t)F.d='';home()});
  $('#cnt').textContent=`${list.length} película${list.length===1?'':'s'}`;
  const shown=list.slice(0,HM);
  $('#res').innerHTML=list.length?`<div class="grid">${shown.map(p=>{const fs=FN.filter(f=>f.p===p.id&&vendible(f)&&(!F.d||new Date(f.ini).toLocaleDateString('sv')===F.d)),k=fs[0]?dKey(fs[0].ini):'';
    return `<article class="film"><a href="#/p/${p.id}" data-leave aria-label="Detalles de ${esc(p.t)}">${poster(p)}</a><h3>${esc(p.t)}</h3><p>${p.g} · ${p.d} min · ${CLAS[p.c]}</p><div class="tms" aria-label="Horarios ${fmtDia(fs[0].ini)}">${fs.filter(f=>dKey(f.ini)===k).map(f=>`<button class="tm" data-f="${f.id}" aria-label="Reservar ${esc(p.t)} ${fmtDia(f.ini)} ${fmtHora(f.ini)}">${fmtHora(f.ini)}</button>`).join('')}<span class="mut small">${fmtDia(fs[0].ini)}</span></div><a class="link small" href="#/p/${p.id}" data-leave>Ver detalles</a></article>`}).join('')}</div>${list.length>HM?'<div class="acts" style="justify-content:center;margin-top:34px"><button class="pri" id="more">Mostrar más</button></div>':''}`
   :`<div class="msg">No encontramos películas con esos criterios. <button type="button" class="link" id="clr2">Limpiar filtros</button></div>`;
  main.querySelectorAll('.tm').forEach(b=>b.onclick=()=>iniciar(b.dataset.f));
  if($('#more'))$('#more').onclick=()=>{HM+=4;draw()};
  if($('#clr2'))$('#clr2').onclick=clr}

/* ---------- P-02 Detalle y funciones (RF-01, RF-03) ---------- */
let dia=0;
function detalle(id){const p=peli(id);if(!p)return nofound();
  const fs=FN.filter(f=>f.p===p.id);const dias=[...new Set(fs.map(f=>new Date(f.ini).toDateString()))];
  const sel=dias[dia]||dias[0];
  const lista=fs.filter(f=>new Date(f.ini).toDateString()===sel);
  main.innerHTML=`<a href="#/" class="link" data-leave>← Cartelera</a><div class="detail" style="margin-top:20px">${poster(p)}<div>
  <p class="eyebrow">${p.g} · ${CLAS[p.c]} · ${p.d} min${p.fecha?' · Estreno '+p.fecha:''}</p><h1>${esc(p.t)}</h1><p style="max-width:52ch">${esc(p.s)}</p>
  <h2 style="margin-top:34px">Funciones</h2><div class="days" role="group" aria-label="Fecha">${dias.map((d,i)=>`<button aria-pressed="${d===sel}" data-d="${i}">${fmtDia(new Date(d))}</button>`).join('')}</div>
  ${lista.map(f=>{const l=libres(f),v=vendible(f),ok=v&&l>0;return `<div class="fn"><time>${fmtHora(f.ini)}</time><span class="small mut">Sala ${f.sala} · ${f.fmt} · ${f.idi}<br>Desde ${$$(precio(f,'N'))} · ${!v?'Venta cerrada':l?l+' asientos':'Agotada'}</span>${ok?`<button class="pri" data-f="${f.id}">Reservar</button>`:`<button disabled>${v?'Agotada':'Cerrada'}</button>`}</div>`}).join('')||'<div class="msg">Sin funciones disponibles.</div>'}
  </div></div>`;
  main.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{dia=+b.dataset.d;detalle(id)});
  main.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>iniciar(b.dataset.f))}

/* ---------- Panel resumen (C-06) ---------- */
function panel(){const f=fn(S.sel.fn),p=peli(f.p);return `<aside class="sum" aria-label="Resumen"><h3>${esc(p.t)}</h3><dl><dt>Cine</dt><dd>CinePass · Sala ${f.sala}</dd><dt>Función</dt><dd>${fmtDia(f.ini)}, ${fmtHora(f.ini)}</dd><dt>Formato</dt><dd>${f.fmt} · ${f.idi}</dd><dt>Boletos</dt><dd>${Object.entries(S.sel.tix).filter(e=>e[1]).map(([t,n])=>`${n} ${TIPOS[t]}`).join(', ')||'—'}</dd><dt>Asientos</dt><dd>${S.sel.seats.join(', ')||'—'}</dd></dl><div class="total" aria-live="polite">${$$(total())}</div></aside>`}

/* ---------- P-03 Boletos ---------- */
function boletos(){if(needSel())return;const f=fn(S.sel.fn),max=Math.min(8,libres(f));
  const draw3=()=>{const n=nTix();main.innerHTML=pasos(1)+`<div class="cols"><div><h1>¿Cuántos boletos?</h1>${Object.keys(TIPOS).map(t=>`<div class="tk"><div>${TIPOS[t]}<br><span class="mut small">${$$(precio(f,t))} c/u</span></div><div class="q"><button data-m="${t}" aria-label="Quitar ${TIPOS[t]}" ${S.sel.tix[t]?'':'disabled'}>−</button><b aria-live="polite">${S.sel.tix[t]}</b><button data-a="${t}" aria-label="Agregar ${TIPOS[t]}" ${n>=max?'disabled':''}>+</button></div></div>`).join('')}
   ${n>=max?`<div class="msg">${max<8?`Solo quedan ${max} asientos.`:'Máximo 8 boletos por reserva.'}</div>`:''}${n<1?'<div class="msg bad">Elige al menos 1 boleto.</div>':''}
   <p class="mut small">La elegibilidad de tarifas reducidas se verifica en el acceso a la sala.</p><div class="acts"><button id="bk">Volver</button><button class="pri" id="nx" ${n<1?'disabled':''}>Elegir asientos</button></div></div>${panel()}</div>`;
   main.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{S.sel.tix[b.dataset.a]++;S.sel.seats=[];save();draw3()});
   main.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.sel.tix[b.dataset.m]--;S.sel.seats=[];save();draw3()});
   $('#bk').onclick=()=>history.back();$('#nx').onclick=()=>go('#/asientos')};draw3()}

/* ---------- P-04 Asientos (C-04, RNF-28) ---------- */
function asientos(){if(needSel())return;const f=fn(S.sel.fn),n=nTix(),oc=ocupados(f);if(n<1)return go('#/boletos');
  S.sel.seats=S.sel.seats.filter(s=>!oc.has(s));
  const draw4=()=>{const sl=S.sel.seats,falta=n-sl.length;
   main.innerHTML=pasos(2)+`<div class="cols"><div><h1>Elige tus asientos</h1><div class="screen" aria-hidden="true">PANTALLA</div><div class="map" role="group" aria-label="Mapa de la sala">${ROWS.map(r=>`<div class="row"><i>${r}</i>${[...Array(10)].map((_,c)=>{const id=r+(c+1),o=oc.has(id),s=sl.includes(id),a=acc(id),pf=extra(id)>0;return `<button class="seat ${o?'occ':''} ${s?'sel':''} ${c===4?'gap':''} ${pf?'pref':''} ${a?'ada':''}" data-s="${id}" ${o?'disabled':''} aria-pressed="${s}" aria-label="Fila ${r}, asiento ${c+1}, ${a?'accesible, ':''}${pf?'preferente, ':''}${o?'ocupado':s?'seleccionado':'disponible'}"><span>${o?'×':a?'♿':c+1}</span></button>`}).join('')}<i>${r}</i></div>`).join('')}</div>
   <div class="legend"><span>◻ Estándar</span><span class="lp">◻ Preferente (+$2.00)</span><span>♿ Accesible</span><span>✓ Seleccionado</span><span>× Ocupado</span></div>
   <div class="msg ${falta?'':'ok'}" aria-live="polite">${falta?`Selecciona ${n} asiento${n>1?'s':''} (faltan ${falta}).`:'Selección completa.'}</div>
   <div class="acts"><button id="bk">Volver</button><button class="pri" id="nx" ${falta?'disabled':''}>Continuar</button></div></div>${panel()}</div>`;
   main.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const id=b.dataset.s,i=sl.indexOf(id);
     if(i>=0)sl.splice(i,1);else if(sl.length<n)sl.push(id);else{$('.msg').textContent=`Ya elegiste ${n}. Quita uno o aumenta los boletos.`;return}
     save();draw4();document.querySelector(`[data-s="${id}"]`).focus()});
   $('#bk').onclick=()=>history.back();
   $('#nx').onclick=()=>{const oc2=ocupados(f);const bad=S.sel.seats.filter(s=>oc2.has(s));
     if(bad.length){modal('<h2>Asientos no disponibles</h2><p>Uno o más asientos fueron tomados. Elige otros.</p>',[{l:'Elegir otros asientos',c:'pri',f:()=>{S.sel.seats=[];draw4()}}]);return}
     S.hold=Date.now()+HOLD;save();go('#/resumen')}};draw4()}

/* ---------- P-05 Resumen ---------- */
function resumen(){if(needSel())return;if(S.sel.seats.length!==nTix()||!S.hold)return go('#/asientos');
  const f=fn(S.sel.fn);
  main.innerHTML=pasos(3)+`<div class="cols"><div><h1>Revisa tu reserva</h1>${S.user?'':'<div class="msg">Puedes revisar todo, pero para pagar debes iniciar sesión. Tus asientos se conservan.</div>'}
  <ul>${Object.entries(S.sel.tix).filter(e=>e[1]).map(([t,n])=>`<li>${n} × ${TIPOS[t]} — ${$$(n*precio(f,t))}</li>`).join('')}</ul>
  <p class="mut small">Políticas: puedes cancelar hasta 2 horas antes de la función con reembolso simulado del 100 %. Precios con impuestos incluidos.</p>
  <div class="acts"><button id="ch">Cambiar asientos</button><button class="pri" id="nx">${S.user?'Continuar al pago':'Iniciar sesión para pagar'}</button></div></div>${panel()}</div>`;
  $('#ch').onclick=()=>{S.hold=0;save();go('#/asientos')};
  $('#nx').onclick=()=>{if(S.user)go('#/pago');else{S.next='#/resumen';save();go('#/login')}}}

/* ---------- P-06 Pago simulado (RF-11) ---------- */
function pago(){if(needSel())return;if(!S.user){S.next='#/resumen';save();return go('#/login')}if(!S.hold)return go('#/asientos');
  S.intentos=S.intentos||0;
  main.innerHTML=pasos(4)+`<div class="cols"><form id="pf" novalidate><h1>Pago simulado</h1><div class="msg">Pago simulado: no ingreses datos bancarios reales. Aprobada: 4111 1111 1111 1111 · Rechazada: 4000 0000 0000 0002.</div>
  <label for="nm">Titular</label><input id="nm" type="text" autocomplete="off"><div class="err" data-e="nm"></div>
  <label for="num">Número de tarjeta (16 dígitos)</label><input id="num" type="text" inputmode="numeric" autocomplete="off"><div class="err" data-e="num"></div>
  <div class="two"><div><label for="ex">Vencimiento (MM/AA)</label><input id="ex" type="text" placeholder="08/29" autocomplete="off"><div class="err" data-e="ex"></div></div><div><label for="cv">Código (3 dígitos)</label><input id="cv" type="password" inputmode="numeric" maxlength="3" autocomplete="off"><div class="err" data-e="cv"></div></div></div>
  <div class="acts"><button type="button" id="cn">Cancelar pago</button><button class="pri" id="go">Pagar ahora ${$$(total())}</button></div><p class="mut small">Intentos restantes: ${3-S.intentos}</p></form>${panel()}</div>`;
  const v=id=>$('#'+id).value.trim(),er=(k,m)=>{document.querySelector(`[data-e=${k}]`).textContent=m||'';return !!m};
  $('#cn').onclick=()=>{S.res={e:'can'};save();go('#/resultado')};
  $('#pf').onsubmit=e=>{e.preventDefault();const n=v('num').replace(/\s/g,''),m=v('ex').match(/^(\d\d)\/(\d\d)$/);
    const exp=m&&+m[1]>=1&&+m[1]<=12&&new Date(2000+ +m[2],+m[1],1)>new Date();
    let bad=er('nm',v('nm').length<3?'Escribe el nombre del titular.':'');
    bad=er('num',/^\d{16}$/.test(n)?'':'El número debe tener 16 dígitos.')||bad;bad=er('ex',exp?'':'Usa el formato MM/AA con una fecha futura.')||bad;bad=er('cv',/^\d{3}$/.test(v('cv'))?'':'El código tiene 3 dígitos.')||bad;
    if(bad)return;const b=$('#go');b.disabled=true;b.textContent='Procesando pago…';
    setTimeout(()=>{if(!S.hold){return route()}
      if(n==='4111111111111111'){confirmar(n.slice(-4))}else{S.intentos++;
        if(S.intentos>=3){const f=S.sel;release();S.intentos=0;S.res={e:'exp'}}else S.res={e:'rej',left:3-S.intentos};save();go('#/resultado')}},900)}}
function confirmar(l4){const f=fn(S.sel.fn),cod='CP-'+[...Array(6)].map(()=>'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.random()*31|0]).join('');
  const r={cod,u:S.user.e,fn:f.id,tix:S.sel.tix,seats:S.sel.seats,tot:total(),l4,estado:'Confirmada',hist:[['Confirmada','Sistema',Date.now()]]};
  const a=reservas();a.push(r);sv('cp_r',a);S.hold=0;S.sel=null;S.intentos=0;S.res={e:'ok',cod};save();go('#/resultado')}

/* ---------- P-07 Resultado (C-07) ---------- */
function qr(c){let h=hash(c),o='';for(let i=0;i<49;i++){h=(h*1103515245+12345)>>>0;o+=`<b class="${h>>16&1?'':'o'}"></b>`}return `<div class="qr" aria-hidden="true">${o}</div>`}
function comprobante(r){const f=fn(r.fn),p=peli(f.p);return `<div class="ticket"><div><p class="eyebrow">Comprobante</p><div class="code">${r.cod}</div><h3 style="margin-top:12px">${esc(p.t)}</h3><p class="small">${fmtDia(f.ini)}, ${fmtHora(f.ini)} · Sala ${f.sala} · ${f.fmt}<br>Asientos: ${r.seats.join(', ')}<br>Total ${$$(r.tot)} · Tarjeta ····${r.l4}</p></div>${qr(r.cod)}</div>`}
function resultado(){const r=S.res;if(!r)return go('#/');const e=r.e;
  if(e==='ok'){const x=reservas().find(k=>k.cod===r.cod);main.innerHTML=`<p class="eyebrow">Pago aprobado (simulado)</p><h1>Tu reserva está confirmada</h1>${comprobante(x)}<div class="acts"><a class="btn pri" href="#/reserva/${x.cod}">Ver detalle</a><a class="btn" href="#/">Volver al inicio</a></div>`;return}
  const T={rej:['Pago rechazado',`La tarjeta fue rechazada. Intentos restantes: ${r.left}.`],can:['Pago cancelado','No se realizó ningún cobro.'],exp:['Operación expirada','Tres rechazos consecutivos: se liberaron los asientos. No se cobró nada.']}[e];
  main.innerHTML=`<p class="eyebrow">Resultado del pago</p><h1>${T[0]}</h1><div class="msg bad">${T[1]}</div><div class="acts">${e==='exp'?'':'<a class="btn pri" href="#/pago">Reintentar</a><a class="btn" href="#/asientos">Cambiar asientos</a>'}<a class="btn" href="#/" data-leave>Volver al inicio</a></div>`}

/* ---------- P-10 Login, P-11 Registro (RF-08) ---------- */
function login(){const ctx=S.next?'<div class="msg">Inicia sesión para continuar con tu reserva.</div>':'';
  main.innerHTML=`<h1>Iniciar sesión</h1>${ctx}<form id="lf" novalidate><label for="e">Correo</label><input id="e" type="email" autocomplete="username"><div class="err" id="ee"></div><label for="p">Contraseña</label><input id="p" type="password" autocomplete="current-password"><div class="err" id="pe"></div><div class="acts"><button class="pri">Entrar</button></div><p class="small mut">Demo: demo@cinepass.test / demo1234 · <a href="#/registro">Crear cuenta</a></p></form>`;
  $('#lf').onsubmit=e=>{e.preventDefault();const em=$('#e').value.trim().toLowerCase(),pw=$('#p').value;
    $('#ee').textContent=/^\S+@\S+\.\S+$/.test(em)?'':'Escribe un correo válido.';$('#pe').textContent=pw?'':'Escribe tu contraseña.';if($('#ee').textContent||$('#pe').textContent)return;
    const lk=ld('cp_lk',{n:0,t:0});if(lk.t>Date.now()){$('#pe').textContent='Cuenta bloqueada temporalmente. Intenta en unos minutos.';return}
    const u=users().find(x=>x.e===em&&x.p===pw);
    if(!u){lk.n++;if(lk.n>=5){lk.t=Date.now()+15*60000;lk.n=0}sv('cp_lk',lk);$('#pe').textContent='Correo o contraseña incorrectos.';return}
    sv('cp_lk',{n:0,t:0});S.user={n:u.n,e:u.e};const nx=S.next||'#/';S.next=null;save();go(nx);nav()}}
function registro(){main.innerHTML=`<h1>Crear cuenta</h1><form id="rf" novalidate><label for="n">Nombre completo</label><input id="n" type="text" maxlength="80"><div class="err" data-e="n"></div><label for="e">Correo</label><input id="e" type="email"><div class="err" data-e="e"></div><label for="t">Teléfono (opcional)</label><input id="t" type="tel"><div class="err" data-e="t"></div><label for="p">Contraseña (mín. 8, con letra y número)</label><input id="p" type="password"><div class="err" data-e="p"></div><label for="p2">Confirmar contraseña</label><input id="p2" type="password"><div class="err" data-e="p2"></div>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="tc"> Acepto los <button type="button" class="link" id="tm">términos y la política de privacidad</button></label><div class="acts"><button class="pri" id="rg" disabled>Registrarme</button></div><p class="small"><a href="#/login">Ya tengo cuenta</a></p></form>`;
  const v=i=>$('#'+i).value.trim(),er=(k,m)=>{document.querySelector(`[data-e=${k}]`).textContent=m||'';return !!m};
  $('#tc').onchange=e=>$('#rg').disabled=!e.target.checked;
  $('#tm').onclick=()=>modal('<h2>Términos y privacidad</h2><p class="small">CinePass es una demostración académica. Solo se guardan nombre, correo y teléfono en este navegador; no se almacenan datos reales de tarjeta.</p>',[{l:'Aceptar',c:'pri',f:()=>{$('#tc').checked=true;$('#rg').disabled=false}},{l:'Cerrar'}]);
  $('#rf').onsubmit=e=>{e.preventDefault();const em=v('e').toLowerCase(),p=$('#p').value;
    let b=er('n',!v('n')?'El nombre es obligatorio.':'');b=er('e',/^\S+@\S+\.\S+$/.test(em)?(users().some(u=>u.e===em)?'Ese correo ya está registrado. Inicia sesión.':''):'Correo con formato inválido.')||b;
    b=er('t',!v('t')||/^\d{7,15}$/.test(v('t'))?'':'El teléfono debe tener de 7 a 15 dígitos.')||b;
    b=er('p',p.length>=8&&/[a-zA-Z]/.test(p)&&/\d/.test(p)?'':'Mínimo 8 caracteres, con al menos una letra y un número.')||b;b=er('p2',p===$('#p2').value?'':'Las contraseñas no coinciden.')||b;if(b)return;
    const u=users();u.push({n:v('n'),e:em,p});sv('cp_u',u);S.user={n:v('n'),e:em};const nx=S.next||'#/';S.next=null;save();go(nx)}}

/* ---------- P-13 Mis reservas, P-14 Detalle y cancelación (RF-09, RF-10) ---------- */
let tab='Próximas',qc='';
const mias=()=>reservas().filter(r=>r.u===S.user.e);
const estado=r=>r.estado==='Confirmada'&&fn(r.fn).ini<Date.now()?'Finalizada':r.estado;
function reservas_(){}
function reservasView(){if(!S.user){S.next='#/reservas';save();return go('#/login')}
  const L=mias().filter(r=>{const s=estado(r);return (tab==='Próximas'?s==='Confirmada':tab==='Pasadas'?s==='Finalizada':s.startsWith('Cancelada'))&&(!qc||r.cod.includes(qc))});
  main.innerHTML=`<h1>Mis reservas</h1><div class="tabs" role="tablist">${['Próximas','Pasadas','Canceladas'].map(t=>`<button role="tab" aria-selected="${t===tab}" data-t="${t}">${t}</button>`).join('')}</div><label for="qc">Buscar por código</label><input id="qc" type="search" value="${esc(qc)}" style="max-width:260px" placeholder="CP-…">
  <div>${L.map(r=>{const f=fn(r.fn);return `<a class="li" href="#/reserva/${r.cod}"><span><b>${r.cod}</b> · ${esc(peli(f.p).t)}<br><span class="mut small">${fmtDia(f.ini)}, ${fmtHora(f.ini)} · Sala ${f.sala} · ${r.seats.length} boletos</span></span><span class="badge b-${estado(r)}">${estado(r)}</span></a>`}).join('')||`<div class="msg">${mias().length?'No encontramos una operación con ese criterio en tu cuenta.':'Aún no tienes reservas.'} <a href="#/">Ver cartelera</a></div>`}</div>`;
  main.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;reservasView()});
  $('#qc').oninput=e=>{qc=e.target.value.toUpperCase().trim();const p=e.target.selectionStart;reservasView();$('#qc').focus();$('#qc').setSelectionRange(p,p)}}
R.reservas=reservasView;
function reserva(cod){if(!S.user){S.next='#/reserva/'+cod;save();return go('#/login')}
  const r=mias().find(x=>x.cod===cod);
  if(!r)return main.innerHTML=`<p class="eyebrow">Acceso denegado</p><h1>No tienes acceso a este recurso</h1><a class="btn pri" href="#/">Volver al inicio</a>`;
  const f=fn(r.fn),s=estado(r),puede=s==='Confirmada'&&f.ini-Date.now()>EDIT;
  main.innerHTML=`<a class="link" href="#/reservas">← Mis reservas</a><h1 style="margin-top:16px">Detalle de reserva <span class="badge b-${s}">${s}</span></h1>${comprobante(r)}
  <h3 style="margin-top:28px">Historial</h3><ul class="small">${r.hist.map(h=>`<li>${h[0]} · ${h[1]} · ${new Date(h[2]).toLocaleString('es')}</li>`).join('')}</ul>
  ${s==='Cancelada'?`<div class="msg ok">Reembolso simulado de ${$$(r.tot)} registrado (100 %).</div>`:''}
  <div class="acts"><button class="pri" id="cx" ${puede?'':'disabled'}>Cancelar reserva</button><button id="pr">Imprimir</button></div>${puede||s!=='Confirmada'?'':'<p class="small mut">Ya no se puede cancelar: faltan menos de 2 horas para la función.</p>'}<p class="small mut">Editar reservas y pedir comida: pendientes en esta versión.</p>`;
  $('#pr').onclick=()=>print();
  $('#cx').onclick=()=>modal(`<h2>¿Cancelar la reserva ${r.cod}?</h2><p>Se liberarán los asientos ${r.seats.join(', ')} y se registrará un reembolso simulado de ${$$(r.tot)}.</p>`,[{l:'Sí, cancelar reserva',c:'pri',f:()=>{if(f.ini-Date.now()<=EDIT){return modal('<p>El plazo venció; ya no es posible cancelar.</p>',[{l:'Entendido',f:reserva.bind(0,cod)}])}
    const a=reservas();const x=a.find(k=>k.cod===cod);x.estado='Cancelada';x.hist.push(['Cancelada','Cliente',Date.now()]);sv('cp_r',a);reserva(cod)}},{l:'Conservar reserva'}])}/* ---------- Alimentos y bebidas: carrito y pedidos (simulado) ---------- */
let cat='Todos';const orders=()=>ld('cp_o',[]);
function alimentos(){S.cart=S.cart||{};const cs=['Todos',...new Set(MENU.map(m=>m.c))];
  const tot=()=>MENU.reduce((a,m)=>a+(S.cart[m.id]||0)*m.p,0),pending=o=>o.estado==='Recibido';
  const d=()=>{const items=MENU.filter(m=>S.cart[m.id]),mine=S.user?reservas().filter(r=>r.u===S.user.e&&estado(r)==='Confirmada'):[],os=S.user?orders().filter(o=>o.u===S.user.e):[];
  main.innerHTML=`<p class="eyebrow">Alimentos y bebidas</p><h1>Antes de la función</h1><div class="tabs" role="tablist">${cs.map(c=>`<button role="tab" aria-selected="${c===cat}" data-c="${c}">${c}</button>`).join('')}</div>
  <div class="cols"><div>${MENU.filter(m=>cat==='Todos'||m.c===cat).map(m=>`<div class="tk"><div>${m.n}<br><span class="mut small">${m.c} · ${$$(m.p)}</span></div><div class="q"><button data-m="${m.id}" aria-label="Quitar ${m.n}" ${S.cart[m.id]?'':'disabled'}>−</button><b>${S.cart[m.id]||0}</b><button data-a="${m.id}" aria-label="Agregar ${m.n}">+</button></div></div>`).join('')}</div>
  <aside class="sum" aria-label="Carrito"><h3>${S.edit?'Editando '+S.edit:'Tu carrito'}</h3>${items.length?`<dl>${items.map(m=>`<dt>${S.cart[m.id]} × ${m.n}</dt><dd>${$$(S.cart[m.id]*m.p)}</dd>`).join('')}</dl>`:'<p class="mut small">El carrito está vacío.</p>'}<div class="total" aria-live="polite">${$$(tot())}</div>
  ${mine.length?`<label for="lk">Asociar a una reserva (opcional)</label><select id="lk"><option value="">Sin reserva</option>${mine.map(r=>`<option value="${r.cod}" ${S.link===r.cod?'selected':''}>${r.cod} · ${esc(peli(fn(r.fn).p).t)}</option>`).join('')}</select>`:''}
  <div class="acts"><button class="pri" id="ok" ${items.length?'':'disabled'}>${S.edit?'Guardar cambios':'Confirmar pedido'}</button></div></aside></div>
  <h2 style="margin-top:44px">Mis pedidos</h2>${os.map(o=>`<div class="li"><span><b>${o.cod}</b> <span class="badge b-${o.estado==='Recibido'?'Confirmada':'Cancelada'}">${o.estado}</span><br><span class="mut small">${o.items.map(i=>i[1]+' × '+i[0]).join(', ')} · ${$$(o.tot)}${o.res?' · Reserva '+o.res:''}</span></span>${pending(o)?`<span><button data-ed="${o.cod}">Editar</button> <button data-cx="${o.cod}">Cancelar</button></span>`:''}</div>`).join('')||`<div class="msg">${S.user?'Aún no tienes pedidos.':'Inicia sesión para ver y confirmar tus pedidos.'}</div>`}`;
  main.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{cat=b.dataset.c;d()});
  main.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{S.cart[b.dataset.a]=(S.cart[b.dataset.a]||0)+1;save();d()});
  main.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(--S.cart[b.dataset.m]<=0)delete S.cart[b.dataset.m];save();d()});
  if($('#lk'))$('#lk').onchange=e=>{S.link=e.target.value;save()};
  main.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>modal(`<h2>¿Cancelar el pedido ${b.dataset.cx}?</h2>`,[{l:'Sí, cancelar',c:'pri',f:()=>{const a=orders();a.find(o=>o.cod===b.dataset.cx).estado='Cancelado';sv('cp_o',a);d()}},{l:'Conservar'}]));
  main.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{const o=orders().find(x=>x.cod===b.dataset.ed);S.cart={};o.items.forEach(i=>S.cart[MENU.find(m=>m.n===i[0]).id]=i[1]);S.edit=o.cod;S.link=o.res||'';save();d();scrollTo(0,0)});
  if($('#ok'))$('#ok').onclick=()=>{if(!S.user){S.next='#/alimentos';save();return go('#/login')}
    const a=orders(),o={cod:S.edit||'PD-'+Math.random().toString(36).slice(2,7).toUpperCase(),u:S.user.e,items:items.map(m=>[m.n,S.cart[m.id]]),tot:tot(),res:S.link||'',estado:'Recibido'};
    const i=a.findIndex(x=>x.cod===o.cod);i>=0?a[i]=o:a.push(o);sv('cp_o',a);S.cart={};S.edit=null;S.link='';save();d();modal(`<h2>Pedido ${o.cod} confirmado</h2><p>Total ${$$(o.tot)}. Confirmación simulada: nada se envía a un servidor real.</p>`,[{l:'Entendido',c:'pri'}])}};d()}

document.addEventListener('click',e=>{if(e.target.id!=='cfg')return;window._tk=undefined;
  modal(`<h2>API de películas (TMDB)</h2><p class="small">Pega tu <b>API Read Access Token</b> (o la API key v3) de themoviedb.org → Ajustes → API. Se guarda solo en este navegador. Déjalo vacío para usar datos locales.</p><label for="tk">Credencial</label><input id="tk" type="password" autocomplete="off" oninput="window._tk=this.value" value="${esc(localStorage.getItem('cp_tmdb')||'')}">`,
  [{l:'Guardar y recargar',c:'pri',f:()=>{const v=(window._tk===undefined?localStorage.getItem('cp_tmdb')||'':window._tk).trim();v?localStorage.setItem('cp_tmdb',v):localStorage.removeItem('cp_tmdb');localStorage.removeItem('cp_tmdb_cache');location.reload()}},{l:'Cancelar'}])});
(typeof loadMovies==='function'?loadMovies():Promise.resolve()).finally(route);
