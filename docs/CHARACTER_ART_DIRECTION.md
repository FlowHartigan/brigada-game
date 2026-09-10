# Character Art Direction — LA BRIGADE: 0+0=FIGHT

## 1. Approved production direction

The production character style is now:

# BRIGADA // PIXEL RAVE FIGHTERS

The goal is **not** faithful facial reproduction. The goal is that every member of La Brigade is immediately recognizable in pixel art through a combination of:

1. silhouette
2. hair / beard / headwear
3. clothing block
4. one or two signature accessories
5. fighting stance
6. signature VFX

Faces may be simplified aggressively. Recognition must survive at mobile combat scale.

## 2. Pixel-art target

Use modern arcade pixel art rather than ultra-low-resolution retro sprites.

Recommended production target:
- native fighter height: roughly 96–128 px
- runtime scale: integer 3x or 4x where possible
- nearest-neighbor rendering only
- no smoothing or soft interpolation
- crisp silhouettes and deliberate pixel clusters
- 3–5 value groups per material
- limited palette per character
- exaggerated readable hands, forearms, hair masses, glasses, hats and clothing shapes

Avoid:
- photorealistic faces
- plastic 3D renders converted to pixels
- AI-smoothed faux pixel art
- tiny noisy details
- generic anime sprites
- chibi proportions
- characters distinguishable only by different colors

## 3. Brigade visual DNA

The game must remain visually tied to the existing La Brigade project.

Shared world language:
- black / charcoal backgrounds
- white / off-white typography
- strong red editorial accents
- blackboard / chalk marks
- graffiti / handwritten annotations
- red school chair and detention-room motifs
- **0 + 0 = TECHNO** signature
- rough flyers, stickers, concrete and poster textures
- underground techno / rave atmosphere

Character sprites stay cleaner than backgrounds so they remain readable.

## 4. Recognition rule

At combat scale, each fighter should remain identifiable even when facial detail is removed.

Priority order:
1. silhouette
2. head / hair / beard / hat shape
3. dominant clothing color/block
4. stance
5. accessory
6. signature VFX
7. face pixels

If two characters are confused in black silhouette, redesign before animation production.

## 5. Fighter signatures

### HARTZ — HIGH VOLTAGE

Known cues:
- grey / black ribbed jacket
- black T-shirt
- silver chain

Pixel signature:
- slim, alert silhouette
- open ribbed jacket creating a strong diagonal torso break
- short silver chain rendered as a bright pixel cluster
- slightly forward stance
- angular attack poses

Palette:
- graphite
- charcoal
- dirty white
- silver
- cold electric blue-white accent

VFX:
- thin waveform traces
- short white-blue pixel breaks
- no superhero lightning bolts

### PETOUX — LE MUR

Recognition strategy:
- use approved Brigade reference for broad visual identity
- distinguish through planted stance and stable clothing mass
- do not invent a larger body purely because the gameplay archetype is a tank

Pixel signature:
- square planted stance
- forearms visibly forming defensive blocks
- widest grounded silhouette through posture
- very small idle movement

Palette:
- black
- warm charcoal
- concrete beige / muted sand
- amber accent

VFX:
- speaker-pressure rings rendered as pixel arcs
- chalk/dust bursts on blocks

### NEXMOS — REDLINE

Known cues:
- beard
- black tank top
- arms visible
- strong red association from approved reference

Pixel signature:
- highly readable beard block
- exposed arms
- black tank top as the dominant clothing shape
- compact, aggressive stance
- heavy torso rotation on attacks

Palette:
- black
- skin neutrals
- dark red
- bright emergency-red accent

VFX:
- red limiter bars
- short horizontal clipping lines
- 3-step red hit markers during special

### KAVALEUR — CAVALCADE

Approved distinguishing cues from product owner:
- sunglasses
- small beard
- dressed in pink

Pixel signature:
- sunglasses must remain readable even at combat size as a dark horizontal eye band
- small beard rendered as a compact darker chin/jaw cluster
- strong pink clothing block; pink is the primary recognition color
- narrow, forward-moving stance
- long diagonals and fast lean

Palette:
- saturated / dusty pink clothing
- black sunglasses
- smoke grey shadows
- deep violet secondary accent
- cold white highlights

VFX:
- duplicated 1–2 frame silhouettes
- hard sliced motion trails
- print-registration offsets rather than blur

### KORSAIR — CONTRETEMPS

Approved distinguishing cues from product owner:
- pirate hat
- bandana
- light brown hair

Pixel signature:
- pirate hat is the dominant silhouette feature and must remain recognizable from a distance
- bandana visible as a strong secondary head/neck color block
- light-brown hair cluster visible beneath / around the hat
- calm, closed guard stance
- much less idle motion than the rest of the roster

Important art rule:
- the pirate language should stay stylized and contemporary, not become a fantasy pirate costume
- use the hat/bandana as iconic props over modern dark Brigade clothing

Palette:
- black / petrol charcoal
- light brown hair
- muted teal / oxidized green accent
- off-white
- restrained red or burgundy bandana if it reads well with the Brigade palette

VFX:
- timing arcs
- metronome-like snap lines
- brief freeze-frame accent for counters

## 6. Character select portraits

Portraits can use a larger pixel canvas than combat sprites.

Target:
- pixel-art bust / 3-quarter portrait
- stronger facial recognition than combat sprites
- same palette and silhouette language as gameplay sprite
- rough rave-poster framing
- name typography and stat bars remain crisp UI, not baked into the portrait

The combat sprite and select portrait must obviously represent the same character.

## 7. Animation target

Prototype per fighter:
- idle: 6–8 frames
- attack 1: 5–7 frames
- attack 2: 5–7 frames
- attack 3: 6–8 frames
- defense enter / hold / release: 3 + hold + 2
- dodge: 6–8 frames
- hit light: 3–4 frames
- hit heavy: 4–5 frames
- guard break: 5–7 frames
- special: 10–16 frames
- KO: 8–12 frames
- victory: 6–10 frames

Frame count is secondary to strong key poses and readable timing.

## 8. Production rules for Phaser

- source sprites should be transparent PNG or lossless WebP during production
- runtime textures may be optimized later
- set rendering to nearest-neighbor / pixelated
- never scale sprites with smoothing
- prefer integer scaling where possible
- animation state comes from the deterministic combat engine
- Phaser only presents state; it does not own combat rules

## 9. Approval workflow

### Gate A — roster silhouettes
Create all five as simple pixel-art silhouettes / flat-color recognition studies first.

The product owner must be able to identify:
- HARTZ
- PETOUX
- NEXMOS
- KAVALEUR
- KORSAIR

without reading the names.

### Gate B — one complete test fighter
Use HARTZ as the first fully rendered fighter:
- select portrait
- combat idle
- attack pose
- defense pose
- dodge pose
- special pose

### Gate C — mobile-scale review
Integrate HARTZ into Phaser and inspect at actual phone landscape scale.

### Gate D — roster production
Only after the style passes the in-game test, produce the full five-character set.

## 10. Agent workflow

1. Character Art Director proposes 3 pixel-art treatments within this direction.
2. Product owner selects one.
3. Art Director creates a 5-character recognition sheet.
4. Product owner validates that every member reads correctly.
5. Art Director finishes HARTZ.
6. Phaser agent integrates HARTZ.
7. QA captures and tests at mobile landscape size.
8. Art Director adjusts sprite scale / palette / silhouette if necessary.
9. Apply the approved system to PETOUX, NEXMOS, KAVALEUR and KORSAIR.
