export type View='character'|'run'|'insights';

/** Maps a location hash to a view. "#strategy", Character's old name, still opens Character. */
export function viewFromHash(hash:string):View{
 const v=hash.replace(/^#/,'');
 if(v==='character'||v==='strategy')return 'character';
 return v==='insights'||v==='run'?v:'run';
}
