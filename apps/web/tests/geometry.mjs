/**
 * Measures a rendered DiamondGraph. Returns connectors that pass through a node or label
 * they don't join, and node or label boxes that overlap another node's.
 * Elements: path[data-graph-edge][data-from][data-to], [data-graph-node=id], [data-graph-label=id].
 */
export async function checkGraph(page,root){
 return root.evaluate(el=>{
  // Shrink boxes by a pixel, so a connector meeting a box edge doesn't count as crossing it.
  const TOL=1;
  const box=(e,kind,id)=>{const r=e.getBoundingClientRect();return {kind,id,x:r.left,y:r.top,w:r.width,h:r.height}};
  const boxes=[
   ...[...el.querySelectorAll('[data-graph-node]')].map(e=>box(e,'node',e.dataset.graphNode)),
   ...[...el.querySelectorAll('[data-graph-label]')].map(e=>box(e,'label',e.dataset.graphLabel))
  ];
  const inside=(p,b)=>p.x>b.x+TOL&&p.x<b.x+b.w-TOL&&p.y>b.y+TOL&&p.y<b.y+b.h-TOL;
  const crossings=new Set();
  for(const path of el.querySelectorAll('path[data-graph-edge]')){
   const {from,to}=path.dataset;
   const ctm=path.getScreenCTM();
   // Sample each subpath on its own, so the jump between subpaths isn't treated as a line.
   for(const sub of path.getAttribute('d').split('M').map(s=>s.trim()).filter(Boolean)){
    const pts=sub.split(/\s*L\s*/).map(pair=>pair.trim().split(/[\s,]+/).map(Number));
    for(let i=1;i<pts.length;i++){
     const [x1,y1]=pts[i-1],[x2,y2]=pts[i];
     const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)));
     for(let k=0;k<=n;k++){
      const p=new DOMPoint(x1+(x2-x1)*k/n,y1+(y2-y1)*k/n).matrixTransform(ctm);
      for(const b of boxes)if(b.id!==from&&b.id!==to&&inside(p,b))crossings.add(`${from} > ${to} crosses ${b.kind} ${b.id}`);
     }
    }
   }
  }
  const overlaps=[];
  const hit=(a,b)=>a.x<b.x+b.w-TOL&&b.x<a.x+a.w-TOL&&a.y<b.y+b.h-TOL&&b.y<a.y+a.h-TOL;
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];
   if(a.id!==b.id&&hit(a,b))overlaps.push(`${a.kind} ${a.id} overlaps ${b.kind} ${b.id}`);
  }
  return {crossings:[...crossings],overlaps};
 });
}
