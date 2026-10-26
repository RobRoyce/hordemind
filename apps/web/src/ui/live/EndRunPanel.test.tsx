import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EndRunPanel} from './EndRunPanel';

const panel=(mode:'final'|'ending')=>renderToStaticMarkup(<EndRunPanel mode={mode} totalWaves={10} aether="" onAether={()=>{}}
 onFinish={()=>{}} onEnd={()=>{}} onKeep={()=>{}} error="" aetherError="" headingRef={null}/>);

describe('final Aether',()=>{
 it('is required when a full run finishes',()=>{
  expect(panel('final')).toContain('>Final Aether<');
 });
 it('stays optional when a run ends early',()=>{
  expect(panel('ending')).toContain('Final Aether (optional)');
 });
});
