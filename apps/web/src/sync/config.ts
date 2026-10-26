export interface SyncConfig{url:string;key:string}

/** Sync is available only in builds configured with a Supabase URL and publishable key. */
export function syncConfig():SyncConfig|null{
 const url=import.meta.env.VITE_SUPABASE_URL as string|undefined,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
 return url&&key?{url,key}:null;
}
