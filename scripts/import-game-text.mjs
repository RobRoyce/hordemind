#!/usr/bin/env node
// Pulls Infernal Hordes offer and War Plan text from the game's client strings, as
// published by DiabloTools/d4data, into apps/web/src/data/game-text.json.
//
// Usage: node scripts/import-game-text.mjs [d4data-commit]
// Text is Blizzard's; HordeMind ships names and short effect text with attribution.
import {writeFile} from 'node:fs/promises';

const REPO='DiabloTools/d4data';
const COMMIT=process.argv[2]??'76b722a340d22001171b4cfb0fc39e8efa761654';
const OUT=new URL('../apps/web/src/data/game-text.json',import.meta.url);
const STRINGS='json/enUS_Text/meta/StringList';

// Developer switches and boss portals share the offer prefix but are not offers.
const NOT_OFFERS=new Set(['ForceChaosWaves','ForceNextChaosWave','ForceNoChaosWaves','SelectBartuc','SelectCouncil']);

const api=async path=>{
 const res=await fetch(`https://api.github.com/repos/${REPO}/${path}`,{headers:{accept:'application/vnd.github+json'}});
 if(!res.ok)throw new Error(`${path}: HTTP ${res.status}`);
 return res.json();
};
const raw=async path=>{
 const res=await fetch(`https://raw.githubusercontent.com/${REPO}/${COMMIT}/${path}`);
 if(!res.ok)throw new Error(`${path}: HTTP ${res.status}`);
 return res.text();
};

const strip=t=>t.replace(/\{icon:[^}]*\}/g,'').replace(/\{\/?[a-zA-Z_]*\}/g,'').replace(/\{\/c\}/g,'').replace(/\s+/g,' ').trim();
const icon=t=>/\{icon:([^,}]+)/.exec(t)?.[1]??null;
const tier=t=>/\{c_([a-zA-Z]+)\}/.exec(t)?.[1]??null;

/** Splits "{icon:…}clause{icon:…}clause" into boon and bane by the game's own colour tags. */
function clauses(text){
 const parts=text.split(/(?=\{icon:)/).map(p=>p.trim()).filter(Boolean);
 const out={bane:[],boon:[],other:[]};
 for(const p of parts){
  const s=strip(p);
  if(!s)continue;
  (p.includes('c_bskbane')?out.bane:p.includes('c_bonus')?out.boon:out.other).push(s);
 }
 return out;
}
const entries=json=>Object.fromEntries(JSON.parse(json).arStrings.map(e=>[e.szLabel,e.szText]));

const meta=await api(`contents/json/enUS_Text/meta?ref=${COMMIT}`);
const tree=await api(`git/trees/${meta.find(x=>x.name==='StringList').sha}`);
const build=(await raw('buildVersion.txt')).trim();
const files=tree.tree.map(x=>x.path);

const offers=[];
for(const file of files.filter(f=>f.startsWith('Actor_BSK_PylChoiceGizmo_'))){
 const key=file.replace('Actor_BSK_PylChoiceGizmo_','').replace('.stl.json','');
 if(NOT_OFFERS.has(key))continue;
 const s=entries(await raw(`${STRINGS}/${file}`));
 const c=clauses(s.Name??'');
 offers.push({key,name:strip(s.ShortenedName??key),category:icon(s.ShortenedName??''),tier:tier(s.ShortenedName??''),
  boon:c.boon.join(' ')||c.other.join(' '),bane:c.bane.join(' '),text:strip((s.Name??'').replace(/\r\n/g,' / '))});
}
const warPlan=[];
for(const file of files.filter(f=>f.startsWith('Power_Warplans_BSK_'))){
 const key=file.replace('Power_Warplans_BSK_','').replace('.stl.json','');
 const s=entries(await raw(`${STRINGS}/${file}`));
 warPlan.push({key,desc:strip((s.desc??'').replace(/\r\n/g,' ')),seasonal:strip(s.warplan_seasonal_desc??'')});
}

const result={
 source:{repo:REPO,commit:COMMIT,build,url:`https://github.com/${REPO}/tree/${COMMIT}/${STRINGS}`,
  note:'Infernal Hordes text from the Diablo IV client (code name BSK). © Blizzard Entertainment.'},
 offers:offers.sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key)),
 warPlan:warPlan.sort((a,b)=>a.key.localeCompare(b.key))
};
await writeFile(OUT,JSON.stringify(result,null,1)+'\n');
console.log(`Wrote ${offers.length} offers and ${warPlan.length} War Plan upgrades from build ${build} (${COMMIT.slice(0,7)}).`);
