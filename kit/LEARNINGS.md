# LEARNINGS (append newest at the bottom)
- Hands half cut -> card plane too narrow -> cards are 1000x1000 design space on a 2.25 m plane, +200 px translate.
- Characters leave frame on camera moves -> hand-keyed cameras -> use solveCam (cam.js) and run audit.mjs before rendering.
- Camera felt flat vs reference -> reference moves 2.7x more, 2% near-still frames -> handheld() drift on every camera.
- Ground bare/low-poly -> reference has dense grass -> instanced grass blades (needs instancing in ndMat).
- Long arms / hands inside the 3D object -> station 0.9 m away, touch points too high, hand ignored perspective, depth-test hid the hand -> station 0.5-0.6 m, reachable touch points, handPx ray-plane, clampReach 300 px, overlay cards (depthTest off).
- Unexpected installs surprised the user -> run_all.sh now asks before installing and prints removal commands.
- Cloud CPU render is hours; the user's Mac GPU renders a 73 s video in under a minute -> user renders locally; I only send files + commands, short message.
- Open gaps vs reference: brick/stone texture, light shafts, dusk/night grading, richer faces, macro prop inserts, rigged animals.
