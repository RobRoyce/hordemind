/** A tidy axis end and step for values up to `v`, with about four steps and a floor of 10. */
export function niceMax(v:number):{max:number;step:number}{
 const top=Math.max(v,10);
 let step=0;
 for(let k=1;!step;k*=10)step=[1,2,5].map(m=>m*k).find(s=>s>=top/4)??0;
 return {max:Math.ceil(top/step)*step,step};
}
