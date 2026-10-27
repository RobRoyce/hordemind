import type {CharacterProfile} from '../../domain/schema';
import {SPLINTERS,type SplinterId} from '../../domain/splinters';
import {Field,NumberField,Segmented,cx} from '../kit';
import {TIPS} from './CharacterForm';
import {bonusState,parseRank} from './splinterView';
import s from './SplinterBlock.module.css';

type Choice=SplinterId|'none';
const OPTIONS:readonly {value:Choice;label:string}[]=[{value:'none',label:'None'},...SPLINTERS.map(x=>({value:x.id as Choice,label:x.name.replace('Splinter of ','')}))];

interface Props{profile:CharacterProfile;onUpdate:(patch:Partial<CharacterProfile>)=>void}

export function SplinterBlock({profile,onUpdate}:Props){
 return <div className={s.block}>
  <Field label="Active splinter" group help={TIPS.splinter}>
   {w=><Segmented label="Active splinter" value={profile.activeSplinter??'none'} options={OPTIONS} describedBy={w.describedBy}
    onChange={v=>onUpdate({activeSplinter:v==='none'?null:v})}/>}
  </Field>
  <div className={s.columns}>
   {SPLINTERS.map(sp=><div key={sp.id} className={s.column}>
    <Field label={`${sp.name} rank`}>
     {w=><NumberField wire={w} min={0} max={24} placeholder="Not set" value={profile.splinterRanks[sp.id]??''}
      onChange={e=>{const v=parseRank(e.target.value);if(v!==undefined)onUpdate({splinterRanks:{...profile.splinterRanks,[sp.id]:v}})}}/>}
    </Field>
    {sp.noHordes&&<p className={s.note}>{sp.noHordes}</p>}
    {sp.bonuses.length>0&&<ul className={s.list}>
     {sp.bonuses.map(b=>{
      const st=bonusState(profile,sp.id,b.rank);
      return <li key={b.rank} className={cx(s.item,s[st])}>
       <b>Rank {b.rank}: {b.node}</b>, {b.where}. {b.effect} {b.note}
       {st==='reached'&&<span className={s.pending}> Applies while active.</span>}
      </li>;
     })}
    </ul>}
   </div>)}
  </div>
 </div>;
}
