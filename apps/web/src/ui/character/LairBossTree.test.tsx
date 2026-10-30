import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newProfile} from '../../domain/run';
import {LB_GRAPH,ROOT} from '../../domain/warPlans';
import {DEFAULT_LAYOUT,layoutGraph,type Box} from '../kit';
import {LairBossTree} from './LairBossTree';
import {lairBossGraphNodes,lairBossState} from './lairBossView';

const intersects=(p:Box,q:Box)=>p.x<q.x+q.width&&q.x<p.x+p.width&&p.y<q.y+q.height&&q.y<p.y+p.height;

describe('LairBossTree',()=>{
 const html=renderToStaticMarkup(<LairBossTree profile={newProfile('A','Paladin')} onUpdate={()=>null}/>);
 it('draws every Lair Bosses upgrade as a button',()=>expect(html.match(/data-graph-node=/g)).toHaveLength(17));
 // Each node's hidden description repeats the mark, so count the label lines.
 it('marks the six upgrades that change a Hordes run',()=>expect(html.match(/◆ Hordes<\/tspan>/g)).toHaveLength(6));
 it('warns about saved upgrades with no path',()=>{
  const p={...newProfile('A','Paladin'),lairBossNodes:['Infernal Deception','Exotic Armory']};
  expect(renderToStaticMarkup(<LairBossTree profile={p} onUpdate={()=>null}/>)).toContain(
   'Saved before HordeMind followed the tree: Infernal Deception, Exotic Armory. Learn an upgrade that connects them to the top node, or unlearn them.');
 });
 it('points to the marks in its lead',()=>expect(html).toContain('Learn the same upgrades you have in game. Upgrades marked ◆ change an Infernal Hordes run.'));
 it('asks desktop users to hover or focus an upgrade',()=>
  expect(html).toContain('Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it.'));
 it('names only locked upgrades in its legend, having no choose-one pairs',()=>{
  expect(html).toContain('>Locked</li>');
  expect(html).not.toContain('Locked or excluded');
 });
 it('names its details region after the tree',()=>expect(html).toContain('aria-label="Lair Bosses War Plan details"'));
});

describe('Lair Bosses view',()=>{
 it('opens the neighbours of the root and of learned upgrades, and locks the rest',()=>{
  const learned=['Nemesis Tides'];
  expect(lairBossState(learned,ROOT)).toBe('learned');
  expect(lairBossState(learned,'Nemesis Tides')).toBe('learned');
  expect(lairBossState(learned,'Infernal Deception')).toBe('open');
  expect(lairBossState(learned,'Lair of Runes')).toBe('open');
  expect(lairBossState(learned,'Exotic Armory')).toBe('locked');
 });
 it('keeps desktop labels clear of each other and of other nodes',()=>{
  const L=layoutGraph(lairBossGraphNodes(),LB_GRAPH.edges,DEFAULT_LAYOUT);
  const diamond=(n:typeof L.nodes[number]):Box=>({x:n.x-n.r,y:n.y-n.r,width:2*n.r,height:2*n.r});
  for(const a of L.nodes)for(const b of L.nodes){
   if(a===b||!a.label)continue;
   expect(intersects(a.label,diamond(b)),`${a.id} label covers ${b.id}`).toBe(false);
   if(b.label)expect(intersects(a.label,b.label),`${a.id} label overlaps ${b.id}`).toBe(false);
  }
 });
});
