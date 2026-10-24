import {describe,expect,it} from 'vitest';
import {ACTION_TOAST_MS,PLAIN_TOAST_MS,nextToast} from './toast';

describe('toasts',()=>{
 const undo={label:'Undo',onClick:()=>{}};
 it('keeps a toast with an action for at least 8 seconds',()=>{
  expect(nextToast('Wave 1: The Puffing Masses recorded',undo).ms).toBe(8000);
  expect(ACTION_TOAST_MS).toBeGreaterThanOrEqual(8000);
 });
 it('keeps a plain toast briefly',()=>expect(nextToast('Saved').ms).toBe(PLAIN_TOAST_MS));
 it('carries its action',()=>expect(nextToast('x',undo).action).toBe(undo));
 it('has no action unless given one',()=>expect(nextToast('x')).not.toHaveProperty('action'));
});
