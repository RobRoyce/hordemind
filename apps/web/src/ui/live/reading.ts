/** Parses an Aether total typed from the game. Blank means no reading, unless `missing` is given: then blank throws it. */
export function parseAether(text:string,label:string,missing?:string):number|null{
 if(text.trim()===''){
  if(missing)throw new Error(missing);
  return null;
 }
 const n=Number(text);
 if(!Number.isInteger(n)||n<0)throw new Error(`${label} must be a whole number of 0 or more`);
 return n;
}

/** Event counts the player entered. A blank field means not counted, so it is left out. */
export function parseCounts(counts:Record<string,string>):Record<string,number>|undefined{
 const out:Record<string,number>={};
 for(const [key,text] of Object.entries(counts)){
  if(text.trim()==='')continue;
  const n=Number(text);
  if(!Number.isInteger(n)||n<0)throw new Error('Event counts must be whole numbers of 0 or more');
  out[key]=n;
 }
 return Object.keys(out).length?out:undefined;
}
