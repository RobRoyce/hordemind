import type {Comparison,Estimate} from '../../recommendation/model';

/** Whether the best pick survives other timing assumptions, in one line (spec §4). */
export function robustnessLine(result:Comparison):string|null{
 if(result.robust===null)return null;
 if(result.robust)return 'Holds under every timing assumption tested.';
 const modeled=result.assessments.filter((a):a is Estimate=>a.modeled);
 const best=modeled.find(a=>a.offer===result.recommended);
 for(const scenario of best?.sensitivity??[]){
  let winner:Estimate|null=null,top=scenario.mean;
  for(const other of modeled){
   const mean=other===best?undefined:other.sensitivity.find(x=>x.name===scenario.name)?.mean;
   if(mean!==undefined&&mean>top){winner=other;top=mean}
  }
  if(winner)return `${winner.offer} is best if ${scenario.name.toLowerCase()}.`;
 }
 return 'Close call: the best offer changes under other timing assumptions.';
}
