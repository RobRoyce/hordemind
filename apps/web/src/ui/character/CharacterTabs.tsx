import type {CharacterProfile} from '../../domain/schema';
import {Button,Tabs} from '../kit';

interface Props{profiles:readonly CharacterProfile[];current:string|null;onSelect:(id:string)=>void;onCreate:()=>void}

export function CharacterTabs({profiles,current,onSelect,onCreate}:Props){
 return <Tabs label="Saved characters" current={current} onSelect={onSelect}
  items={profiles.map(p=>({id:p.id,label:p.name,detail:p.className}))}
  trailing={<Button variant="text" onClick={onCreate}>New character</Button>}/>;
}
