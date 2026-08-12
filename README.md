# DabReady

A one-tap, hands-free heat and cooldown timer. Start the sequence, keep your hands on the setup, and get a clear sound and vibration cue when it is time.

## What it does

- Runs heat → cooldown → ready without another tap
- Uses deadline-based timing to reduce countdown drift
- Offers quick torch-level and goal presets, plus exact custom seconds
- Keeps the screen awake when the browser supports the Screen Wake Lock API
- Plays an in-browser ready chime and uses vibration when available
- Saves timing preferences locally on the device
- Uses a nickname and random local device ID instead of email/password signup
- Tracks a private session count on the device
- Includes a beginner-friendly banger-style picker with identification help
- Shows active heating and cooling sessions in a shared live room
- Lets users post a post-dab vibe and optional short note to a recent activity feed
- Works as a lightweight installable web app

## Community safety

The live room is currently intended for private testing. Before public access, add reporting, moderation, rate limiting, and a published community policy for user-written notes.

The included timing values are only starting points. Torch output, material, thickness, and personal setup vary; users should choose timing they already know is safe for their equipment.

## Local development

```bash
npm install
npm run dev
```

## Checks

```bash
npm test
npm run build
```

## Status

Early public-project foundation. **DabReady** is a working title and can be renamed before the repository or domain goes public.
