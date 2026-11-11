// Conexión con TMDB (https://developer.themoviedb.org/). Solo aporta información de películas.
// Horarios, salas, precios y asientos siguen siendo datos locales de demostración.
// Credencial: se pega desde el pie de página ("Configurar API") y queda en localStorage, o se escribe en js/config.js.
// Si falla la red o la credencial, la app usa las películas locales de respaldo.
const TMDB_BASE='https://api.themoviedb.org/3', IMG='https://image.tmdb.org/t/p/';
const MAX_SINOPSIS=300;
window.SRC='local';
const tmdbCred=()=>(localStorage.getItem('cp_tmdb')||(window.TMDB_CONFIG&&TMDB_CONFIG.token)||'').trim();
async function tj(path,c){
  const jwt=c.length>60;                       // Read Access Token (JWT) → cabecera Bearer; si no, API key v3 → ?api_key=
  const u=new URL(TMDB_BASE+path);u.searchParams.set('language','es-MX');if(!jwt)u.searchParams.set('api_key',c);
  const r=await fetch(u,{headers:jwt?{Authorization:'Bearer '+c,accept:'application/json'}:{accept:'application/json'}});
  if(!r.ok)throw new Error('TMDB '+r.status);return r.json()}
function resumirSinopsis(texto){
  const sinopsis=(texto||'').replace(/\s+/g,' ').trim();
  if(!sinopsis)return 'Sin sinopsis disponible.';
  if(sinopsis.length<=MAX_SINOPSIS)return sinopsis;
  const frases=sinopsis.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[sinopsis];
  let resumen='';
  for(const frase of frases){
    const candidata=[resumen,frase.trim()].filter(Boolean).join(' ');
    if(candidata.length>MAX_SINOPSIS)break;
    resumen=candidata;
  }
  if(resumen)return resumen;
  let corte=sinopsis.slice(0,MAX_SINOPSIS-1);
  const espacio=corte.lastIndexOf(' ');
  if(espacio>0)corte=corte.slice(0,espacio);
  return corte.replace(/[,:;—–-]+$/,'').trimEnd()+'…';
}
function certif(m){const rs=(m.release_dates&&m.release_dates.results)||[];
  const pais=['MX','US','ES'].map(c=>rs.find(x=>x.iso_3166_1===c)).find(Boolean);
  const k=(pais?pais.release_dates.map(x=>x.certification).find(Boolean):'')||'';
  return /^(G|AA|A|TV-Y|TP|APTA)$/i.test(k)?'A':/^(R|C|D|NC-17|16|18)/i.test(k)?'C':'B'}
function mapear(m){const v=((m.videos&&m.videos.results)||[]).find(x=>x.site==='YouTube'&&x.type==='Trailer');
  return {id:m.id,t:m.title,g:(m.genres&&m.genres[0]&&m.genres[0].name)||'Cine',c:certif(m),d:m.runtime||100,i:['Español','Subtitulada'],fm:['2D','3D'],
    h:m.id%360,s:resumirSinopsis(m.overview),img:IMG+'w500'+m.poster_path,bd:m.backdrop_path?IMG+'w1280'+m.backdrop_path:'',yt:v?v.key:'',fecha:m.release_date||''}}
async function loadMovies(){const c=tmdbCred();if(!c)return;
  try{let ca=null;try{ca=JSON.parse(localStorage.getItem('cp_tmdb_cache'))}catch(e){}
    if(!ca||Date.now()-ca.t>864e5||ca.k!==c.slice(-8)){                 // caché de 24 h para respetar los límites de uso
      const l=await tj('/movie/now_playing?page=1',c);
      const full=await Promise.all(l.results.filter(m=>m.poster_path).slice(0,8).map(m=>tj(`/movie/${m.id}?append_to_response=videos,release_dates&include_video_language=es,en`,c)));
      ca={t:Date.now(),k:c.slice(-8),d:full};try{localStorage.setItem('cp_tmdb_cache',JSON.stringify(ca))}catch(e){}}
    const peliculas=ca.d.filter(m=>m.poster_path).map(mapear);
    if(peliculas.length<3)throw new Error('Respuesta insuficiente');
    PELIS.length=0;PELIS.push(...peliculas);buildFN();SRC='tmdb'}
  catch(e){console.warn('TMDB no disponible; se usan datos locales:',e.message);SRC='error'}}
