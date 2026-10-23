import {useState} from 'react';
import type {SyncControls,SyncState} from './useSync';

const ago=(iso:string)=>{
 const s=Math.round((Date.now()-Date.parse(iso))/1000);
 return s<60?'just now':s<3600?`${Math.round(s/60)} min ago`:new Date(iso).toLocaleString();
};

const count=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;

export function SyncPanel({sync,controls}:{sync:SyncState;controls:SyncControls}){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const act=async(f:()=>Promise<void>)=>{setBusy(true);try{await f()}finally{setBusy(false)}};

 return <section className="surface" aria-labelledby="sync-title">
  <div className="section-header"><h2 id="sync-title">Private sync</h2><span className="chip">{sync.phase==='unavailable'?'Not configured':sync.user?'On':'Off'}</span></div>
  <p>Copies your characters and runs to your own account on a database server, so they survive a cleared browser and reach your other devices. This is separate from community research: nothing is shared with anyone.</p>
  {sync.phase==='unavailable'?<p className="micro">This build has no database configured, so runs stay in this browser. Developers: run <code>make up</code> for a local server.</p>:
   !sync.user?<form className="sync-form" onSubmit={e=>{e.preventDefault();void act(()=>controls.signIn(email,password))}}>
    <p className="micro">Server: {sync.server}</p>
    <div className="form-grid">
     <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    </div>
    <div className="actions">
     <button className="primary" type="submit" disabled={busy}>Sign in and sync</button>
     <button type="button" disabled={busy||!email||password.length<8} onClick={()=>void act(()=>controls.signUp(email,password))}>Create account</button>
    </div>
   </form>:<>
    <p className="sync-status" role="status">
     Signed in as <b>{sync.user.email??'this account'}</b> on {sync.server}.{' '}
     {sync.phase==='syncing'?'Syncing…':sync.last?`Last synced ${ago(sync.last.at)}: ${count(sync.last.runs,'run')}, ${count(sync.last.events,'event')}.`:'Not synced yet on this device.'}
    </p>
    <div className="actions">
     <button className="primary" disabled={sync.phase==='syncing'} onClick={()=>void controls.syncNow()}>Sync now</button>
     <button disabled={busy} onClick={()=>void act(controls.signOut)}>Sign out</button>
     <label className="checkbox-label"><input type="checkbox" checked={sync.auto} onChange={e=>controls.setAuto(e.target.checked)}/> Sync automatically after changes</label>
    </div>
    <p className="micro">Signing out keeps everything on this device. Records already synced stay in your account.</p>
   </>}
  {sync.error&&<p className="error-msg" role="alert">{sync.error}</p>}
 </section>;
}
