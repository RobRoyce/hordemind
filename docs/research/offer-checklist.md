# Season 15 offer checklist

The offer list now comes from the game's own text: [d4data](https://github.com/DiabloTools/d4data/tree/76b722a340d22001171b4cfb0fc39e8efa761654/json/enUS_Text/meta/StringList), build 3.2.3.73883, commit `76b722a`. Those client files also contain offers that are no longer in rotation, and they don't say how often anything happens.

Fill this in as you play. **y** means you've seen the offer this season, **n** that you're confident it isn't in the pool. Leave a row blank when unsure.

## Offers

| Offer | Category | Seen in S15? |
|---|---|---|
| The Anchored Masses | Masses | |
| The Blighted Verge | Masses | |
| The Bursting Masses | Masses | |
| The Desolate Verge | Masses | |
| The Fiendish Masses | Masses | |
| The Gorging Mass | Masses | |
| The Hellish Masses | Masses | |
| The Massing Masses | Masses | |
| The Precious Mass | Masses | |
| The Puffing Masses | Masses | |
| The Teeming Masses | Masses | |
| The Blighted Spires | Spires | |
| The Coveted Spires | Spires | |
| The Draining Spires | Spires | |
| The Fiendish Spires | Spires | |
| The Hungry Spires | Spires | |
| The Insatiable Spires | Spires | |
| The Precious Spires | Spires | |
| The Rising Spires | Spires | |
| The Treasured Spires | Spires | |
| The Ambushing Hellborne | Hellborne | |
| The Exalted Hellborne | Hellborne | |
| The Meteoric Hellborne | Hellborne | |
| The Summoned Hellborne (hunting you) | Hellborne | |
| The Summoned Hellborne (spawn with events) | Hellborne | |
| The Surging Hellborne | Hellborne | |
| The Colossal Fiends | Fiends | |
| The Exalted Fiends | Fiends | |
| The Fiendish Legions | Fiends | |
| The Enduring Lords | Lords | |
| The Ruthless Lords | Lords | |
| The Summoned Lords | Lords | |
| The Aether Goblins | Monsters | |
| The Exalted Hordes | Monsters | |
| The Surging Elite | Monsters | |
| The Unstoppable Elite | Monsters | |
| The Burning Rain | Hellfire | |
| The Wrath of Hell | Hellfire | |
| The Aether Rush | Player boon | |
| The Invigorating Hellborne | Player boon | |
| The Wanderer Enfeebled | Player bane | |
| The Wanderer Exhausted | Player bane | |
| The Wanderer Withered | Player bane | |
| The Exalted Council | Council | |
| The Stalking Devil | Special boss | |
| The Chaotic Offering | Chaos | |

## Quick checks

These change the model. Answer only the ones you notice.

1. **Do Aether Lords ever appear without The Summoned Lords** (or The Colossal Fiends)? The model now assumes they don't, because Summoned Lords reads "Aether Lords now spawn".
2. **The Fiendish Masses** reads "Masses spawn an Aether Fiend on death". Is that every Mass?
3. **The Colossal Fiends:** roughly how much Aether does one of its Lords drop? The model assumes 15 (3× a Lord's 5).
4. **Hellborne:** do they arrive in groups of three, worth about 2 Aether each? This comes from a guide.
5. **The Chaotic Offering:** which Chaos Wave did you get, and how much Aether did it give? Even a few of these replace the placeholder numbers.
