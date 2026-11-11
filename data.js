// Datos ficticios de CinePass (sin backend). Películas y funciones generadas para los próximos 7 días.
const PRECIO={G:8,N:5,A:5}, TIPOS={G:'General',N:'Niño',A:'Adulto mayor'};
const PELIS=[
 {id:1,t:'La hora del vidrio',g:'Drama',c:'B',d:112,i:['Español'],fm:['2D'],h:28,s:'Una restauradora de vitrales descubre que cada pieza guarda la última tarde de quien la encargó.'},
 {id:2,t:'Nocturno en Colón',g:'Suspenso',c:'C',d:104,i:['Español','Subtitulada'],fm:['2D','3D'],h:350,s:'Un vigilante nocturno recibe llamadas desde un teatro clausurado hace cuarenta años.'},
 {id:3,t:'Mar de ceniza',g:'Ciencia ficción',c:'B',d:128,i:['Subtitulada'],fm:['3D','2D'],h:200,s:'Tras el último eclipse, una pescadora cruza un océano gris en busca de la señal que nadie más escucha.'},
 {id:4,t:'El jardín de Ana',g:'Animación',c:'A',d:86,i:['Español'],fm:['2D'],h:130,s:'Ana habla con las plantas, hasta que una de ellas responde.'},
 {id:5,t:'Casa sin ventanas',g:'Terror',c:'C',d:97,i:['Subtitulada','Español'],fm:['2D'],h:8,s:'Una familia se muda a una casa donde el plano no coincide con la realidad.'},
 {id:7,t:'Ruta 66 Norte',g:'Aventura',c:'A',d:118,i:['Español'],fm:['2D'],h:15,s:'Tres amigas cruzan el país en una camioneta prestada y una promesa vieja.'},
 {id:8,t:'Los últimos faros',g:'Documental',c:'A',d:92,i:['Subtitulada'],fm:['2D'],h:190,s:'Los guardianes de los faros que aún funcionan cuentan cómo es vigilar el mar.'},
 {id:6,t:'Dos veranos',g:'Romance',c:'A',d:109,i:['Español'],fm:['2D'],h:30,s:'Dos desconocidos se cruzan en el mismo muelle con diez años de diferencia.'}];
const CLAS={A:'Todo público',B:'+12',C:'+16'};
const FN=[];
function buildFN(){FN.length=0;PELIS.forEach(p=>{for(let d=0;d<7;d++)['15:00','18:00','21:15'].forEach((h,k)=>{
  const t=new Date();t.setHours(0,0,0,0);t.setDate(t.getDate()+d);t.setHours(+h.slice(0,2),+h.slice(3));
  FN.push({id:`${p.id}-${d}-${k}`,p:p.id,ini:t.getTime(),sala:1+(p.id+k)%3,fmt:p.fm[k%p.fm.length],idi:p.i[k%p.i.length]});});});}
buildFN(); // horarios, salas y asientos son SIEMPRE locales (TMDB no los ofrece)
const MENU=[{id:'c1',n:'Palomitas grandes',c:'Combos',p:6},{id:'c2',n:'Combo pareja',c:'Combos',p:14},{id:'s1',n:'Nachos con queso',c:'Snacks',p:5},{id:'s2',n:'Hot dog',c:'Snacks',p:4},{id:'s3',n:'Chocolates',c:'Snacks',p:2.5},{id:'b1',n:'Refresco 22 oz',c:'Bebidas',p:3},{id:'b2',n:'Agua',c:'Bebidas',p:1.5},{id:'b3',n:'Café',c:'Bebidas',p:2.5}];
