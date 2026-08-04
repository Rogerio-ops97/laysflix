import fs from 'node:fs/promises';

const token=process.env.TMDB_TOKEN;
if(!token) throw new Error('TMDB_TOKEN não configurado');
const source=JSON.parse(await fs.readFile('history-source.json','utf8'));
const headers={accept:'application/json',Authorization:`Bearer ${token}`};
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const request=async path=>{const response=await fetch(`https://api.themoviedb.org/3${path}`,{headers});if(!response.ok)throw new Error(`TMDB ${response.status}`);return response.json()};
const search=async(entry,type)=>{const data=await request(`/search/${type}?language=pt-BR&include_adult=false&query=${encodeURIComponent(entry.title)}${entry.year?`&year=${entry.year}`:''}`);const wanted=normalize(entry.title);return (data.results||[]).sort((a,b)=>{const score=x=>(normalize(x.title||x.name)===wanted?100:0)+(entry.year&&String(x.release_date||x.first_air_date||'').startsWith(entry.year)?20:0)+(x.popularity||0)/100;return score(b)-score(a)})[0]};
const resolveOne=async(entry,type)=>{const hit=await search(entry,type);if(!hit)return null;const episodes=Object.fromEntries((entry.episodeKeys||[]).map(key=>[key,true]));return {...hit,media_type:type,status:type==='movie'?'watched':entry.isFollowed?'watching':'watched',favorite:!!entry.favorite,episodes,episodeCount:entry.watchedEpisodeCount||0,watchedEpisodeCount:entry.watchedEpisodeCount||0,watchedMinutes:Math.round((entry.watchedSeconds||0)/60),historySource:'tvtime'}};
const tasks=[...source.series.map(entry=>({entry,type:'tv'})),...source.movies.map(entry=>({entry,type:'movie'}))];
const library=[];const unresolved=[];
for(let i=0;i<tasks.length;i+=8){const batch=tasks.slice(i,i+8);const values=await Promise.all(batch.map(async task=>{try{return await resolveOne(task.entry,task.type)}catch{return null}}));values.forEach((value,index)=>value?library.push(value):unresolved.push({title:batch[index].entry.title,type:batch[index].type}));}
await fs.writeFile('initial-library.json',JSON.stringify({version:source.version,summary:source.summary,library,unresolved},null,2));
console.log(`Histórico resolvido: ${library.length}/${tasks.length}; não encontrados: ${unresolved.length}`);
