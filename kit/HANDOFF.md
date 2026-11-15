# HANDOFF: read this first in any new chat

Project: vertical (1080x1920, 30 fps) animated short, "The Blind Men and the Elephant", narrated by the user's own voice (voice.mp3, 72.84 s, 2185 frames). Flat 2D bean-head cartoon cards in a 3D toon village (three.js r160 + Playwright render). Built with the `cartoon-audio-short` skill.

## Status
- Script, timing, 17 shots, cast (6 blind men, sage, mahout, villagers), 3D royal elephant, thought-bubble icons, music + SFX: DONE.
- v2 fixes: character cards widened (hands no longer clip); camera system replaced by a framing solver (each key lists what must stay in frame; the solver finds the distance); group shots re-staged into a tight row; wide shots re-composed.
- User renders locally on a MacBook (run_all.sh). Next work depends on their feedback (times in SHOT_LIST.md).

## Files
- web/story.js: EVERYTHING story-related: SHOTS (frame ranges), SPEC (cameras), PARTS (who touches what, when), CL (argue row), actorsAt (poses/expressions), fxAt (bubbles/effects), worldAt (elephant animation), dofAt (focus).
- web/main.js: engine + village + elephant model. web/roman.js (+toonbase.js -> toon.js): characters. After editing roman.js run: `cat web/toonbase.js web/roman.js > web/toon.js`.
- audio.py -> music.wav, sfx.wav; mix.py -> mix_raw.wav (music exactly 50% of voice level); finish.sh -> MP4.
- audit.mjs: `node audit.mjs` projects every character through the camera on all frames and lists who is cut by the frame edge (no rendering needed).

## Rules to keep
- Never edit/retime the voice. Visual reactions land 0-3 frames before their word. No captions unless asked.
- Music = 50% of voice level; SFX <= that; mixing only through mix.py.
- Always run `node audit.mjs` after camera or staging edits.
- Card design space is 1000x1000 with the character centred at x=500 (200 px margin each side).

## To resume in a new chat
Attach this folder (zip) and say: "Continue the Blind Men and the Elephant short. Read HANDOFF.md and SHOT_LIST.md first. My feedback: ..."
