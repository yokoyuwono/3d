# Dari Peternakan ke Piring — treatment

Style: Isometric Infographic (`iso-infographic`). Format: vertical 1080×1920 (short-form), 24 fps.
Language: Indonesian (voice + burned-in subtitles). Voice: Gemini 3.8 Flash TTS, voice "Sulafat", brisk.
Length: set by the narration (≈ 1:45–2:00). Brand on screen: fictional "Sosis Pagi Ceria".

## 1. Three candidate structures

1. **A single route across one wide board.** Farm on the left, factory in the middle, shops on the right; the camera follows a truck and then a sausage left → right. Clear, but a horizontal journey wastes a vertical frame: every station sits in a thin band.
2. **A cycle on a round board.** Plate → farm → factory → shop → plate around a ring; one lap. Elegant echo, but a ring in 9:16 leaves dead corners and the factory steps (the core of the topic) get squeezed into one arc.
3. **A tower, floor by floor (chosen).** The vertical frame *is* the structure: the farm board floats at the top, the factory is a tall cut-away tower below it, cold storage and the trucks are in its basement, and the city of shops spreads at the bottom. The camera tilts **down** the whole film, like the meat moving through gravity: receive → grind → mix → fill → cook → cool → pack → freeze → ship. It ends with a fast pull-out showing the entire tall infographic at once, then lands on the breakfast plate where it began.

**Why 3:** short-form viewers scroll vertically; a film that also moves top-to-bottom feels native to the phone. Each floor is one step, so each narration line has its own clean "room". The final pull-out gives a finished infographic poster in 9:16.

Opening: **one icon** — a single fried sausage on a plate, in close-up, with the question as an isometric title. Ending: **scale reveal → back to the same plate** (bookend), last line over the legend card.

## 2. Logline and arc

A sausage on a breakfast plate rewinds its own journey: from farm, through a factory floor by floor, out to the shops and back to the plate — every step guarded, so it is safe, halal and tasty.

- Setup (0–8 s): the plate, the question.
- Journey (8 s – ~1:35): farm → gate check → factory floors → storage → distribution, accelerating.
- Turn: the "Lolos / Gagal" gate (a beat of judgement), then the filling machine (the fun peak).
- Ending (~1:35 – end): pull-out to the whole tower-infographic, then back to the plate; three stamps: AMAN · HALAL · LEZAT.

## 3. Benchmark

- *Kurzgesagt*-style explainers (grammar: a question up front, one clear visual metaphor per step, a scale change when needed). Learn: steady forward push, numbers made visual, fast pacing with no dead air. Don't take: characters, palette, birds, music.
- *SimCity 2000*-style cutaway buildings (grammar: whole system visible, floors as layers). Learn: section rims, legible floors. Don't take: any building or UI.
- Not the demo (coffee chain, horizontal route): ours is vertical, a tower, a tilt-down, and a bookend at the plate.

## 4. Shot list (one continuous world, tilt-down grammar)

| # | Section | Framing / move | Why |
|---|---|---|---|
| 1 | Plate | Close insert on one sausage icon; question title types in; fast log pull-out reveals the table is a tiny prop at the bottom of a pale board | Hook in 2 s; "one icon" opening |
| 2 | Farm | Cut-in via route line up to the floating farm board at the top; hold wide; cows/chickens bounce; halal slaughterhouse pin; vet inset (circular frame-within-frame) | System + individual |
| 3 | Truck | Follow the refrigerated truck down a route line; thermometer pin "< 4 °C"; side items (tapioka, garlic, pepper, salt, casing) arrive as Isotype crates | Process = follow along a route |
| 4 | Gate | Locked frame on the gate; QC officer; four check icons pop (suhu, warna, bau, berat); green ✓ → in; one crate red ✗ → reverses out | Turn / judgement; silence before ✓ |
| 5 | Tower cutaway | Cut line draws, the tower's front skin slides away, hatched rims; tilt down floor by floor | Native move: cutaway; strata tilt |
| 6 | Grinder | Floor 1; meat blocks into grinder, comes out as pink mince; snowflake pin "DINGIN" | One step per floor |
| 7 | Mixer | Floor 2; ingredients drop in, mixer spins, colour shifts to smooth paste; Isotype: identical sausages fill a grid "SELALU sama" | Isotype number |
| 8 | Filler | Floor 3; paste pushed into casing, twister snaps links; links accelerate across the floor (quarter → eighth notes) | Fun peak; accumulation = acceleration |
| 9 | Oven | Floor 4; links hang on racks into the steam oven; gauge counts up to 72 °C; smoke puffs for "diasap" | Colour change raw → cooked |
| 10 | Cooling | Floor 5; cold shower, blue tint, "terkunci" lock pin | Breath (short) |
| 11 | Packing | Floor 6; cut, weigh, vacuum pack, label with stamps; metal detector arch; boxes stack on pallets | Rhythm section |
| 12 | Storage + trucks | Basement freezer; trucks leave on routes that fan out to the city board below (distributor, supermarket, minimarket, warung, restoran, online) | Lateral fan-out |
| 13 | Shop → plate | Mother buys at a shop; follow the pack home; pan settles on the plate | Return |
| 14 | Scale reveal | Fast log pull-out: the entire vertical chain visible with all labels; legend card "AMAN · HALAL · LEZAT" | Signature shot |

## 5. Beat sheet

Locked to the narration WAVs once they exist (`timeline.js` computes section starts from the measured line lengths + 0.35 s gaps; each section starts ~0.3 s before its line, J-cut style).

## 6. Cue map

- Tempo 112 bpm (≈ 0.536 s per beat), 4/4.
- Intro (plate): marimba motif alone, 2 bars.
- Farm → truck: add shaker + pizzicato bass, light woodblock on the 2 and 4.
- Gate: music drops to a near-silence (one held marimba note) for ~0.8 s; ✓ ding lands on the downbeat.
- Factory floors: full groove (marimba, kalimba ostinato, bass, cajón-like kick, shaker); each floor change on a bar line with a glockenspiel tick.
- Filler: hi-hat moves from quarters to eighths; the link "snaps" are on eighths.
- Cooling: filter closes for one bar (breath).
- Packing/distribution: groove back, fuller; fan-out of trucks on a rising bass walk.
- Ending: groove stops; one note per stamp (AMAN / HALAL / LEZAT), final chord.

## 7. Sound design

| Section | Ambience | Foley | Music |
|---|---|---|---|
| Plate | kitchen room tone | sizzle tick, ceramic plink | motif solo |
| Farm | wind + birds | moo-ish low thump (abstract), cluck clicks, gate creak | light groove |
| Truck | road hum | engine purr, crate thuds | groove |
| Gate | factory exterior | scanner beeps, ding (✓), buzzer (✗) | near-silence → hit |
| Grinder | machine room | grinding whirr, wet squish | full groove |
| Mixer | machine room | paddle swish, ice clinks | groove + Isotype pops |
| Filler | machine room | pneumatic push, snap per link | eighth-note hats |
| Oven | steam hiss | gauge ticks, smoke puffs | groove, warmer |
| Cooling | water spray | splash, cold "shimmer" | filtered |
| Packing | conveyor hum | vacuum suck, label stamp, detector beep, box thud | groove |
| Distribution | city hum | truck horns (soft), whooshes | rising bass |
| Ending | kitchen room tone | stamp thumps, plink | one note per stamp, final chord |

## 8. Subtitle and title design

- Subtitle = map label card at the bottom-centre (pale card, ink border, tiny iso-cube chip), Jost 600, ~46 px on 1080 width, max 2 lines, border draws first then text wipes in. Bottom ~300 px kept clear in every shot.
- Station labels: Jost 600 all caps, 0.12 em tracking, with pins (dot → leader → rule → text), Indonesian.
- Numbers: Jost 400 large ("4 °C", "72 °C").
- End legend card: "DARI PETERNAKAN KE PIRING" + Isotype key + "AMAN · HALAL · LEZAT" + "TIDAK SESUAI SKALA".
