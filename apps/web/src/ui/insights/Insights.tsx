import type {CharacterProfile,RunRecord} from '../../domain/schema';
import {effectiveEvents} from '../../domain/run';
import {downloadExport} from '../../storage/local';
import {Button,Notice,PageHeader,SectionHeading} from '../kit';
import {useAnalysis} from '../useAnalysis';
import type {SyncControls,SyncState} from '../useSync';
import {ChoicesSection} from './ChoicesSection';
import {GameNumbersSection} from './GameNumbersSection';
import {ReportCardSection} from './ReportCardSection';
import {ResearchNote} from './ResearchNote';
import {RunHistory} from './RunHistory';
import {SyncPanel} from './SyncPanel';
import s from './Insights.module.css';

interface Props{runs:RunRecord[];profile:CharacterProfile|null;selectRun:(id:string)=>void;onExport:()=>string;sync:SyncState;syncControls:SyncControls}

const plural=(n:number,one:string,many:string)=><><span className={s.num}>{n}</span> {n===1?one:many}</>;

export function Insights({runs,profile,selectRun,onExport,sync,syncControls}:Props){
 const totalDecisions=runs.reduce((n,r)=>n+effectiveEvents(r).filter(x=>x.type==='offer_chosen').length,0);
 const {result,busy,error,retry}=useAnalysis(runs,profile?.id??null);
 const counted=runs.reduce((n,r)=>n+effectiveEvents(r).filter(x=>(x.type==='wave_observed'||x.type==='aether_observed')&&x.payload.eventCounts&&Object.keys(x.payload.eventCounts).length).length,0);
 return <div className={s.page}>
  <PageHeader title="Insights" lead="Your runs, kept on this device."/>
  <p className={s.summary}>
   {plural(runs.length,'run','runs')}, {plural(totalDecisions,'recorded choice','recorded choices')}, and {plural(counted,'wave with event counts','waves with event counts')}.
  </p>
  {error?<Notice tone="error">
   <p><strong>Couldn't replay your runs.</strong> {error}</p>
   <Button onClick={retry}>Try again</Button>
  </Notice>
  :!result?(busy&&<p role="status" className={s.busy}>Replaying your runs…</p>)
  :<>
   <ReportCardSection name={profile?.name??null} analysis={result.character}/>
   <ChoicesSection name={profile?.name??null} overrides={result.character?.overrides??null}/>
   <GameNumbersSection counts={result.counts}/>
  </>}
  <section aria-labelledby="run-history">
   <SectionHeading id="run-history" aside={<Button variant="secondary" onClick={()=>downloadExport(onExport())} disabled={runs.length===0}>Export all runs</Button>}>Run history</SectionHeading>
   <RunHistory runs={runs} selectRun={selectRun}/>
  </section>
  <SyncPanel sync={sync} controls={syncControls}/>
  <ResearchNote/>
 </div>;
}
