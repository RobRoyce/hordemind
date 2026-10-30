// Lays out a tree on a fixed grid from each node's row and col, with straight connectors between node centres.

export interface Box{x:number;y:number;width:number;height:number}
export interface GraphNodeInput{id:string;row:number;col:number;root?:boolean;labelLines:number;labelWidth:number}
export interface LayoutOptions{colWidth:number;rowHeight:number;radius:number;lineHeight:number;labelGap:number;pad:number;labels:boolean}
/** `r` runs from the centre to a vertex. The label is null for the root and when labels are off. */
export interface PlacedNode{id:string;x:number;y:number;r:number;root:boolean;label:Box|null}
export interface Connector{from:string;to:string;points:readonly [readonly [number,number],readonly [number,number]]}
export interface GraphLayout{nodes:PlacedNode[];connectors:Connector[];width:number;height:number}

export const DEFAULT_LAYOUT:LayoutOptions={colWidth:112,rowHeight:116,radius:26,lineHeight:16,labelGap:8,pad:74,labels:true};

/** Small nodes without labels, spread so `colSpan` columns fill `width`. */
export function fitLayout(width:number,colSpan:number):LayoutOptions{
 const colWidth=(width-40)/Math.max(1,colSpan);
 return {colWidth,rowHeight:Math.max(48,colWidth),radius:16,lineHeight:16,labelGap:8,pad:20,labels:false};
}

/** Space above a top-row node and below the lowest one. */
const EDGE=12;
/** Space beyond the outermost label. */
const LABEL_EDGE=8;
/** How much larger the root is drawn. */
const ROOT_GROW=6;

export function layoutGraph(nodes:readonly GraphNodeInput[],edges:readonly (readonly [string,string])[],o:LayoutOptions):GraphLayout{
 const minCol=Math.min(...nodes.map(n=>n.col)),minRow=Math.min(...nodes.map(n=>n.row));
 const labelled=(n:GraphNodeInput)=>o.labels&&!n.root;
 // Shift right when a label is wider than the pad and would start left of the graph.
 const shift=Math.max(0,...nodes.filter(labelled).map(n=>n.labelWidth/2-o.pad-(n.col-minCol)*o.colWidth));

 const placed=nodes.map((n):PlacedNode=>{
  const x=o.pad+(n.col-minCol)*o.colWidth+shift,y=o.radius+EDGE+(n.row-minRow)*o.rowHeight;
  const r=n.root?o.radius+ROOT_GROW:o.radius;
  const label=labelled(n)?{x:x-n.labelWidth/2,y:y+r+o.labelGap,width:n.labelWidth,height:n.labelLines*o.lineHeight}:null;
  return {id:n.id,x,y,r,root:Boolean(n.root),label};
 });
 const byId=new Map(placed.map(p=>[p.id,p]));
 const connectors=edges.flatMap(([from,to]):Connector[]=>{
  const a=byId.get(from),b=byId.get(to);
  return a&&b?[{from,to,points:[[a.x,a.y],[b.x,b.y]]}]:[];
 });

 const labels=placed.flatMap(p=>p.label?[p.label]:[]);
 const width=Math.max(...placed.map(p=>p.x+o.pad),...labels.map(b=>b.x+b.width+LABEL_EDGE));
 const height=Math.max(...placed.map(p=>p.y+p.r+EDGE),...labels.map(b=>b.y+b.height+LABEL_EDGE));
 return {nodes:placed,connectors,width,height};
}
