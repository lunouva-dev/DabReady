import "./styles.css";
import {
  clampSeconds,
  formatRemaining,
  goalPresets,
  snapshot,
  torchPresets,
  type TimerPhase,
  type TimerSettings,
} from "./timer";

const SETTINGS_KEY = "dabready-settings-v1";
const PROFILE_KEY = "dabready-profile-v1";
const DEFAULT_SETTINGS: TimerSettings = { heatSeconds: 30, coolSeconds: 45 };

type LocalProfile = {
  id: string;
  nickname: string;
  sessions: number;
  bangerType: string;
};

type CommunityActivity = {
  nickname: string;
  phase: "heating" | "cooling";
  startedAt: number;
};

type CommunityCheckIn = {
  id: string;
  nickname: string;
  vibe: string;
  note: string;
  heatSeconds: number;
  coolSeconds: number;
  bangerType: string;
  createdAt: number;
};

const vibeLabels: Record<string, string> = {
  lifted: "I'm lifted",
  smacked: "That smacked",
  flavor: "Flavor town",
  smooth: "Smooth landing",
  "too-hot": "Too hot",
  "too-cool": "Too cool",
};

const bangerTypes = {
  unknown: {
    name: "Not sure yet",
    cue: "Start simple",
    description: "Choose this if you do not know the style. The app will use only the heat and cool seconds you set—no hidden adjustment.",
    recognize: "If it looks like a plain cup or bucket, it is probably closest to a flat-top bucket.",
  },
  flat: {
    name: "Flat-top bucket",
    cue: "Simple, common",
    description: "A straightforward quartz bucket with a level top rim. It is a common all-purpose style and works with many carb caps.",
    recognize: "Look for one open bucket with straight walls and a flat or slightly beveled rim—no inner chamber or lower dish.",
  },
  thermal: {
    name: "Thermal",
    cue: "Double-wall",
    description: "A bucket-inside-a-bucket design. The extra quartz changes how it heats and tends to hold heat differently than a simple bucket.",
    recognize: "Look through the side for a second inner wall or chamber nested inside the outer bucket.",
  },
  slurper: {
    name: "Slurper / blender",
    cue: "Tall, high-airflow",
    description: "A taller, multi-part style that uses airflow to move concentrate and often pairs with marbles or pearls.",
    recognize: "Look for a lower dish, a narrow center tube, airflow slots, or a tall chamber instead of one plain open bucket.",
  },
} as const;

function loadSettings(): TimerSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<TimerSettings> | null;
    return {
      heatSeconds: clampSeconds(stored?.heatSeconds ?? DEFAULT_SETTINGS.heatSeconds),
      coolSeconds: clampSeconds(stored?.coolSeconds ?? DEFAULT_SETTINGS.coolSeconds),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadProfile(): LocalProfile {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<LocalProfile> | null;
    return {
      id: stored?.id || crypto.randomUUID(),
      nickname: typeof stored?.nickname === "string" ? stored.nickname.slice(0, 18) : "",
      sessions: Number.isFinite(stored?.sessions) ? Math.max(0, Number(stored?.sessions)) : 0,
      bangerType: typeof stored?.bangerType === "string" && stored.bangerType in bangerTypes ? stored.bangerType : "unknown",
    };
  } catch {
    return { id: crypto.randomUUID(), nickname: "", sessions: 0, bangerType: "unknown" };
  }
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root was not found");

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="DabReady home">
        <span class="brand-mark" aria-hidden="true">D</span>
        <span>DabReady</span>
      </a>
      <div class="topbar-actions">
        <time class="clock" aria-label="Current time"></time>
        <button class="profile-pill" id="profile-pill" type="button" aria-label="Edit your nickname">
          <span class="online-dot" aria-hidden="true"></span>
          <span id="profile-name">Guest</span>
        </button>
      </div>
    </header>

    <section class="timer-panel" aria-labelledby="phase-title">
      <p class="eyebrow" id="phase-kicker">SET YOUR SESSION</p>
      <h1 id="phase-title">Heat. Cool. Ready.</h1>
      <p class="phase-copy" id="phase-copy">One tap starts the whole sequence.</p>

      <div class="timer-wrap">
        <div class="timer-ring" id="timer-ring" style="--progress: 0" aria-hidden="true">
          <div class="timer-face">
            <div class="phase-visual">
              <span class="visual-core"></span>
              <span class="visual-particle particle-one"></span>
              <span class="visual-particle particle-two"></span>
              <span class="visual-particle particle-three"></span>
            </div>
            <strong id="countdown">30</strong>
            <span id="timer-unit">seconds heat</span>
          </div>
        </div>
      </div>

      <div class="action-row">
        <button class="primary-action" id="primary-action" type="button">
          <span class="action-icon" aria-hidden="true">●</span>
          <span id="action-label">Start heating</span>
        </button>
        <button class="quiet-action" id="reset-action" type="button" hidden>Reset</button>
      </div>

      <div class="status-line" aria-live="polite" aria-atomic="true" id="status-line">
        Ready when you are
      </div>

      <form class="checkin-card" id="checkin-form" hidden>
        <p class="eyebrow">POST-DAB CHECK-IN</p>
        <h2>How'd it hit?</h2>
        <div class="vibe-options" role="group" aria-label="Choose your vibe">
          ${Object.entries(vibeLabels).map(([key, label]) => `<button type="button" data-vibe="${key}" aria-pressed="false">${label}</button>`).join("")}
        </div>
        <label class="vibe-note">Say a little more <span>optional · 100 max</span>
          <textarea id="vibe-note" maxlength="100" placeholder="Damn, that was perfect."></textarea>
        </label>
        <div class="checkin-actions">
          <button class="primary-action" id="share-checkin" type="submit" disabled>Share with the room</button>
          <button class="quiet-action" id="skip-checkin" type="button">Skip</button>
        </div>
        <p class="checkin-message" id="checkin-message" aria-live="polite"></p>
      </form>
    </section>

    <section class="community-panel" aria-labelledby="community-title">
      <div class="community-heading">
        <div>
          <p class="eyebrow">THE LIVE ROOM</p>
          <h2 id="community-title">Someone's always on the clock.</h2>
        </div>
        <div class="active-count"><span class="live-pulse" aria-hidden="true"></span><strong id="active-count">0</strong> active now</div>
      </div>
      <div class="active-strip" id="active-strip" aria-live="polite">
        <p class="community-empty">The room is quiet. Start a session and light it up.</p>
      </div>
      <div class="feed-heading">
        <h3>Just landed</h3>
        <span>live community check-ins</span>
      </div>
      <div class="community-feed" id="community-feed">
        <p class="community-empty">The first check-in is waiting to happen.</p>
      </div>
    </section>

    <section class="settings-panel" id="settings-panel" aria-labelledby="settings-title">
      <div class="settings-heading">
        <div>
          <p class="eyebrow">YOUR TIMING</p>
          <h2 id="settings-title">Tune it to your setup</h2>
        </div>
        <button class="sound-toggle" id="sound-toggle" type="button" aria-pressed="true">
          <span aria-hidden="true">◖</span> Sound on
        </button>
      </div>

      <fieldset class="banger-picker">
        <legend>Your banger <span>tap ? to identify it</span></legend>
        <div class="banger-options">
          ${Object.entries(bangerTypes)
            .map(
              ([key, item]) => `
                <div class="banger-option">
                  <button class="banger-select" type="button" data-banger="${key}" aria-pressed="false">
                    <span class="banger-shape banger-shape-${key}" aria-hidden="true"></span>
                    <span><strong>${item.name}</strong><small>${item.cue}</small></span>
                  </button>
                  <button class="banger-help" type="button" data-banger-help="${key}" aria-label="Explain ${item.name}">?</button>
                </div>`,
            )
            .join("")}
        </div>
      </fieldset>

      <div class="preset-grid">
        <fieldset>
          <legend>Torch level <span>sets heat time</span></legend>
          <div class="segmented" id="torch-presets">
            ${Object.entries(torchPresets)
              .map(
                ([key, preset]) =>
                  `<button type="button" data-torch="${key}" data-seconds="${preset.seconds}">${preset.label}<small>${preset.seconds}s</small></button>`,
              )
              .join("")}
          </div>
        </fieldset>

        <fieldset>
          <legend>Goal <span>sets cool time</span></legend>
          <div class="segmented" id="goal-presets">
            ${Object.entries(goalPresets)
              .map(
                ([key, preset]) =>
                  `<button type="button" data-goal="${key}" data-seconds="${preset.seconds}">${preset.label}<small>${preset.seconds}s</small></button>`,
              )
              .join("")}
          </div>
        </fieldset>
      </div>

      <details class="custom-timing">
        <summary>Fine-tune seconds</summary>
        <div class="input-row">
          <label>Heat <input id="heat-seconds" type="number" inputmode="numeric" min="5" max="180" step="1" /> sec</label>
          <label>Cool <input id="cool-seconds" type="number" inputmode="numeric" min="5" max="180" step="1" /> sec</label>
        </div>
      </details>
    </section>

    <aside class="safety-note">
      <span aria-hidden="true">!</span>
      <p><strong>Use your own known-safe timing.</strong> Torch output, material, and thickness vary. Keep open flame away from the device and never leave it unattended.</p>
    </aside>

    <footer>Made for fewer taps and better timing. <span id="session-count">0 sessions on this device</span></footer>
  </main>

  <dialog class="nickname-dialog" id="nickname-dialog">
    <form method="dialog" id="nickname-form">
      <button class="dialog-close" id="dialog-close" value="cancel" type="submit" aria-label="Close">×</button>
      <div class="dialog-orb" aria-hidden="true"><span></span></div>
      <p class="eyebrow">WELCOME TO DABREADY</p>
      <h2>What should we call you?</h2>
      <p>No email. No password. Your nickname and a random device ID stay in this browser for now.</p>
      <label for="nickname-input">Nickname</label>
      <input id="nickname-input" name="nickname" maxlength="18" autocomplete="nickname" placeholder="CloudChaser" required />
      <button class="primary-action dialog-submit" value="default" type="submit">Let’s go</button>
      <small>By continuing, use this tool only where legal and if you are of legal age.</small>
    </form>
  </dialog>

  <dialog class="info-dialog" id="banger-dialog">
    <form method="dialog">
      <button class="dialog-close" value="cancel" type="submit" aria-label="Close">×</button>
      <p class="eyebrow">BANGER GUIDE</p>
      <h2 id="banger-dialog-title"></h2>
      <p id="banger-dialog-description"></p>
      <div class="recognize-box"><strong>How to recognize it</strong><span id="banger-dialog-recognize"></span></div>
      <p class="info-caution">Shape alone cannot determine a safe heat or cool time. Thickness, material, torch, and technique still matter.</p>
      <button class="primary-action dialog-submit" value="default" type="submit">Got it</button>
    </form>
  </dialog>
`;

const elements = {
  clock: document.querySelector<HTMLTimeElement>(".clock")!,
  phaseKicker: document.querySelector<HTMLElement>("#phase-kicker")!,
  phaseTitle: document.querySelector<HTMLElement>("#phase-title")!,
  phaseCopy: document.querySelector<HTMLElement>("#phase-copy")!,
  countdown: document.querySelector<HTMLElement>("#countdown")!,
  timerUnit: document.querySelector<HTMLElement>("#timer-unit")!,
  timerRing: document.querySelector<HTMLElement>("#timer-ring")!,
  primaryAction: document.querySelector<HTMLButtonElement>("#primary-action")!,
  actionLabel: document.querySelector<HTMLElement>("#action-label")!,
  resetAction: document.querySelector<HTMLButtonElement>("#reset-action")!,
  statusLine: document.querySelector<HTMLElement>("#status-line")!,
  settingsPanel: document.querySelector<HTMLElement>("#settings-panel")!,
  soundToggle: document.querySelector<HTMLButtonElement>("#sound-toggle")!,
  heatInput: document.querySelector<HTMLInputElement>("#heat-seconds")!,
  coolInput: document.querySelector<HTMLInputElement>("#cool-seconds")!,
  profilePill: document.querySelector<HTMLButtonElement>("#profile-pill")!,
  profileName: document.querySelector<HTMLElement>("#profile-name")!,
  sessionCount: document.querySelector<HTMLElement>("#session-count")!,
  nicknameDialog: document.querySelector<HTMLDialogElement>("#nickname-dialog")!,
  nicknameForm: document.querySelector<HTMLFormElement>("#nickname-form")!,
  nicknameInput: document.querySelector<HTMLInputElement>("#nickname-input")!,
  dialogClose: document.querySelector<HTMLButtonElement>("#dialog-close")!,
  bangerDialog: document.querySelector<HTMLDialogElement>("#banger-dialog")!,
  bangerDialogTitle: document.querySelector<HTMLElement>("#banger-dialog-title")!,
  bangerDialogDescription: document.querySelector<HTMLElement>("#banger-dialog-description")!,
  bangerDialogRecognize: document.querySelector<HTMLElement>("#banger-dialog-recognize")!,
  checkinForm: document.querySelector<HTMLFormElement>("#checkin-form")!,
  vibeNote: document.querySelector<HTMLTextAreaElement>("#vibe-note")!,
  shareCheckin: document.querySelector<HTMLButtonElement>("#share-checkin")!,
  skipCheckin: document.querySelector<HTMLButtonElement>("#skip-checkin")!,
  checkinMessage: document.querySelector<HTMLElement>("#checkin-message")!,
  activeCount: document.querySelector<HTMLElement>("#active-count")!,
  activeStrip: document.querySelector<HTMLElement>("#active-strip")!,
  communityFeed: document.querySelector<HTMLElement>("#community-feed")!,
};

let settings = loadSettings();
let profile = loadProfile();
let phase: TimerPhase = "idle";
let deadline = 0;
let durationMs = 0;
let animationFrame = 0;
let soundEnabled = true;
let audioContext: AudioContext | null = null;
let wakeLock: WakeLockSentinel | null = null;
let selectedVibe = "";
let presenceInterval = 0;

async function communityPost(payload: Record<string, unknown>): Promise<boolean> {
  if (!profile.nickname) return false;
  try {
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, deviceId: profile.id, nickname: profile.nickname }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function makeText(tag: string, className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderCommunity(active: CommunityActivity[], feed: CommunityCheckIn[]): void {
  elements.activeCount.textContent = active.length.toString();
  elements.activeStrip.replaceChildren();
  if (!active.length) {
    elements.activeStrip.append(makeText("p", "community-empty", "The room is quiet. Start a session and light it up."));
  } else {
    active.forEach((session) => {
      const card = document.createElement("article");
      card.className = `active-person ${session.phase}`;
      card.append(makeText("span", "person-avatar", session.nickname.slice(0, 1).toUpperCase()));
      const copy = document.createElement("div");
      copy.append(makeText("strong", "", session.nickname), makeText("span", "", session.phase === "heating" ? "Torching now" : "Cooling down"));
      card.append(copy, makeText("small", "", relativeTime(session.startedAt)));
      elements.activeStrip.append(card);
    });
  }

  elements.communityFeed.replaceChildren();
  if (!feed.length) {
    elements.communityFeed.append(makeText("p", "community-empty", "The first check-in is waiting to happen."));
  } else {
    feed.forEach((item) => {
      const card = document.createElement("article");
      card.className = "feed-card";
      const top = document.createElement("div");
      top.className = "feed-top";
      top.append(makeText("span", "person-avatar", item.nickname.slice(0, 1).toUpperCase()));
      const identity = document.createElement("div");
      identity.append(makeText("strong", "", item.nickname), makeText("span", "", relativeTime(item.createdAt)));
      top.append(identity, makeText("span", `vibe-badge vibe-${item.vibe}`, vibeLabels[item.vibe] ?? "Checked in"));
      card.append(top);
      if (item.note) card.append(makeText("p", "feed-note", `“${item.note}”`));
      card.append(makeText("small", "feed-meta", `${item.heatSeconds}s heat · ${item.coolSeconds}s cool · ${bangerTypes[item.bangerType as keyof typeof bangerTypes]?.name ?? "Custom setup"}`));
      elements.communityFeed.append(card);
    });
  }
}

async function refreshCommunity(): Promise<void> {
  try {
    const response = await fetch("/api/community", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { active?: CommunityActivity[]; feed?: CommunityCheckIn[] };
    renderCommunity(data.active ?? [], data.feed ?? []);
  } catch {
    // The timer remains fully functional if the community service is unavailable.
  }
}

function beginPresence(): void {
  clearInterval(presenceInterval);
  void communityPost({ action: "presence", phase }).then(() => refreshCommunity());
  presenceInterval = window.setInterval(() => {
    if (phase === "heating" || phase === "cooling") void communityPost({ action: "presence", phase });
  }, 25_000);
}

function leavePresence(): void {
  clearInterval(presenceInterval);
  presenceInterval = 0;
  void communityPost({ action: "leave" }).then(() => refreshCommunity());
}

function updateClock(): void {
  const now = new Date();
  elements.clock.dateTime = now.toISOString();
  elements.clock.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function persistSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function persistProfile(): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function syncProfile(): void {
  elements.profileName.textContent = profile.nickname || "Guest";
  elements.nicknameInput.value = profile.nickname;
  elements.sessionCount.textContent = `${profile.sessions} ${profile.sessions === 1 ? "session" : "sessions"} on this device`;
  elements.dialogClose.hidden = !profile.nickname;
  document.querySelectorAll<HTMLButtonElement>("[data-banger]").forEach((button) => {
    const isSelected = button.dataset.banger === profile.bangerType;
    button.setAttribute("aria-pressed", isSelected.toString());
    button.closest(".banger-option")?.classList.toggle("selected", isSelected);
  });
}

function syncSettings(): void {
  elements.heatInput.value = settings.heatSeconds.toString();
  elements.coolInput.value = settings.coolSeconds.toString();
  document.querySelectorAll<HTMLButtonElement>("[data-torch]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.seconds) === settings.heatSeconds);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-goal]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.seconds) === settings.coolSeconds);
  });
  if (phase === "idle") elements.countdown.textContent = settings.heatSeconds.toString();
}

async function primeAudio(): Promise<void> {
  if (!soundEnabled) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
}

function playTone(frequency: number, start: number, length: number): void {
  if (!audioContext || !soundEnabled) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.28, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

function playTransitionSound(isReady: boolean): void {
  if (!audioContext || !soundEnabled) return;
  const now = audioContext.currentTime;
  if (isReady) {
    playTone(523.25, now, 0.22);
    playTone(659.25, now + 0.24, 0.22);
    playTone(783.99, now + 0.48, 0.5);
  } else {
    playTone(440, now, 0.16);
    playTone(554.37, now + 0.18, 0.28);
  }
}

async function requestWakeLock(): Promise<void> {
  if (!navigator.wakeLock || document.visibilityState !== "visible") return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    elements.statusLine.textContent = "Keep this screen open so the timer stays visible";
  }
}

async function releaseWakeLock(): Promise<void> {
  if (!wakeLock) return;
  const current = wakeLock;
  wakeLock = null;
  await current.release().catch(() => undefined);
}

function renderStaticState(): void {
  document.body.dataset.phase = phase;
  elements.settingsPanel.toggleAttribute("inert", phase === "heating" || phase === "cooling");
  elements.resetAction.hidden = phase === "idle";

  if (phase === "idle") {
    elements.checkinForm.hidden = true;
    elements.phaseKicker.textContent = "SET YOUR SESSION";
    elements.phaseTitle.textContent = "Heat. Cool. Ready.";
    elements.phaseCopy.textContent = "One tap starts the whole sequence.";
    elements.countdown.textContent = settings.heatSeconds.toString();
    elements.timerUnit.textContent = "seconds heat";
    elements.actionLabel.textContent = "Start heating";
    elements.primaryAction.disabled = false;
    elements.statusLine.textContent = "Ready when you are";
    elements.timerRing.style.setProperty("--progress", "0");
  } else if (phase === "heating") {
    elements.checkinForm.hidden = true;
    elements.phaseKicker.textContent = "STEP 1 OF 2";
    elements.phaseTitle.textContent = "Torch now";
    elements.phaseCopy.textContent = "The cooldown begins automatically.";
    elements.timerUnit.textContent = "seconds heat";
    elements.actionLabel.textContent = "Heating…";
    elements.primaryAction.disabled = true;
    elements.statusLine.textContent = `Then cool for ${settings.coolSeconds} seconds`;
  } else if (phase === "cooling") {
    elements.checkinForm.hidden = true;
    elements.phaseKicker.textContent = "STEP 2 OF 2";
    elements.phaseTitle.textContent = "Cool it down";
    elements.phaseCopy.textContent = "Hands free—the alert is next.";
    elements.timerUnit.textContent = "seconds cool";
    elements.actionLabel.textContent = "Cooling…";
    elements.primaryAction.disabled = true;
    elements.statusLine.textContent = "Listen for the ready chime";
  } else {
    elements.phaseKicker.textContent = "RIGHT NOW";
    elements.phaseTitle.textContent = "Dab time";
    elements.phaseCopy.textContent = "Your timing sequence is complete.";
    elements.countdown.textContent = "GO";
    elements.timerUnit.textContent = "ready";
    elements.actionLabel.textContent = "Run it again";
    elements.primaryAction.disabled = false;
    elements.statusLine.textContent = "Dab time—your setup is ready";
    elements.timerRing.style.setProperty("--progress", "1");
    elements.checkinForm.hidden = false;
  }
}

function beginPhase(nextPhase: "heating" | "cooling"): void {
  phase = nextPhase;
  durationMs = (nextPhase === "heating" ? settings.heatSeconds : settings.coolSeconds) * 1000;
  deadline = Date.now() + durationMs;
  renderStaticState();
  beginPresence();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(tick);
}

function tick(): void {
  const current = snapshot(phase, deadline, durationMs);
  elements.countdown.textContent = formatRemaining(current.remainingMs);
  elements.timerRing.style.setProperty("--progress", current.progress.toFixed(4));

  if (current.remainingMs <= 0) {
    if (phase === "heating") {
      playTransitionSound(false);
      navigator.vibrate?.([120, 80, 120]);
      beginPhase("cooling");
    } else if (phase === "cooling") {
      phase = "ready";
      profile.sessions += 1;
      persistProfile();
      syncProfile();
      playTransitionSound(true);
      navigator.vibrate?.([180, 90, 180, 90, 360]);
      renderStaticState();
      leavePresence();
      void releaseWakeLock();
    }
    return;
  }

  animationFrame = requestAnimationFrame(tick);
}

async function startSequence(): Promise<void> {
  selectedVibe = "";
  elements.vibeNote.value = "";
  elements.checkinMessage.textContent = "";
  elements.shareCheckin.disabled = true;
  document.querySelectorAll<HTMLButtonElement>("[data-vibe]").forEach((button) => button.setAttribute("aria-pressed", "false"));
  await primeAudio();
  await requestWakeLock();
  beginPhase("heating");
}

function resetSequence(): void {
  cancelAnimationFrame(animationFrame);
  phase = "idle";
  leavePresence();
  void releaseWakeLock();
  renderStaticState();
  syncSettings();
}

elements.primaryAction.addEventListener("click", () => {
  if (phase === "idle" || phase === "ready") void startSequence();
});

elements.resetAction.addEventListener("click", resetSequence);

elements.soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  elements.soundToggle.setAttribute("aria-pressed", soundEnabled.toString());
  elements.soundToggle.innerHTML = `<span aria-hidden="true">${soundEnabled ? "◖" : "×"}</span> Sound ${soundEnabled ? "on" : "off"}`;
  if (soundEnabled) void primeAudio();
});

elements.profilePill.addEventListener("click", () => {
  syncProfile();
  elements.nicknameDialog.showModal();
  elements.nicknameInput.focus();
});

elements.nicknameForm.addEventListener("submit", (event) => {
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  if (submitter?.value === "cancel") return;
  event.preventDefault();
  const nickname = elements.nicknameInput.value.trim().replace(/\s+/g, " ").slice(0, 18);
  if (!nickname) {
    elements.nicknameInput.focus();
    return;
  }
  profile.nickname = nickname;
  persistProfile();
  syncProfile();
  elements.nicknameDialog.close();
  void refreshCommunity();
});

document.querySelectorAll<HTMLButtonElement>("[data-vibe]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedVibe = button.dataset.vibe ?? "";
    document.querySelectorAll<HTMLButtonElement>("[data-vibe]").forEach((option) => {
      option.setAttribute("aria-pressed", (option === button).toString());
    });
    elements.shareCheckin.disabled = !selectedVibe;
  });
});

elements.checkinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedVibe) return;
  elements.shareCheckin.disabled = true;
  elements.checkinMessage.textContent = "Sharing your landing…";
  const shared = await communityPost({
    action: "check-in",
    vibe: selectedVibe,
    note: elements.vibeNote.value,
    heatSeconds: settings.heatSeconds,
    coolSeconds: settings.coolSeconds,
    bangerType: profile.bangerType,
  });
  if (!shared) {
    elements.checkinMessage.textContent = "The room missed that one. Try again.";
    elements.shareCheckin.disabled = false;
    return;
  }
  elements.checkinMessage.textContent = "Shared with the room.";
  elements.checkinForm.classList.add("shared");
  window.setTimeout(() => {
    elements.checkinForm.hidden = true;
    elements.checkinForm.classList.remove("shared");
  }, 1_100);
  await refreshCommunity();
});

elements.skipCheckin.addEventListener("click", () => {
  elements.checkinForm.hidden = true;
});

document.querySelectorAll<HTMLButtonElement>("[data-banger]").forEach((button) => {
  button.addEventListener("click", () => {
    profile.bangerType = button.dataset.banger ?? "unknown";
    persistProfile();
    syncProfile();
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-banger-help]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.bangerHelp as keyof typeof bangerTypes;
    const item = bangerTypes[key];
    if (!item) return;
    elements.bangerDialogTitle.textContent = item.name;
    elements.bangerDialogDescription.textContent = item.description;
    elements.bangerDialogRecognize.textContent = item.recognize;
    elements.bangerDialog.showModal();
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-torch]").forEach((button) => {
  button.addEventListener("click", () => {
    settings.heatSeconds = clampSeconds(Number(button.dataset.seconds));
    persistSettings();
    syncSettings();
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-goal]").forEach((button) => {
  button.addEventListener("click", () => {
    settings.coolSeconds = clampSeconds(Number(button.dataset.seconds));
    persistSettings();
    syncSettings();
  });
});

function applyCustomTiming(key: keyof TimerSettings, input: HTMLInputElement): void {
  const value = input.valueAsNumber;
  if (!Number.isFinite(value) || value < 5 || value > 180) return;
  settings[key] = Math.round(value);
  persistSettings();
  document.querySelectorAll<HTMLButtonElement>(key === "heatSeconds" ? "[data-torch]" : "[data-goal]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.seconds) === settings[key]);
  });
  if (phase === "idle" && key === "heatSeconds") elements.countdown.textContent = settings.heatSeconds.toString();
}

elements.heatInput.addEventListener("input", () => applyCustomTiming("heatSeconds", elements.heatInput));
elements.coolInput.addEventListener("input", () => applyCustomTiming("coolSeconds", elements.coolInput));
elements.heatInput.addEventListener("change", syncSettings);
elements.coolInput.addEventListener("change", syncSettings);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && (phase === "heating" || phase === "cooling")) {
    void requestWakeLock();
    void primeAudio();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !elements.primaryAction.disabled && event.target === document.body) {
    event.preventDefault();
    elements.primaryAction.click();
  }
  if (event.key === "Escape" && phase !== "idle") resetSequence();
});

updateClock();
setInterval(updateClock, 1_000);
syncSettings();
syncProfile();
renderStaticState();
void refreshCommunity();
window.setInterval(() => void refreshCommunity(), 10_000);

if (!profile.nickname) {
  elements.nicknameDialog.showModal();
  elements.nicknameInput.focus();
}
