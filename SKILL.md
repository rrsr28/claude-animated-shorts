---
name: cartoon-audio-short
description: Turn the user's voiceover audio plus its script into a finished vertical animated cartoon MP4 with music and SFX at half the voice level. Use when the user supplies a voiceover and script for a cartoon short or animated story video.
---

# Cartoon short: voiceover + script → finished MP4

The look: flat 2D bean-head cartoon characters (canvas-drawn "cards" with plum outlines) in a colourful 3D world with black ink outlines, painted textures, depth-of-field and gliding cameras. The output is 1080x1920, exactly as long as the voiceover (default 30 fps, see FPS). The user's voice is unchanged. The music bed and SFX are synthesized and sit at **50 % of the voice level**.

## Rules
- Stories, characters and shots are always original. Never recreate another creator's video shot for shot.
- No real, named living people as characters, and no brand mascots or logos.
- No captions unless the user asks. Diegetic text (a carved message, a sign) is fine, and it must read correctly (not mirrored).
- Never edit or re-time the voice. The picture is timed to it, and every visual reaction lands 0-3 frames before its word.
- **Audio levels:** music at 50 % of the voice level (−6 dB, gated RMS). SFX at 50 % or slightly less, peaks capped so no hit pokes out over the narration. Always mix with `mix.py`, never by hand. No ducking or compression; only one linear gain plus a peak limiter on the whole mix.
- Keep the user informed with a task list.

## Single stage: intake
This skill has ONE entry point. The user gives the **voiceover audio** and the **script text**.
- If either is missing, ask for it in one plain message and wait. Do not offer story ideas, do not write or rewrite a script, do not ask about length (the audio sets it).
- Use the script text for timing exactly as given. If it differs from what was recorded, ask for the final text.
- Then run the build below without stopping.

## FPS
Default 30. The user may ask for 60 (smoother camera moves; about double the render time and file size). Story timing is always in 30-fps frame numbers; the kit renders output frame n as story frame n*30/FPS (tested: fractional frames interpolate smoothly). Run `FPS=60 bash run_all.sh`. Blinks, idle bobs and impact shakes still step at 30 fps, which looks fine.

## The build (runs as soon as the voiceover and script are in hand)
Do everything from here without stopping. Ask only if the voiceover and script clearly do not match.

### 0 Get the kit
The kit ships INSIDE this skill folder at `kit/` (a complete working project: engine, generic camera/arm helpers `web/cam.js`, motion helpers, painters, three.js r160 vendored, cast, tools, and `example/` = the finished "Blind Men and the Elephant" inputs). Treat `kit/` as read-only: `cp -r <skill>/kit ~/shorts/<slug>` and work in the copy. Find the skill folder with `find / -name SKILL.md -path "*cartoon-audio-short*" 2>/dev/null`.
- **If `kit/` is missing from the skill folder**, the kit is in the GitHub repo `github.com/rrsr28/claude-animated-shorts` (folder `kit/`): clone it (github.com is reachable from the cloud workspace) and use that.
- **If the user keeps a shared kit on their computer** (e.g. `Documents/cartoon-shorts/kit/`), treat it as READ-ONLY, same as `kit/` above. Never edit it. For each video, work in a copy: the user runs `cp -r kit <slug>` once (or Claude gives them that command), then Claude writes the per-story files into `<slug>/`.
- **Keep for every story (never rewrite):** `web/index.html`, `web/motion.js`, `web/cam.js`, `web/paint.js`, `web/toonbase.js`, the engine sections of `web/main.js` (toon materials, ink pass, instanced grass, cards, post, `applyLight`, `drawActors`, `swapForNd`, `renderFrame`), and the tools (`render.mjs`, `render_local.mjs`, `run_all.sh`, `rerender.sh`, `audit.mjs`, `sheet.py`, `timing.py`, `mix.py`, `finish.sh`).
- **Replace per story:** `web/story.js` (shots, cameras, actors, effects; use `example/` or the old `web/story.js` as the pattern), the world section in `web/main.js` + `web/world_new.js`, outfits/props in `web/roman.js`, the cue table in `audio.py`, `title.txt`, and the inputs `voice.mp3` + `script.txt`.
- Requirements in the cloud workspace: Node 22+, Python 3 with numpy + Pillow, ffmpeg, Playwright with Chromium (pre-installed). Never disable TLS or route around the proxy.

### Rendering is done by the USER on their Mac (default, always)
Never run the full render yourself and do not spend tokens or time on it. Your job is everything up to the render:
1. Build the story files in the project folder.
2. Check quality with `node audit.mjs` and the self-review below. Do not render or view image frames.
3. Deliver the project, then give the user ONLY the commands to run.
**Where files go:**
- If the session is linked to the user's computer (mcp__remote-devices tools present and a call succeeds): use `~/Downloads/cartoon-shorts/` (use it if it exists, create it if not), put the project in `~/Downloads/cartoon-shorts/<slug>/` (copy `kit/` there), write the new files into it, and tell the user in plain words where it is.
- If the user has a filesystem MCP (check `list_allowed_directories`; work only inside the directories it lists): write the per-story files into `<allowed dir>/cartoon-shorts/<slug>/` (`story.js`, `audio.py`, `script.txt`, `title.txt`, `PROGRESS.md`, and any other file the MCP can write). **If a file cannot be written through the MCP (binary, too large, or the write fails), do not stall: output the project as a zip and give the unzip/run commands below.**
- If not linked (the free plan cannot link): zip the project and send it with SendUserFile, then give the unzip/copy commands below.
**Commands to give the user (plain words, nothing else):**
```
cd ~/Downloads
unzip -o <project>.zip            # skip if the files were written into the folder already
cd cartoon-shorts/<slug>          # or the unzipped folder
cp ~/Downloads/<voiceover>.mp3 voice.mp3      # skip if already there
bash run_all.sh test              # 8 sample frames first (~1 min); look at stills/contact_sheet.jpg
bash run_all.sh                   # full render (a 70 s video took under a minute on an M4 Max)
```
Options: `FPS=60 bash run_all.sh` for 60 fps. `bash rerender.sh FIRST LAST` redoes a frame range (frame = seconds x 30). `run_all.sh` asks before installing anything and resumes if interrupted. When the user reports a problem, ask for the timestamp, fix the story files, resend only the changed files, and give the `rerender.sh` command for that range.

### 1 Timing
Run `python3 timing.py voice.mp3 script.txt --out work`.
- With whisper or faster-whisper installed, it uses word timestamps.
- Otherwise it aligns script phrases (split at punctuation) to silence-detected speech segments, with a DP that matches syllables to duration and penalises sentence ends inside a segment and long gaps inside a phrase.
- With no ASR and no script, ask for the script. Claude cannot hear audio.
- Check `work/phrases.json`: pauses should fall at sentence ends. Total frames = round(duration × 30).

### 2 Shot plan (`work/PLAN.md` before code)
Make one row per shot: frames, words, setting, light, camera move, characters/poses/expressions, effects and SFX cue.
- Frame 0 is already the hook image.
- Usually one shot per phrase. Merge tiny phrases into the next shot.
- Illustrate every sentence literally. Props carry the jokes.
- Vary shot sizes: hook MCU → wide reveal → two-shot → insert close-up on the key object → reaction close-up → environment move for the payoff.
- Use light for beats: day for normal, golden for decline or drama, night-blue for explanation. A time jump gets a 6-frame white flash.
- The twist line gets a sting (music stops, low hit, push-in with roll). The last shot's physical payoff lands on the final word.

### 3 World (`web/main.js`)
Keep the engine sections: toon materials, ink contract, `add`/`tbox`, sky, lights, cards, render targets/post, `applyLight`, `drawActors`, `swapForNd`, `renderFrame`. Replace the example world between `// ---------- world ----------` and `// ---------- cards ----------`, plus the story parts of `worldState()`.
- Build from primitives with painted canvas textures (`paint.js`: planks, beams, rotten wood, stone, moss/ivy, grass, dirt, plaster, roof tiles, marble, banners, carved text). Write new painters in the same flat-with-dark-seams style.
- Use `tbox` for constant texel density, a 2-step toon gradient, and fog = horizon colour.
- Background: hills (half-buried spheres), mountains (cones + snow caps), cypress/pine trees, distant houses, painted cloud billboards.
- Set pieces (collapses, falls, doors) are pivoted groups driven by 0..1 progress from `worldAt(f)`, with eased and staggered parts.
- Curved diegetic text uses planar UVs. Check it isn't mirrored.

### 4 Cast (`web/roman.js` → `web/toon.js`)
- `romanFront(p, outfitKey, opts)` draws on a 600x1000 design canvas with soles at y=975. The card is 2.25 m tall, so 1 unit = 0.00225 m.
- Add outfits to `OUTFITS` (tunic/cape/armor/helmet/hair/cap/beard/apron/dress/toga) and new headgear and props in the same style.
- Arm poses: hang, spear, point, up, wave, hip, belly, temple (+swirl), lift, reach (+lift), cheek, shield, cross, thumb.
- Expressions: the toon.ts FACE set plus snore, stubborn, squint. Extend FACE for more.
- Rebuild after edits with `cat web/toonbase.js web/roman.js > web/toon.js`. Render a character test sheet before using new designs.
- Billboards turn on yaw only, get a contact blob and an alpha-tested shadow, and are never inked by the world pass.
- Build card keys from `q()`-rounded values (so the canvas redraws only on visible change).
- A detached part (e.g. a lifted helmet) is its own card, aligned with `headCenter(seed)`: y = DECK + (partY − hc) × 0.00225.

### 5 Motion: smooth and alive (`web/motion.js`)
- **Cameras**: `camFromKeys(keys, f, {kicks})`. Use smootherstep glides (18-45 f), `easeOut` for reveals and whips, and `path` via-points (Catmull-Rom) for curved moves. Every hold creeps and nothing is static for 4+ frames. Use 3-5° rolls on drama and 7-frame flip-shakes on impacts.
- **Continuity**: prefer continuous moves (pull back from a close-up into the wide, rack focus, crane through the deck, push into an object). Hard cut only on place or time jumps, with a flash.
- **Characters never freeze**: apply `idle(f, seed)` to every card, `blinkAt` blinks, and head bobs on stressed words.
- **Actions**: anticipation → `back` overshoot → `spring` settle. A stamp is a 2-frame dip + dust puff + kick. Laughs are an alternating tilt + bob.
- **Secondary motion**: banner cloth waves, leaves/dust/drips/Zzz effect cards, flowing water. Something always moves.
- **Walks**: `walk()` gives distance + step phase. Feet planted, bob 3-7 %.
- **Lens**: DOF on close-ups and mediums (cInf 8-14 px), focus on the eyes. Wides are sharp. Racks take ~14 f.

### 6 Look check (before the full render, by reading the code and the audit; no image review)
Check the story against these traps:
- **Narrow vertical frame**: horizontal half-width = d·tan(hfov/2), with hfov = 2·atan(tan(vfov/2)·0.5625). At 4 m and fov 40 that is ±0.8 m, so stage characters in depth.
- Railings or posts across faces (camera inside the rail or ~2.5 m up). The camera path through houses, roofs or bushes. Foreground props under ~2 m away. The hero hidden behind a pillar.
- Mirrored text. A detached-part card offset the wrong way.
- Extrude material groups: 0 = caps, 1 = sides+top.
- Missing ink: debug the edge-only output. Ink radius ~2.5 px at 1080. The sky counts as far depth, not a card.

### 7 Sound (`audio.py` → stems → `mix.py`)
Rewrite the cue table for the story; the synths stay. `audio.py` writes only stems (`music.wav`, `sfx.wav`).
- Music: a short march-like loop (kick/snare, plucked bass, brass pad). It stops at the twist line, then a low drone continues.
- SFX on events (in frames/30): whooshes on big moves, thunk on stamps, rumble+crash on collapses, scrape on metal, ting on reveals, sting on the twist, creaks, snap, splash, snore, leaves, water ambience.
- Mix with `python3 mix.py voice.mp3 music.wav sfx.wav`. It sets music to exactly 50 % of the voice's gated RMS (−6 dB) and SFX to 50 % with peaks capped at 0.7× the voice peak. It prints the measured levels: confirm music shows −6.0 dB vs voice and SFX is at or below that.
- Lock picture timing before making sound. Any timing change means re-running audio.py and mix.py.

### 8 Hand-off (the user renders)
- **Keep the final message SHORT**: one line saying the files are ready and where, then only the commands. No recap of the work, no feature list.
- Do NOT render the full video or run `finish.sh` yourself. Make sure `title.txt`, `voice.mp3`, `script.txt`, `audio.py` and `story.js` (with correct `TOTAL` = round(duration x 30)) are in the project, run `node audit.mjs`, then follow "Rendering is done by the USER" above.
- `run_all.sh` builds the audio (`audio.py` + `mix.py`: levels −6 dB gated RMS music, SFX capped), renders, and `finish.sh` applies one linear gain to about −14 LUFS with a −1 dBFS limiter, encodes H.264 CRF 17 + AAC, and runs freeze/black and loudness QA. Ask the user to send `out/qa_sheet.jpg` or timestamps if something looks wrong.
- When the user returns with the finished video and notes, fix and resend only changed files.

## Quality playbook (learned from the user's feedback and a reference-video study; apply to EVERY video)
The reference ("How One Cart Stopped an Entire Army") measured at 66.8 s, 30 fps, 9:16, with optical flow on every frame:
- **Almost no cuts**: about 6 in 67 s. One camera keeps moving through one set. Our first cut had 16 % near-still frames; the reference has 2 %. Mean image motion 0.62 px/frame vs our 0.23.
- Moves arrive in 2-3 s bursts (pan + push + roll together, up to ~3 px/frame) then calm holds of 1-3 s that still drift. Camera is LOW and CLOSE, slightly looking up, so grass/props fill the foreground. Macro inserts on the key prop fill the frame for 2-4 s.
- World is dense: instanced grass blades, textured brick/stone, big painted skies, DOF, light that changes with the story (day → dusk → night with lanterns; warm shafts at beats).
- Characters stay simple but faces are very expressive; crowds have varied headgear/faces; PROPS carry the action.
Rules that follow:
1. **Cameras: use `solveCam` + `handheld`** from `cam.js`. Each key says what must be in frame (boxes `B(x,z,halfwidth,y0,y1)`) and how to move (az/k/h/fov/ly/roll); the solver finds the distance so nobody leaves the 86 % safe area. Blend parameters between keys for real orbit arcs. `handheld(c, f)` adds position drift, roll and FOV breathing; call it on every camera. Aim for mean motion ≥ 0.5 px/frame and < 5 % near-still frames; measure it (optical flow on the rendered video) and compare with the numbers above.
2. **Run `node audit.mjs`** after every camera or staging change: it projects every character box through the camera on every frame and reports anyone partly out of frame, plus the longest arm reach. Fix before rendering.
3. **Cards must be wide enough**: design space 1000x1000 (canvas 2000x2000) on a 2.25 m plane, character centred with a +200 px translate, so outstretched hands are never clipped.
4. **Touching a 3D object**: draw the touching character's card with `overlay: true, order: 3` (depthTest off) so the elephant/prop never swallows the hand; compute the hand with `handPx` (ray through the touch point onto the card plane: correct at any camera angle) and `clampReach` (arms never longer than ~300 px). Keep touch points at reachable heights (chest/shoulder, ~1.0-1.6 m), stand 0.5-0.6 m from the surface, and space a walking line ≥0.95 m.
5. **Wide shots**: tight the group, fov ~50, low camera. In a narrow vertical frame empty ground makes people tiny; keep subjects large.
6. **Every frame busy**: grass, dust, leaves, banners, light shafts; vary shot size (wide → medium → macro insert → reaction); give each beat a different light/colour mood; add a dusk/night arc when the story allows.
7. **Distinct crowd**: different headgear, hair, colours, expressions per character.

## Known limits (be honest with the user)
The reference uses realistic PBR lighting under cartoon cards; our toon/ink renderer is flatter. Gaps still open: textured brick/stone painters, light shafts, volumetric dusk/night grading, richer faces, macro prop inserts, rigged (not blocky) animals. Work through them in that order when the user wants more quality.

## Engine gotchas (kept in the kit; keep them if rebuilding)
- `#include <fog_vertex>` / `<fog_fragment>` go on their own lines.
- The final pass writes `linearToOutputTexel(...)` (render targets are linear HalfFloat).
- The normal+depth pass swaps materials per mesh: world → normal/depth, cards → alpha-tested mask (rgb 0, a = depth), blobs/clouds/sky hidden, water → flat normal. Fog and shadows are off during it.
- Ink goes on the near side of depth jumps only. Creases come from the normal dot. Card neighbours are skipped. Ink fades at ~140-520 m.
- DOF: 48 taps with a per-sample CoC test (no foreground bleed).
- The sun comes from az/el per light preset. The shadow camera is centred on each shot's action.

## Architecture (reference for editing the kit)
- `web/index.html` loads `main.js` (ES module) over a local HTTP server.
- `main.js`: renderer, toon materials, world, cards (1200x2000 CanvasTexture planes, origin at soles), passes colour (RT samples 4) → normal/depth → ink+grade (saturation, gain/lift, vignette, flash) → DOF to screen. It exposes `window.renderFrame(f)` and `window.ready`.
- `story.js` exports SHOTS, `shotAt`, `camAt`, `dofAt`, LIGHTS/`lightFor`, `worldAt`, `actorsAt(f, T)`, `fxAt(f, T)`. All are pure functions of the frame.
- `render.mjs`: Playwright → `renderFrame(f)` → `toDataURL('image/jpeg', .95)` → `frames/f0000.jpg`.
- `mix.py`: gated-RMS level lock (music and SFX at 50 % of the voice). `finish.sh`: linear loudness gain, limiter, encode, QA.
- Characters: the Pen API from rrsr28/claude-animated-shorts `templates/bridge/toon.ts`, extended in the same module scope by the cast file.
## Richness by default (do this on every video, without being asked)
Never leave a scene plain. Before writing `story.js`, read the script and list every setting, object, animal, action, emotion and time of day it names (the "story inventory"). Then:
- **World:** every setting in the inventory gets its own set pieces and props that belong to it (market stalls, a palace with domes and a couch, banners, pots, trees, carts, lanterns...), not just the generic ground and sky. Put props in the foreground and background of every shot. Hills, mountains, trees, houses, painted clouds, grass, dust, leaves and drifting petals in all outdoor shots.
- **Characters:** every character gets a distinct outfit, headgear, colour and personality. Crowds are all different. Faces are very expressive and change with every beat; hands and bodies act out the words (pointing, flexing, hugging, shrugging), never standing still.
- **Props carry the story:** each sentence has something visible that illustrates it literally (an icon bubble, a set piece, a gag), plus an effect or SFX on the key word.
- **Light and mood:** each act gets its own lighting; add a golden hour, dusk or night arc where the story allows, and warm light on the emotional payoff.
- **Camera:** vary shot size (wide, medium, macro insert, reaction), keep the camera low and close with foreground props, use short pans, pushes and rolls, and a calm drifting hold between them.
- **Budget:** if the free limit looks tight, keep this order and drop from the bottom: (1) every sentence illustrated, (2) distinct characters and expressions, (3) set pieces per setting, (4) light arc, (5) extra ambient detail. Record in `PROGRESS.md` what was left out and offer to add it later.

## Progress file and resuming (the user is on a free plan: the usage limit can run out mid-build)
- Keep `PROGRESS.md` in the video folder (project root). Create it right after timing and update it at every milestone: timing, story, audio, self-review, delivery. Each entry says what is DONE, what is NEXT, any known issues, and the exact command(s) to run.
- Write it to the user's folder through the MCP when one is available, and include it in the zip otherwise.
- When the user says "continue where you left off" (or similar): first read `PROGRESS.md`, `SHOT_LIST.md` and `LEARNINGS.md` in the video folder (ask for the folder path or the zip if you cannot find them), then resume at the first NEXT item. Never redo finished work.
- Do not wait until the end to save progress: if the limit may run out, write `PROGRESS.md` before starting a long step.

## Self-review without rendering (do this before delivering)
Do not render frames to check quality (it is slow and uses the free limit). Instead:
1. Run `node audit.mjs`. It projects every character through the camera on every frame with no rendering. Ignore flags that are intentional (close-ups that leave other characters out of frame); fix the rest.
2. Read the finished `story.js` like a reviewer and judge it as a viewer would: does each shot's camera frame its main subject (solver boxes use the real positions, including walk-ins and bubbles)? Does anyone get blocked by a character in front? Does every spoken beat have a visual landing 0-3 frames early? Are frame ranges contiguous and equal to TOTAL? Do icons, bubbles and effects match what the voice says at that moment?
3. Fix problems found, re-run the audit, at most two rounds. Note anything left in `PROGRESS.md`.

## Learning loop (this is the skill's memory; Claude does not remember between chats)
- `kit/LEARNINGS.md` (or `LEARNINGS.md` in the user's `cartoon-shorts` folder if they keep one shared) is the running log of what went wrong, what the user liked, and what fixed it. READ it at the start of every video and apply it.
- After every feedback round (user timestamps, complaints, praise, new reference videos), append 1-3 lines to `kit/LEARNINGS.md` (date, problem → cause → rule), update the Quality playbook if the rule is general, and send the user the updated `SKILL.md` + `kit/LEARNINGS.md` (or the whole zip) so they can re-install it. Tell them in one line to replace the old copy.
- Reference videos: analyse frames and optical-flow numbers, write the measured findings to LEARNINGS.md, and encode them as presets in `cam.js`/story patterns. Copy style, never content.
