import type {CharacterProfile} from '../../domain/schema';
import {SPLINTERS} from '../../domain/splinters';
import {Field,NumberField,Segmented,cx} from '../kit';
import {TIPS} from './CharacterForm';
import {bonusState,chooseSplinter,parseRank} from './splinterView';
import s from './SplinterBlock.module.css';

const OPTIONS=SPLINTERS.map(x=>({value:x.id,label:x.name.replace('Splinter of ','')}));

interface Props{profile:CharacterProfile;onUpdate:(patch:Partial<CharacterProfile>)=>void}

export function SplinterBlock({profile,onUpdate}:Props){
 const active=SPLINTERS.find(x=>x.id===profile.activeSplinter);
 return <div className={s.block}>
  <Field label="Active splinter" group help={TIPS.splinter}>
   {w=><Segmented label="Active splinter" value={profile.activeSplinter} options={OPTIONS} describedBy={w.describedBy}
    onChange={id=>onUpdate(chooseSplinter(profile,id))}/>}
  </Field>
  {!active&&<p className={s.note}>Pick the splinter you have active to enter its rank.</p>}
  {active&&<>
   <Field label="Splinter rank">
    {w=><NumberField wire={w} min={0} max={24} placeholder="Not set" value={profile.splinterRank??''}
     onChange={e=>{const v=parseRank(e.target.value);if(v!==undefined)onUpdate({splinterRank:v})}}/>}
   </Field>
   {active.noHordes&&<p className={s.note}>{active.noHordes}</p>}
   {active.bonuses.length>0&&<ul className={s.list}>
    {active.bonuses.map(b=>{
     const st=bonusState(profile,b);
     return <li key={b.rank} className={cx(s.item,s[st])}>
      <b>Rank {b.rank}: {b.node}</b>, {b.where.charAt(0).toLowerCase()+b.where.slice(1)}. {b.effect} {st==='unlearned'?`Learn ${b.node} to use it.`:b.note}
     </li>;
    })}
   </ul>}
  </>}
 </div>;
}
