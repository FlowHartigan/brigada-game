# Game Design — BRIGADA FIGHT

## High concept

A fast, mobile-first 2D fighting game inspired by the readability and impact of arcade fighters while using only four primary actions:

- Attack
- Defense
- Dodge
- Special

The game runs in real time and targets short 45–75 second matches in mobile landscape orientation.

## Core loop

1. Open game.
2. Tap **FIGHT**.
3. Select one of five Brigade fighters.
4. Randomly select an opponent from the remaining four.
5. Show a short VS transition.
6. Fight.
7. Show victory/defeat.
8. Offer rematch or character select.

## Fighter roster

All stats are out of 100. Each fighter totals 300 stat points.

| Fighter | Strength | Vitality | Speed | Defense | Archetype |
| --- | ---: | ---: | ---: | ---: | --- |
| HARTZ | 76 | 72 | 84 | 68 | Fast all-rounder |
| PETOUX | 82 | 90 | 56 | 72 | Tank / pressure |
| NEXMOS | 88 | 78 | 64 | 70 | Power brawler |
| KAVALEUR | 74 | 66 | 94 | 66 | Rush / dodge |
| KORSAIR | 68 | 84 | 70 | 78 | Defense / counter |

### HARTZ — HIGH VOLTAGE

**Combat identity:** quick all-rounder with strong tempo changes.

**Known visual reference:** grey/black corduroy-style jacket, black t-shirt, silver chain. Game treatment may exaggerate metallic/electric effects but should preserve recognizable approved visual features.

**Special: DROP THE HARTZ**

- Short retreat / anticipation.
- Explosive return strike synced to a kick-like visual beat.
- Damage multiplier: 1.80× standard strike reference.
- Deals additional pressure to guard.

### PETOUX — LE MUR

**Combat identity:** durable pressure fighter.

**Known visual reference:** use only approved photographic reference; do not invent unsupported facial or body details.

**Special: MUR DE SON**

- Heavy charged strike.
- Brief armor window during startup.
- First light hit during armor does not interrupt the move.
- Damage multiplier: 1.65×.

### NEXMOS — REDLINE

**Combat identity:** high-damage brawler.

**Known visual reference:** beard, black tank top; red lighting is a useful character motif based on the approved reference image.

**Special: REDLINE COMBO**

- Three-hit burst.
- Total target damage: 1.95× standard strike reference.
- Strong punish tool after an opponent commits.

### KAVALEUR — CAVALCADE

**Combat identity:** fastest character, focused on dodges and recovery.

**Visual rule:** no unsupported physical likeness. Use an approved stylized silhouette until visual reference is available.

**Special: CAVALCADE**

- Very fast dash-like strike.
- Damage multiplier: 1.70×.
- Miss recovery around 0.7 seconds, making it punishable.

### KORSAIR — CONTRETEMPS

**Combat identity:** defensive counter specialist.

**Visual rule:** no unsupported physical likeness. Use an approved stylized silhouette until visual reference is available.

**Special: CONTRETEMPS**

- Brief counter stance.
- If struck during the counter window: 2.10× standard strike reference.
- If not triggered: a smaller fallback strike around 1.10× followed by vulnerable recovery.

## Combat rules

### Match

- Real time.
- Default timer: 60 seconds.
- Win immediately by reducing opponent HP to 0.
- If timer reaches 0, fighter with the higher HP percentage wins.
- Exact tie may trigger a short sudden-death extension later; MVP can resolve ties deterministically.

### Health

Conceptual baseline:

`maxHP = 700 + Vitality × 6`

Examples:

- PETOUX Vitality 90 → 1240 HP.
- KAVALEUR Vitality 66 → 1096 HP.

### Base attack power

Conceptual baseline:

`attackPower = 22 + Strength × 0.32`

Final damage is modified by defender Defense, move multiplier, state modifiers, and a very small RNG range.

### RNG

Target damage variance: roughly ±5%.

Randomness must remain small enough that player decisions dominate outcomes.

### Defense stat

Defense affects:

- incoming damage reduction
- guard durability
- resistance to interruption where appropriate

Damage reduction must be capped so defensive fighters never become invulnerable.

### Speed stat

Speed affects:

- attack startup
- recovery
- dodge invulnerability window
- tie-breaking / priority for near-simultaneous actions

Speed must not simply grant unlimited additional actions.

## Four actions

### Attack

Tap to initiate a three-step basic string:

- Attack 1: quick
- Attack 2: moderate
- Attack 3: strongest, longer recovery

The chain should use simple input timing rather than multiple attack buttons.

### Defense

Hold to block frontal attacks.

- Blocked hit receives roughly 35–40% of normal HP damage.
- Remaining pressure is translated into guard damage.
- Guard starts at 100.
- At 0 guard: **Guard Break**.
- Guard Break stun target: around 0.8 seconds.

Guard regenerates when not actively blocking / being pressured.

### Dodge

Tap to perform an automatic evasive step.

- Short invulnerability window.
- Has cooldown / recovery to prevent spam.
- A successful dodge creates a brief punish opportunity.

### Special

- Unique move per fighter.
- Cooldown target: roughly 7–8 seconds.
- UI communicates recharge clearly.
- Special must be strong but punishable or interactable; it must not be a free periodic damage button.

## Opponent AI

The MVP uses deterministic utility AI rather than a generative model.

At a short decision interval, the AI scores available actions based on:

- current HP percentage
- guard meter
- special cooldown
- opponent current state
- opponent recovery window
- recent player actions
- distance / combat state

The AI stores a small rolling history of roughly 5–8 player actions and identifies basic tendencies such as overly aggressive or overly defensive play.

Examples:

- repeated attacks increase Defense / Dodge utility
- repeated blocking increases pressure / attack utility
- whiffed player move increases punish utility
- player recovery plus ready special increases special utility

Difficulty should change reaction delay, prediction confidence, and weighting—not secretly alter fighter stats.

## Feel / feedback

Impact quality is critical.

Heavy hits may use:

- brief hit-stop
- device vibration when supported
- restrained screen shake
- impact flash
- particles / graphic shapes
- strong sound cue

Special attacks may briefly darken the arena, emphasize the move name, then return immediately to play.

## Main arena — La Salle de Retenue

Prototype arena: a classroom transformed into an underground rave.

Visual ingredients:

- blackboard
- chalk writing
- displaced school chairs
- speakers
- cables
- stickers / posters
- rave lighting
- subtle reactive background elements

Signature blackboard text:

**0 + 0 = TECHNO**

## Art direction — 2D Rave Comic

- Not pixel art.
- Not photorealistic.
- Illustrated and slightly caricatured fighters.
- Strong outlines.
- Hard-ish shadows.
- Light grain / poster texture.
- Dark anthracite base with off-white chalk elements.
- Accent lighting and effects per fighter.
- Underground techno / rave visual language.

## Required character animation states

Minimum target set:

- Idle
- Attack 1
- Attack 2
- Attack 3
- Defense
- Dodge
- Special
- Light hit
- Heavy hit
- Guard break
- Knockdown
- Get up
- Victory
- Defeat

The MVP may initially use procedural / placeholder presentation while the deterministic states are already implemented.

## Prototype scope exclusions

Do not include in the first prototype:

- multiplayer
- authentication
- progression systems
- campaign
- monetization
- many arenas
- backend save system
- LLM-driven opponent combat

## Prototype success criterion

The core question is:

> Is a roughly 60-second fight using only Attack / Defense / Dodge / Special genuinely fun and readable on a phone?
