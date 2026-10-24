// Lays out a tree on a fixed grid from each node's row and col, with right-angle connectors.

export interface Box{x:number;y:number;width:number;height:number}
export interface GraphNodeInput{id:string;row:number;col:number;parents:readonly string[];labelLines:number;labelWidth:number}
export interface LayoutOptions{colWidth:number;rowHeight:number;diamond:number;lineHeight:number;labelGap:number}
export interface PlacedNode{id:string;x:number;y:number;diamond:Box;label:Box}
export interface Connector{from:string;to:string;points:readonly (readonly [number,number])[]}
export interface GraphLayout{nodes:PlacedNode[];connectors:Connector[];width:number;height:number}

export const DEFAULT_LAYOUT:LayoutOptions={colWidth:140,rowHeight:130,diamond:38,lineHeight:16,labelGap:8};

/** Three columns that fit a 390px phone inside 16px gutters. */
export const COMPACT_LAYOUT:LayoutOptions={colWidth:116,rowHeight:120,diamond:34,lineHeight:16,labelGap:6};

/** Space above the first row's diamonds. */
const TOP=8;
/** Gap between a label's last line and the connector leaving it. */
const LEAVE=4;

export function layoutGraph(nodes:readonly GraphNodeInput[],o:LayoutOptions):GraphLayout{
 const minCol=Math.min(...nodes.map(n=>n.col));
 const half=o.diamond/2;
 // Shift right when a label is wider than its column and would start left of the graph.
 const offset=Math.max(0,...nodes.map(n=>n.labelWidth/2-(n.col-minCol+0.5)*o.colWidth));

 const placed=new Map<string,PlacedNode&{col:number;labelBottom:number}>();
 for(const n of nodes){
  const col=n.col-minCol;
  const x=(col+0.5)*o.colWidth+offset;
  const y=n.row*o.rowHeight+half+TOP;
  const labelTop=y+half+o.labelGap;
  const labelBottom=labelTop+n.labelLines*o.lineHeight;
  placed.set(n.id,{
   id:n.id,x,y,col,labelBottom,
   diamond:{x:x-half,y:y-half,width:o.diamond,height:o.diamond},
   label:{x:x-n.labelWidth/2,y:labelTop,width:n.labelWidth,height:labelBottom-labelTop}
  });
 }

 const connectors:Connector[]=[];
 for(const n of nodes){
  const child=placed.get(n.id)!;
  const parents=n.parents.map(id=>placed.get(id)).filter(p=>p!==undefined);
  const hasParentAbove=parents.some(p=>p.col===child.col);
  for(const p of parents){
   const start=[p.x,p.labelBottom+LEAVE] as const;
   const top=[child.x,child.y-half] as const;
   let points:(readonly [number,number])[];
   if(p.col===child.col)points=[start,top];
   else if(hasParentAbove){
    // Enter the side vertex that faces the parent, so the top vertex stays free for the parent above.
    const side=p.x<child.x?child.x-half:child.x+half;
    points=[start,[p.x,child.y],[side,child.y]];
   }else{
    const bus=(p.labelBottom+child.y-half)/2;
    points=[start,[p.x,bus],[child.x,bus],top];
   }
   connectors.push({from:p.id,to:child.id,points});
  }
 }

 const list=[...placed.values()];
 const width=Math.max(...list.map(n=>(n.col+1)*o.colWidth+offset),...list.map(n=>n.label.x+n.label.width));
 const height=Math.max(...list.map(n=>n.labelBottom))+TOP;
 return {nodes:list.map(({id,x,y,diamond,label})=>({id,x,y,diamond,label})),connectors,width,height};
}
