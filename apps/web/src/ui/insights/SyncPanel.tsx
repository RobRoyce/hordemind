import {useState} from 'react';
import {Button,Checkbox,Field,Notice,SectionHeading,TextField} from '../kit';
import type {SyncControls,SyncState} from '../useSync';
import s from './SyncPanel.module.css';

const ago=(iso:string)=>{
 const secs=Math.round((Date.now()-Date.parse(iso))/1000);
 return secs<60?'just now':secs<3600?`${Math.round(secs/60)} min ago`:new Date(iso).toLocaleString();
};

const count=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;

export function SyncPanel({sync,controls}:{sync:SyncState;controls:SyncControls}){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const act=async(f:()=>Promise<void>)=>{setBusy(true);try{await f()}finally{setBusy(false)}};
 const state=sync.phase==='unavailable'?'Not configured':sync.user?'On':'Off';

 return <section className={s.section} aria-label="Private sync">
  <SectionHeading level={3} aside={<span className={s.state}>{state}</span>}>Private sync</SectionHeading>
  <p className={s.text}>Copies your characters and runs to your own account, so they survive a cleared browser and reach your other devices. It's separate from community research, and nothing is shared with anyone.</p>
  {sync.phase==='unavailable'?<p className={s.note}>This build has no database configured, so runs stay in this browser. Developers: run <code>make up</code> for a local server.</p>:
   !sync.user?<form className={s.form} onSubmit={e=>{e.preventDefault();void act(()=>controls.signIn(email,password))}}>
    <p className={s.note}>Server: {sync.server}</p>
    <div className={s.fields}>
     <Field label="Email">{w=><TextField wire={w} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>}</Field>
     <Field label="Password">{w=><TextField wire={w} type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/>}</Field>
    </div>
    <div className={s.actions}>
     <Button variant="primary" type="submit" disabled={busy}>Sign in and sync</Button>
     <Button disabled={busy||!email||password.length<8} onClick={()=>void act(()=>controls.signUp(email,password))}>Create account</Button>
    </div>
   </form>:<>
    <p className={s.text} role="status">
     Signed in as <b>{sync.user.email??'this account'}</b> on {sync.server}.{' '}
     {sync.phase==='syncing'?'Syncing…':sync.last?`Last synced ${ago(sync.last.at)}: ${count(sync.last.runs,'run')}, ${count(sync.last.events,'event')}.`:'Not synced yet on this device.'}
    </p>
    <div className={s.actions}>
     <Button variant="primary" disabled={sync.phase==='syncing'} onClick={()=>void controls.syncNow()}>Sync now</Button>
     <Button disabled={busy} onClick={()=>void act(controls.signOut)}>Sign out</Button>
    </div>
    <Checkbox label="Sync automatically after changes" checked={sync.auto} onChange={controls.setAuto}/>
    <p className={s.note}>Signing out keeps everything on this device. Records already synced stay in your account.</p>
   </>}
  {sync.error&&<Notice tone="error"><p>{sync.error}</p></Notice>}
 </section>;
}
