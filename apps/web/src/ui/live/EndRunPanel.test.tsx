import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EndRunPanel} from './EndRunPanel';

const panel=(mode:'final'|'ending')=>renderToStaticMarkup(<EndRunPanel mode={mode} totalWaves={10} aether="" onAether={()=>{}}
 onFinish={()=>{}} onEnd={()=>{}} onKeep={()=>{}} error="" aetherError="" missed={false} onMissed={()=>{}} headingRef={null}/>);

describe('final Aether',()=>{
 it('is required when a full run finishes, unless marked missed',()=>{
  expect(panel('final')).toContain('>Final Aether<');
  expect(panel('final')).toContain('Missed it');
 });
 it('stays optional when a run ends early, so it needs no Missed it',()=>{
  expect(panel('ending')).toContain('Final Aether (optional)');
  expect(panel('ending')).not.toContain('Missed it');
 });
});
