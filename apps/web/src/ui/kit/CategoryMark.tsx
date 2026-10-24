import type {CSSProperties} from 'react';
import type {OfferFamily} from '../../catalog';
import {cx} from './cx';
import s from './CategoryMark.module.css';

export type FamilySlug='masses'|'spires'|'hellborne'|'fiends'|'lords'|'monsters'|'hellfire'|'player'|'council'|'special'|'chaos';

const SLUGS:Readonly<Record<OfferFamily,FamilySlug>>={
 Masses:'masses',Spires:'spires',Hellborne:'hellborne',Fiends:'fiends',Lords:'lords',Monsters:'monsters',
 Hellfire:'hellfire','Player boon':'player','Player bane':'player',Council:'council','Special boss':'special',Chaos:'chaos'
};

/** The pigment token suffix for an offer family. */
export function familySlug(f:OfferFamily):FamilySlug{return SLUGS[f]}

/**
 * A pigment diamond and the category name. `null` marks an offer outside the catalog.
 * `label` shows other text, such as the offer's name, beside the pigment.
 */
export function CategoryMark({family,label}:{family:OfferFamily|null;label?:string}){
 const pigment=family?{'--pigment':`var(--hm-fam-${familySlug(family)})`} as CSSProperties:undefined;
 return <span className={cx(s.mark,!family&&s.unlisted)} style={pigment}>
  <span className={s.diamond} aria-hidden="true"/>
  {label??family??'Unlisted'}
 </span>;
}
