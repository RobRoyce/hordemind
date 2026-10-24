import {useSyncExternalStore} from 'react';

const QUERY='(max-width: 699px)';

function subscribe(onChange:()=>void){
 const media=window.matchMedia(QUERY);
 media.addEventListener('change',onChange);
 return ()=>media.removeEventListener('change',onChange);
}

/** True below the 700px breakpoint, where the app uses its phone layout. */
export function useNarrow():boolean{
 return useSyncExternalStore(subscribe,()=>window.matchMedia(QUERY).matches,()=>false);
}
