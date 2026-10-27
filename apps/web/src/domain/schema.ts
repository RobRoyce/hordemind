import { z } from 'zod';
import { normalizeNodes } from './warplan';
import { SPLINTER_IDS, SPLINTER_MAX_RANK } from './splinters';

export const GAME_CLASSES = ['Barbarian','Druid','Necromancer','Rogue','Sorcerer','Spiritborn','Paladin','Warlock'] as const;
export const CharacterClassSchema = z.enum(GAME_CLASSES);
export const REALMS = ['Season 15','Eternal'] as const;
export const RealmSchema = z.enum(REALMS);
export const DIFFICULTIES = ['Unknown','Normal','Hard','Expert','Penitent','Torment I','Torment II','Torment III','Torment IV','Torment V','Torment VI','Torment VII','Torment VIII','Torment IX','Torment X','Torment XI','Torment XII'] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export const OriginSchema = z.enum(['manual','imported','observed','unknown']);
/**
 * A lone `splinterRank` belongs to the active splinter, or to Terror when none is active.
 * A profile with no `activeSplinter` key predates splinters, so Terror becomes active.
 */
export function migrateSplinterRank(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const o = raw as Record<string, unknown>;
  if (typeof o.splinterRank !== 'number' || Object.hasOwn(o, 'splinterRanks')) return raw;
  const hasActive = Object.hasOwn(o, 'activeSplinter');
  const owner = hasActive && (SPLINTER_IDS as readonly unknown[]).includes(o.activeSplinter) ? o.activeSplinter as string : 'terror';
  return {
    ...o,
    activeSplinter: hasActive ? o.activeSplinter : 'terror',
    splinterRanks: { terror: null, destruction: null, hatred: null, [owner]: o.splinterRank }
  };
}
const Rank = z.number().int().min(0).max(SPLINTER_MAX_RANK).nullable().default(null);
export const CharacterProfileSchema = z.preprocess(migrateSplinterRank, z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  className: CharacterClassSchema,
  realm: RealmSchema.default('Season 15'),
  buildName: z.string().max(100).default(''),
  buildUrl: z.union([z.url(),z.literal('')]).default(''),
  difficulty: DifficultySchema.default('Unknown'),
  gamePatch: z.string().trim().min(1).max(80).default('S15-unverified'),
  warPlanNodes: z.array(z.string().max(100)).default([]).transform(normalizeNodes),
  /** The equipped Season 15 splinter. Its War Plan bonuses apply only while it is active. */
  activeSplinter: z.enum(SPLINTER_IDS).nullable().default(null),
  /** Each splinter's rank (0-24) once set. Only the active splinter's bonuses apply. */
  splinterRanks: z.object({ terror: Rank, destruction: Rank, hatred: Rank }).default({ terror: null, destruction: null, hatred: null }),
  /** Learned nodes of the Lair Bosses War Plan. */
  lairBossNodes: z.array(z.string().max(100)).default([]),
  specialOfferingAvailable: z.boolean().default(false),
  killSpeed: z.enum(['fast','average','slow','unknown']).default('unknown'),
  mobility: z.enum(['high','average','low','unknown']).default('unknown'),
  provenance: OriginSchema.default('manual'),
  updatedAt: z.iso.datetime()
}));
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

const EventBase = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  schemaVersion: z.literal(1),
  sequence: z.number().int().min(0),
  clientVersion: z.string().min(1).max(100),
  at: z.iso.datetime()
});
const Identifier = z.string().trim().min(1).max(150);
const EventCounts = z.record(z.string(),z.number().int().min(0));
export const MAX_OFFERS = 5;
export const EventSchema = z.discriminatedUnion('type', [
  EventBase.extend({type:z.literal('run_started'),payload:z.object({
    profile:CharacterProfileSchema,
    totalWaves:z.number().int().min(1).max(20),
    gamePatch:Identifier
  })}),
  // `wave` is the wave this offer precedes: the first offer comes before wave 1.
  // Up to five slots: three regular offers, a Chaos offer and a special offer.
  EventBase.extend({type:z.literal('offers_presented'),payload:z.object({
    wave:z.number().int().min(1).max(20),
    offered:z.array(Identifier).min(2).max(MAX_OFFERS),
    specialSlotIndex:z.number().int().min(0).max(MAX_OFFERS-1).optional()
  })}),
  EventBase.extend({type:z.literal('offer_chosen'),payload:z.object({
    wave:z.number().int().min(1).max(20),
    chosen:Identifier,
    chosenIndex:z.number().int().min(0).max(MAX_OFFERS-1),
    usedSpecial:z.boolean(),
    followedRecommendation:z.boolean().nullable().default(null),
    recommendedOffer:Identifier.nullable().default(null),
    modelVersion:z.string().max(100).nullable().default(null),
    // 'default': the pre-selected best, never changed during this decision. 'picked': chosen by the player.
    // null: recorded before the app tracked this.
    choiceSource:z.enum(['default','picked']).nullable().default(null)
  })}),
  // Legacy (v2-foundation): entered after a choice, so `wave` does not say
  // which wave's end the total was read at. Read-only; new runs use aether_observed.
  EventBase.extend({type:z.literal('wave_observed'),payload:z.object({
    wave:z.number().int().min(1).max(20),
    totalAether:z.number().int().min(0).nullable(),
    eventCounts:EventCounts.optional()
  })}),
  // Cumulative Aether read at the end of `afterWave`.
  // A missing count is unknown; 0 is an observed zero.
  EventBase.extend({type:z.literal('aether_observed'),payload:z.object({
    afterWave:z.number().int().min(1).max(20),
    totalAether:z.number().int().min(0).nullable(),
    eventCounts:EventCounts.optional()
  })}),
  EventBase.extend({type:z.literal('run_finished'),payload:z.object({
    finalAether:z.number().int().min(0).nullable(),
    outcome:z.enum(['completed','abandoned'])
  })}),
  EventBase.extend({type:z.literal('correction'),payload:z.object({
    targetEventIds:z.array(z.string().uuid()).min(1),
    explanation:z.string().min(1).max(300)
  })}),
  EventBase.extend({type:z.literal('legacy_import'),payload:z.object({
    priorOffers:z.array(Identifier),
    warning:z.literal('choice sets and observations not recorded')
  })})
]);
export type RunEvent = z.infer<typeof EventSchema>;
export type RunEventType = RunEvent['type'];

export const RunRecordSchema = z.object({
  id:z.string().uuid(),createdAt:z.iso.datetime(),
  status:z.enum(['in_progress','completed','abandoned']).default('in_progress'),
  researchConsent:z.literal(false).default(false),
  events:z.array(EventSchema)
});
export type RunRecord = z.infer<typeof RunRecordSchema>;
export const LocalStateSchema = z.object({
  schemaVersion:z.literal(1),
  profiles:z.array(CharacterProfileSchema),
  activeProfileId:z.string().uuid().nullable(),
  activeRunId:z.string().uuid().nullable(),
  runs:z.array(RunRecordSchema)
});
export type LocalState = z.infer<typeof LocalStateSchema>;
export const EMPTY_STATE:LocalState={schemaVersion:1,profiles:[],activeProfileId:null,activeRunId:null,runs:[]};
