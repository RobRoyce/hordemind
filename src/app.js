import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {offers,byName,defaults,isModeled} from "./catalog.js";
import {BASE,evaluate,diagnose,specialDecision} from "./engine.js";
import {access,nodes,groups} from "./warplans.js";
import {strategies,analyzeSetup} from "./strategy.js";
const h=React.createElement,KEY="hordemind-react-v1";
function readInitial(){let raw=null;try{if(location.hash.startsWith("#run="))raw=JSON.parse(decodeURIComponent(location.hash.slice(5)));else raw=JSON.parse(localStorage.getItem(KEY)||"null")}catch{}return {...BASE,...(raw||{}),choices:[...(raw?.choices||BASE.choices)],history:[...(raw?.history||[])],observations:[...(raw?.observations||[])],assumptions:{...defaults,...(raw?.assumptions||{})}}}
const field=(label,control)=>h("label",{className:"field"},h("span",null,label),control);
function Selector({value,change,placeholder}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(value||"");
 useEffect(()=>setQuery(value||""),[value]);
 const results=offers.filter(o=>(o.name+" "+o.kind+" "+o.detail).toLowerCase().includes(query.toLowerCase())).slice(0,30);
 const picked=byName[value];
 return h("div",{className:"offer-select"},
  h("div",{className:"autocomplete"},
   h("input",{value:query,placeholder,autoComplete:"off",role:"combobox","aria-expanded":open,onChange:e=>{setQuery(e.target.value);change(e.target.value);setOpen(true)},onFocus:()=>setOpen(true),onBlur:()=>setTimeout(()=>setOpen(false),180)}),
   query&&h("button",{type:"button",className:"clear-inline",onClick:()=>{setQuery("");change("");setOpen(true)}},"×"),
   open&&results.length>0&&h("div",{className:"dropdown"},...results.map(o=>h("button",{key:o.name,type:"button",onMouseDown:e=>e.preventDefault(),onClick:()=>{setQuery(o.name);change(o.name);setOpen(false)}},
      h("span",null,o.name),h("small",null,o.kind+" · "+o.detail)))))
  ,picked&&h("div",{className:"offer-description"},h("span",{className:"tag"},picked.kind),h("span",null,picked.detail),!isModeled(picked.name)?h("span",{className:"uncertain"},"Not yet simulated"):picked.approximate&&h("span",{className:"uncertain"},"Approximate mechanics")));
}
function WarPlanPanel({state,setState}){
 const selected=state.warNodes||[];
 const toggle=name=>setState(s=>({...s,warNodes:(s.warNodes||[]).includes(name)?s.warNodes.filter(n=>n!==name):[...(s.warNodes||[]),name]}));
 return h("article",{className:"panel"},
 h("div",{className:"sectionhead"},h("h2",null,"Infernal Hordes War Plan"),h("span",{className:"tag"},"Named nodes")),
 h("p",{className:"hint"},access.location+". "+access.unlock),
 h("p",{className:"hint"},access.allocation),
 h("div",{className:"notice smallnotice"},"Nodes describe your actual allocations. Not every node changes Aether directly, and uncalibrated perks are not silently counted in simulations."),
 ...groups.map(group=>h("details",{key:group,open:group==="Offer control"||group==="Chaos focus"?true:undefined},
 h("summary",null,group," · ",nodes.filter(n=>n.branch===group&&selected.includes(n.name)).length," selected"),
 ...nodes.filter(n=>n.branch===group).map(n=>h("div",{className:"node",key:n.name},
 h("label",{className:"nodehead"},h("input",{type:"checkbox",checked:selected.includes(n.name),onChange:()=>toggle(n.name)}),h("strong",null,n.name)),
 h("p",{className:"hint"},n.description),
 h("p",{className:"hint"},"Strategy: "+n.impact),
 h("span",{className:"uncertain"},n.status))))),
 h("div",{className:"hint"},h("strong",null,"Find and configure: "),"Open the War Plans table in Temis (Skovos), select the Infernal Hordes activity tree, and inspect its connected branches. Respec point allocations in-game as needed. ",h("a",{href:access.source,target:"_blank",rel:"noopener noreferrer"},"War Plan reference ↗")));
}
function Recommendations({state}){
 const advice=analyzeSetup(state);
 return h("article",{className:"panel"},
 h("div",{className:"sectionhead"},h("h2",null,"Strategy lab"),h("span",{className:"tag"},"Build guidance")),
 h("p",{className:"hint"},"These are strategies to watch for, not guaranteed choices. Aether recommendations depend on which offers actually appear."),
 ...advice.map((x,i)=>h("p",{className:"advice",key:i},x)),
 ...strategies.map(o=>h("details",{key:o.name},h("summary",null,o.name," — ",o.tag),
 h("p",null,o.why),
 h("p",{className:"hint"},h("strong",null,"Look for: "),o.requires.join(" + ")),
 h("p",{className:"hint"},h("strong",null,"Caveat: "),o.risk))),
 h("h3",null,"Useful War Plan routes"),
 h("p",{className:"hint"},"Chaos-oriented: Method and Madness → Total Chaos; expand with Bedlam. Consistent-offering approach: Method and Madness → Reign in Hell → Pulse of Aether. These are competing setups, not perks to stack indiscriminately."),
 h("p",{className:"hint"},"Season 15 Splinter of Terror bonuses: Cult of Annihilation (rank 5), Impending Doom (rank 14), Council Coffers (rank 20)."),
 h("p",{className:"hint"},"Your goal matters: maximum Aether, Obducite, Talismans, and boss loot may favor different War Plan nodes."));
}

const clean=s=>String(s||"").trim();
function App(){
 const [state,setState]=useState(readInitial),[scores,setScores]=useState(null),[share,setShare]=useState(""),[feedback,setFeedback]=useState(""),[specialChoice,setSpecialChoice]=useState(false),[running,setRunning]=useState(false);
 const update=(k,v)=>setState(s=>({...s,[k]:v}));const selected=state.choices.map(clean).filter(Boolean);const valid=[...new Set(selected)].filter(x=>byName[x]&&isModeled(x));const unmodeled=[...new Set(selected)].filter(x=>byName[x]&&!isModeled(x));
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(state))},[state]);
 function compute(){if(valid.length<2){setFeedback("Need two model-supported offers to compare. Unmodeled offers are identified separately; they are not falsely scored as +0.");return}setRunning(true);setTimeout(()=>{const s=valid.map(o=>evaluate(state,o,Number(state.assumptions.samples)||1200)).sort((a,b)=>b.mean-a.mean);setScores(s);setRunning(false);setFeedback("")},20)}
 function choose(name){setState(s=>({...s,history:[...s.history,name],choices:["","","",""],wave:Math.min(Number(s.waves),Number(s.wave)+1),specialAvailable:specialAvailable&&!specialChoice}));setSpecialChoice(false);setScores(null)}
 function link(){const url=location.origin+location.pathname+"#run="+encodeURIComponent(JSON.stringify(state));setShare(url);return url}
 async function copy(){const url=link();try{await navigator.clipboard.writeText(url);setFeedback("Share link copied.")}catch{setFeedback("Clipboard access blocked. Select and copy the URL below.")}}
 const newRun=()=>{if(!confirm("Clear this run and recorded Aether?"))return;setState(s=>({...BASE,waves:s.waves,kill:s.kill,mobility:s.mobility,specialEnabled:s.specialEnabled,warPlanNotes:s.warPlanNotes,assumptions:s.assumptions}));setScores(null);setShare("");history.replaceState(null,"",location.pathname)}
 const best=scores?.[0];const special=best?specialDecision(state,best):null;
 return h("main",null,
  h("header",{className:"mast"},h("div",null,h("div",{className:"eyebrow"},"DIABLO IV · SEASON 15"),h("h1",null,"Horde",h("em",null,"Mind")),h("p",null,"Expected-Aether decision support for Infernal Hordes")),h("div",{className:"actions"},h("button",{onClick:newRun},"New run"),h("button",{className:"primary",onClick:copy},"Share run"))),
  h("div",{className:"notice"},"Experimental simulator. Aether predictions depend on provisional spawn rates, clear times and Chaos probabilities. Results are not measured Season 15 yields; the engine does not yet optimize future offers."),
  h("div",{className:"layout"},
   h("section",null,
    h("article",{className:"panel"},h("h2",null,"Run configuration"),h("div",{className:"twocol"},
      field("Total waves",h("select",{value:state.waves,onChange:e=>update("waves",+e.target.value)},...[6,8,10].map(n=>h("option",{key:n,value:n},n)))),
      field("Current wave",h("input",{type:"number",min:1,max:10,value:state.wave,onChange:e=>update("wave",Math.max(1,+e.target.value||1))})),
      field("Elite clear speed",h("select",{value:state.kill,onChange:e=>update("kill",e.target.value)},...["fast","medium","slow"].map(x=>h("option",{key:x,value:x},x)))),
      field("Mobility",h("select",{value:state.mobility,onChange:e=>update("mobility",e.target.value)},...["high","low"].map(x=>h("option",{key:x,value:x},x))))
     ),
     h("details",null,h("summary",null,"War Plans and simulator assumptions"),
      h("div",{className:"setting"},h("label",null,h("input",{type:"checkbox",checked:state.specialEnabled,onChange:e=>update("specialEnabled",e.target.checked)})," One-time additional special offer enabled")),
      h("div",{className:"setting"},h("label",null,h("input",{type:"checkbox",checked:state.specialAvailable,onChange:e=>update("specialAvailable",e.target.checked),disabled:!state.specialEnabled})," Special offer still unused")),
      field("Exact War Plan perks / notes",h("input",{value:state.warPlanNotes,onChange:e=>update("warPlanNotes",e.target.value),placeholder:"Note perk names and ranks"})),
      h("p",{className:"hint"},"Unverified War Plan effects are tracked but do not silently change probabilities."),
      h("div",{className:"twocol"},...["massRate","secondsPerMass","secondsPerElite","secondsPerSpire","secondsPerLord","chaosScale","samples"].map(k=>field(k,h("input",{type:"number",step:k==="samples"?100:.1,min:0,value:state.assumptions[k],onChange:e=>setState(s=>({...s,assumptions:{...s.assumptions,[k]:+e.target.value}}))})))))
    ),
    h(WarPlanPanel,{state,setState}),
    h("article",{className:"panel"},h("div",{className:"sectionhead"},h("h2",null,"Available offers"),h("span",{className:"tag"},"Search A–Z")),h("p",{className:"hint"},"Type a name, event type or effect. Every suggestion shows its mechanic. Chaos outcomes cannot be selected ahead of time."),
     ...state.choices.map((v,i)=>h("div",{className:"slot",key:i},field("Offer "+(i+1),h(Selector,{value:v,placeholder:"Type to filter offers…",change:name=>setState(s=>({...s,choices:s.choices.map((x,j)=>j===i?name:x)}))})))),
     state.specialEnabled&&state.specialAvailable&&h("label",{className:"special"},h("input",{type:"checkbox",checked:specialChoice,onChange:e=>setSpecialChoice(e.target.checked)})," This pick uses my one-time War Plan special offer"),
     h("div",{className:"actions"},h("button",{className:"primary",disabled:running||valid.length<2,onClick:compute},running?"Simulating…":"Compare expected Aether"),h("button",{onClick:()=>{update("choices",["","","",""]);setScores(null)}},"Clear choices")),
     selected.filter(x=>!byName[x]).length>0&&h("p",{className:"warning"},"Unknown offer names aren't simulated: "+selected.filter(x=>!byName[x]).join(", "))
    ),
    h("article",{className:"panel"},h("div",{className:"sectionhead"},h("h2",null,"Previous selections"),h("button",{onClick:()=>{setState(s=>({...s,history:s.history.slice(0,-1),wave:Math.max(1,s.wave-1)}));setScores(null)},disabled:state.history.length===0},"Undo")),
     state.history.length?state.history.map((name,i)=>h("div",{className:"historyitem",key:i},h("span",{className:"number"},i+1),name)):h("p",{className:"hint"},"No previous offers yet."))),
   h("section",null,
    h(Recommendations,{state}),
    h("article",{className:"panel"},h("h2",null,"Predicted additional Aether"),!scores?h("p",{className:"hint"},"Compare two or more offers to estimate marginal Aether over the remaining waves. Every candidate is compared to the same baseline and random seeds."):h("div",null,...scores.map((res,i)=>h("div",{className:"result "+(i===0?"winner":""),key:res.name},
      h("div",{className:"sectionhead"},h("strong",null,(i===0?"★ ":"")+res.name),h("strong",{className:"value"},(res.mean>=0?"+":"")+Math.round(res.mean)+" Aether")),
      h("p",{className:"hint"},"5–95% modeled range: "+Math.round(res.lo)+" to "+Math.round(res.hi)+" Aether"),
      h("div",{className:"bar"},h("div",{style:{width:Math.max(0,Math.min(100,res.mean/Math.max(1,scores[0].mean)*100))+"%"}})),
      ...diagnose(state,res).map((s,j)=>h("p",{className:"explanation",key:j},s)),
      h("details",null,h("summary",null,"Event contribution breakdown"),...Object.entries(res.parts).filter(([,x])=>Math.abs(x)>.1).sort((a,b)=>b[1]-a[1]).map(([k,v])=>h("div",{className:"part",key:k},h("span",null,k),h("span",null,(v>=0?"+":"")+v.toFixed(1))))),
      h("button",{onClick:()=>choose(res.name),className:i===0?"primary":""},"Choose "+res.name)
     )))),
     special&&h("div",{className:"notice smallnotice"},h("strong",null,"One-time special opportunity cost"),h("p",null,special.explanation),h("p",null,"Remaining waves afterward: "+special.remaining+". Future option value is unknown and is NOT included in the Aether ranking."))),
    h("article",{className:"panel"},h("h2",null,"Shareable run snapshot"),h("p",{className:"hint"},"Run settings persist in this browser. Share links encode a read-only snapshot of the current run that others can load and continue independently."),h("button",{onClick:copy},"Generate & copy link"),share&&h("textarea",{rows:3,readOnly:true,value:share,onClick:e=>e.target.select(),className:"share"}),feedback&&h("p",{className:"hint",role:"status"},feedback)),
    h("article",{className:"panel"},h("h2",null,"Aether observations"),h("p",{className:"hint"},"Save cumulative totals by wave for future calibration. They are recorded but not yet fit automatically into the model."),
     h("div",{className:"actions"},h("input",{id:"observedWave",type:"number",min:1,defaultValue:state.wave,"aria-label":"Wave number"}),h("input",{id:"observedTotal",type:"number",min:0,defaultValue:0,"aria-label":"Cumulative Aether"}),h("button",{onClick:()=>{const wave=+document.querySelector("#observedWave").value,total=+document.querySelector("#observedTotal").value;if(!Number.isFinite(total)||wave<1)return;setState(s=>({...s,observations:[...s.observations.filter(o=>o.wave!==wave),{wave,total}].sort((a,b)=>a.wave-b.wave)}))}},"Record")),
     ...state.observations.map(o=>h("div",{className:"historyitem",key:o.wave},"Wave "+o.wave+": "+o.total+" Aether")))
   )
  ),
  h("footer",null,"No API keys, no paid inference, no data transmission. Runs and simulations are local to your browser. ",h("a",{href:"https://github.com/RobRoyce/hordemind"},"Source code"))
 )}
createRoot(document.getElementById("root")).render(h(App));
