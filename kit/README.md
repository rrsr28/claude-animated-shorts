# The Blind Men and the Elephant: render it on your MacBook

You do not need to know anything technical. You will copy and paste 4 lines.

## What this folder is
The full animation project. It draws every frame (2185 pictures) and then joins them with your voice, music and sound effects into an MP4. Your MacBook's graphics chip is much faster at the drawing part than the cloud computer I used, so rendering on your Mac should take roughly 15 to 60 minutes instead of 2.5 hours.

## Steps
1. **Unzip** the file you downloaded. Move the folder `blind-men-elephant` somewhere easy, for example Downloads.
2. **Open Terminal**: press `Cmd + Space`, type `Terminal`, press Enter.
3. In Terminal type `cd ` (the letters c, d and then a space). **Drag the folder** `blind-men-elephant` into the Terminal window (it fills in the path) and press Enter.
4. **Check first** (about 5-10 minutes the first time, because it installs things):
   ```
   bash run_all.sh test
   ```
   - If it says Homebrew is missing, open https://brew.sh, copy the one line shown there into Terminal, press Enter, then repeat step 4.
   - When it finishes, open `stills/contact_sheet.jpg`. That is 8 sample frames.
   - Read the line that says `graphics:`. It should end with `(GPU, good)`. If it says `WARNING ... CPU`, tell me and I'll adjust.
5. **Make the whole video**:
   ```
   bash run_all.sh
   ```
   It prints progress. Leave the lid open and the Mac plugged in. If you stop it (Ctrl + C) or it gets interrupted, run the same command again: it continues where it stopped.
6. At the end, a Finder window opens on the `out` folder. Your video is `The-Blind-Men-and-the-Elephant.mp4`.

## If you want changes
Watch the video and note the **time** of anything you want fixed (for example "0:34, the man's hand is cut off"). `SHOT_LIST.md` lists every shot with its time. Tell me in the chat; I'll edit `web/story.js` (or another file) and send you back just the changed file(s). Copy them over the old ones, then re-render only that part:
```
bash rerender.sh 1000 1200
```
(the two numbers are the first and last frame; frame = seconds x 30).

## If something goes wrong
- `command not found`: you are probably not inside the folder. Repeat step 3.
- Install errors: copy the red text and send it to me.
- Very slow (more than 5 seconds per frame): the `graphics:` line probably says CPU. Close other apps and tell me.
- Try fewer or more browser windows: `WORKERS=1 bash run_all.sh` (or `WORKERS=3`).
