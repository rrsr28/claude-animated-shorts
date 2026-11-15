# Reference study: "How One Cart Stopped an Entire Army" (66.8 s, 30 fps, 9:16)

Measured with optical flow on every frame, plus a frame-by-frame look.

## Camera
- Almost no hard cuts: about 6 in 67 s. Nearly everything is ONE continuous moving camera through a single set.
- Average image motion 0.62 px/frame (our first cut: 0.23). Only 2 % of frames are near-still (ours: 16 %).
- Moves come in bursts of 2-3 s (fast, up to 3 px/frame) followed by calm holds of 1-3 s that still drift.
- Moves combine pan + push + roll together (roll up to about 0.7 deg/frame during whips).
- Low camera, close to the characters, looking slightly up, so grass and props fill the foreground.
- Macro inserts on the key prop (holes, strings) fill the whole frame for 2-4 s.

## World
- Dense detail: instanced grass blades everywhere, textured brick walls, big painted skies with cloud depth.
- Light changes with the story: bright day, then dusk, then night with lanterns. Warm light shafts at beats.
- Depth of field and foreground blur on close shots.

## Characters
- Bean heads stay simple but faces are very expressive (eyebrows, mouth shapes), with a varied crowd (different helmets, hair, moustaches).
- Props carry the action, not the characters.

## Applied to our kit in this update
1. Camera drift layer in `camAt`: slow position drift (side and depth), roll, FOV breathing. Nothing rests.
2. Instanced grass (26,000 short blades) over the plaza; ground tinted green.
3. Instancing support in the ink/depth pass (`ndMat`).

## Still to do (next passes)
- More macro inserts on key props.
- A dusk/night colour arc in the story, not just the golden ending.
- Distinct crowd faces and headgear.
- Textured stone/brick painters and light shafts.
