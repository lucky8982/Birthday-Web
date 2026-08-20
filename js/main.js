/* ============================================================
   Happy Birthday My Love 💙 - Entry Point / Integrator
   ------------------------------------------------------------
   File:    js/main.js
   Purpose: Wires the loading screen, background effects and
            audio together into one cinematic experience.
   Note:    This is an ES module - the script tags in index.html
            must be loaded with type="module" for it to run.
            (All markup lives in index.html; this file only wires it.)
   ============================================================ */

import { initBackgroundEffects } from './background-effects.js';
import { AudioManager } from './audio-manager.js';
import { LoadingManager, BEGIN_EVENT } from './loading-manager.js';
import { MemoryLane } from './memory-lane.js';
import { OpeningCinematic } from './opening.js';
import { BirthdayReveal } from './birthday-reveal.js';
import { BackButton } from './back-button.js';
import { sleep } from './utils.js';


/* ------------------------------------------------------------
   Application state - single source of truth for main.js.
   Guards against double-starting effects/audio/listeners.
   ------------------------------------------------------------ */
const app = {
    loading: null,        // LoadingManager instance
    audio: null,          // AudioManager instance
    effects: null,        // { loadingStars, loadingParticles }
    memoryLane: null,     // MemoryLane instance (Scene 2)
    opening: null,        // OpeningCinematic instance (cinematic intro layer)
    birthdayReveal: null, // BirthdayReveal instance (letter -> memory handoff)
    backBtn: null,        // BackButton instance (global UI-only control)
    backState: 'none',    // 'none' | 'love-letter' | 'love-message' |
                          // 'countdown' | 'birthday-reveal' |
                          // 'memory-landing' | 'memory' | 'post-memory'
    revealStage: 'none',  // last reveal stage reported: 'letter' | 'countdown' | 'final'
    revealRun: 0,         // reveal run id - bumped to invalidate stale callbacks
    memoryOpened: false,  // true once the surprise scene is on screen
    revealStarted: false, // true once the birthday reveal has been triggered
    effectsStarted: false,// true once background effects run
    audioInitialized: false, // true once AudioManager is created
    cleaned: false,       // true once cleanup() has run
};


/* ============================================================
   Initialization
   ============================================================ */

/**
 * Boot the whole experience once the DOM is ready.
 * Order matters: essentials first, optional features wrapped
 * in try/catch so nothing can take the site down.
 */
function initApp() {
    // 1. Loading manager (essential - drives the intro)
    app.loading = new LoadingManager();
    app.loading.init();
    app.loading.start();

    // 2. Background effects (optional - needs canvases from index.html)
    try {
        app.effects = initBackgroundEffects();
    } catch (error) {
        console.warn('Background effects unavailable, continuing without them.', error);
    }

    // 3. Audio manager (optional - needs #bg-music; never autoplays)
    try {
        app.audio = new AudioManager('#bg-music');
        app.audio.init();
        app.audioInitialized = true;
        wireMusicToggle();
    } catch (error) {
        console.warn('Audio unavailable, continuing silently.', error);
    }

    // 4. Listen for the user's "Tap to Begin" (single listener, added once)
    window.addEventListener(BEGIN_EVENT, beginExperience);

    // 5. Memory Lane (Scene 2) - the surprise scene. It stays hidden
    //    until the birthday reveal hands over; enter() resets it to the
    //    hidden surprise state every time it opens.
    app.memoryLane = new MemoryLane();

    // The lane reports its internal stage so the Back button follows
    // the scene: 'intro' is the Our Memories landing (Back visible),
    // 'final' is the end-of-lane celebration (Back visible), every
    // chapter stage keeps the global button hidden - the lane owns
    // its own Back/Next controls there.
    app.memoryLane.onState = (stage) => {
        if (app.cleaned) return;
        if (stage === 'intro') {
            setBackState('memory-landing');
        } else if (stage === 'final') {
            setBackState('post-memory');
        } else {
            setBackState('memory');
        }
    };

    // 6. Opening cinematic - a romantic starry layer over the
    //    finished loading screen. Its first tap fires BEGIN_EVENT
    //    itself (music + effects), then each tap reveals the story
    //    until the final word-by-word passage, then the love letter
    //    opens after the question gate, and the final tap hands over
    //    straight to the birthday reveal. Purely additive: if it is
    //    missing, the flow still works through "Tap to Begin".
    try {
        app.opening = new OpeningCinematic();
        app.opening.init();

        // The opening reports its stage so the Back button state
        // machine and the refresh snapshot follow it.
        app.opening.onStage = (stage) => {
            if (app.cleaned) return;
            if (stage === 'love-letter') {
                setBackState('love-letter');
            } else if (stage === 'none') {
                setBackState('none');
            }
        };
    } catch (error) {
        console.warn('Opening cinematic unavailable, continuing without it.', error);
    }

    // 7. Essentials are ready - let the loading screen reach 100%
    app.loading.complete();

    // 8. Birthday reveal - a clean full-screen cinematic moment between
    //    the love letter and the Memory Lane handoff. Purely additive:
    //    if it is missing, the flow still works.
    try {
        app.birthdayReveal = new BirthdayReveal();
        app.birthdayReveal.init();

        // The reveal reports its current stage so the Back button can
        // follow the scene (letter / countdown / final). The run id
        // lets stale callbacks from canceled runs be ignored.
        app.birthdayReveal.onStage = (stage) => updateBackState(stage, app.revealRun);
    } catch (error) {
        console.warn('Birthday reveal unavailable, continuing without it.', error);
    }

    // 8b. Global Back button - UI only; the state machine below decides
    //     when it appears and what "back" means for the current scene.
    app.backBtn = new BackButton().init();
    app.backBtn.onBack = () => handleBack();

    // 9. Reveal the cinematic layer on top of the loading screen,
    //    OR restore the scene the user was in before a refresh.
    //    The opening drives the intro: the first tap dispatches
    //    BEGIN_EVENT (music + effects), the story plays, the letter
    //    opens after the question gate, and the final tap hands
    //    over straight to the birthday reveal.
    try {
        app.opening.onHandover = () => {
            // The loading screen is obsolete the moment the letter
            // ends. Its slow exit would replay its own "Happy
            // Birthday / My Love" title right on top of the reveal
            // (it sits above it at z-index 1000), and the app must
            // be on screen NOW - the countdown may never start
            // unseen. Hide the screen instantly and hand over. The
            // letter-gate restore re-uses the loading screen as its
            // backdrop, so it is forced away again here too.
            app.loading?.exitToApp(true);
            const screen = document.querySelector('#loading-screen');
            if (screen) screen.hidden = true;
            startReveal();
        };

        const savedScene = loadExperienceState();
        if (savedScene) {
            restoreExperience(savedScene);
        } else {
            app.opening.start();
        }
    } catch (error) {
        console.warn('Opening layer could not start, using the tap-to-begin fallback.', error);
    }

    console.info('Happy Birthday My Love - experience ready.');
}


/* ============================================================
   "Tap to Begin" flow (fires on BEGIN_EVENT from LoadingManager)
   ------------------------------------------------------------
   Starts background effects (once) and attempts music playback
   (only now, inside the user gesture - never before).
   ============================================================ */

function beginExperience() {
    if (app.cleaned) return;

    startBackgroundEffects();

    // Best-effort music start. play() never throws and returns
    // false when blocked or when the file is missing.
    if (app.audio) {
        app.audio.play().then((started) => {
            if (!started) {
                console.info('Audio could not start (blocked or missing) - continuing silently.');
            }
        });
    }

    // Fallback path: without the opening layer there is no
    // letter -> reveal handoff, so the reveal starts straight
    // from "Tap to Begin".
    if (!app.opening || !app.opening.started) {
        startReveal();
    }

    // The LoadingManager handles its own transition from here.
}


/* ============================================================
   Birthday reveal handoff (the only doorway to the surprise)
   ------------------------------------------------------------
   Called by the opening layer when the love letter has been
   read (and by the tap-to-begin fallback when the opening is
   missing). Plays the clean full-screen Birthday Reveal
   (5 -> 4 -> 3 -> 2 -> 1 -> "Happy Birthday, My Love ❤️" ->
   live age -> loveMessageStage -> Memory Lane handoff).
   ============================================================ */

function startReveal() {
    if (app.cleaned || app.memoryOpened || app.revealStarted) return;
    app.revealStarted = true;
    app.revealStage = 'none';
    const run = (app.revealRun += 1);

    // Fire the begin flow (safe no-op once begun) so effects and
    // music are running even if no tap-to-begin was used.
    app.loading?.beginExperience();

    // The reveal lives inside #app. If the loading screen is still
    // finishing its own exit (tap-to-begin fallback path), #app may
    // be hidden for up to ~1s - never let the countdown run unseen.
    waitForAppVisible().then(() => {
        (app.birthdayReveal?.play() ?? Promise.resolve()).then(() => {
            // Only the run that started this reveal may open Memory
            // Lane. A canceled run (Back pressed) resolves play() and
            // must NEVER hand over - the letter-gate is back instead.
            if (app.cleaned || run !== app.revealRun) return;
            openMemoryScene();
        });
    });
}

/* Resolve once #app is actually on screen (it is hidden until the
   loading screen hands over). Missing element = already visible. */
async function waitForAppVisible() {
    const appEl = document.querySelector('#app');
    if (!appEl || !appEl.hidden) return;
    while (appEl.hidden && !app.cleaned) {
        await sleep(50);
    }
}

function openMemoryScene() {
    if (app.cleaned || app.memoryOpened) return;
    app.memoryOpened = true;
    // 'memory-landing' (Our Memories intro) - the global Back button
    // is visible here and returns to the reveal final; the lane's own
    // stage hook flips the state once a chapter starts.
    setBackState('memory-landing');

    // The surprise scene takes the stage
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.hidden = false;
        scene2.classList.add('is-visible', 'is-active');
    }

    // Always reset to the hidden surprise state ("something waiting")
    app.memoryLane?.enter();
}


/* ============================================================
   Global Back button state machine
   ------------------------------------------------------------
   The Back button follows APPLICATION STATE, never the DOM.
   Explicit states (see app.backState):

     'none'            loading / tap-to-begin / opening story
     'love-letter'     Love Letter gate (sealed letter + question)
     'love-message'    sub-frame transitional value held only while
                       Back from the reveal final hands over to the
                       reveal letter; never rendered on screen, also
                       a legacy snapshot value
     'countdown'       reveal letter + 5..4..3..2..1 countdown
     'birthday-reveal' final: title + live age + continue
     'memory-landing'  Our Memories landing (lane intro on screen)
     'memory'          inside a memory chapter (lane's own nav)
     'post-memory'     end-of-lane celebration + future sections

   Visibility rule: the Back button is VISIBLE on 'birthday-reveal'
   (Back -> open letter message), 'memory-landing'
   (Back -> reveal final) and 'post-memory' (Back -> reveal
   final). It stays hidden on the Love Letter gate, on the
   reveal's long-letter page and through the whole countdown,
   and inside memory chapters, which have their own Back/Next
   controls.
   Never history.back(), never a reload - main.js decides
   what "back" means for the current state.
   ============================================================ */

/** Only these states ever make the Back button visible */
function backButtonVisible(state) {
    return (
        state === 'birthday-reveal' ||
        state === 'memory-landing' ||
        state === 'post-memory'
    );
}

function setBackState(state) {
    if (app.cleaned) return;
    app.backState = state;
    app.backBtn?.setVisible(backButtonVisible(state));
    saveExperienceState();
}

/** Follow the reveal's own stage reporting (see birthday-reveal.js).
    `run` identifies the reveal run this stage belongs to: a stale
    callback from a canceled run (Back pressed) is ignored, so it can
    never re-show the Back button or flip the scene. Within one run
    the stages are strictly ordered letter -> countdown -> final. The
    reveal's letter stage (the long romantic letter) uses the same
    hidden state as the countdown: the Back button appears only on
    the final stage, and Back there replays the reveal from its
    letter stage. */
function updateBackState(stage, run) {
    if (app.cleaned || run !== app.revealRun) return;

    if (stage === 'letter') {
        // The reveal letter (long message) is on screen: keep the
        // Back button hidden (same state as the countdown); it only
        // appears on the final stage.
        app.revealStage = 'letter';
        setBackState('countdown');
    } else if (stage === 'countdown') {
        if (app.revealStage !== 'letter') return;
        app.revealStage = 'countdown';
        setBackState('countdown');
    } else if (stage === 'final') {
        app.revealStage = 'final';
        setBackState('birthday-reveal');
    }
}

/** One press of the global Back button - restore the previous scene */
async function handleBack() {
    if (app.cleaned) return;

    if (app.backState === 'birthday-reveal') {
        // Back -> the OPEN LETTER MESSAGE page: the Birthday Reveal's
        // own letter stage, which displays the long romantic letter
        // ("Aaj ka din mere liye sirf tumhara birthday nahi hai...").
        // Not the sealed gate, not the opening story, not a restart of
        // the opening cinematic. Order matters:
        // 1. Invalidate the running reveal run so its promise and any
        //    late stage callback can NEVER open Memory Lane.
        app.revealRun += 1;
        // 2. Record the transitional handoff state + persist it; the
        //    Back button is hidden here, so it vanishes the moment
        //    it is pressed (no flash on the replay).
        setBackState('love-message');
        app.revealStarted = false;
        app.revealStage = 'letter';
        // 3. Cancel the current reveal safely (countdown/age timers
        //    stopped) so nothing of the final stage remains behind.
        await app.birthdayReveal?.cancel();
        if (app.cleaned) return;
        // 4. Replay the reveal from its letter stage - it re-fires
        //    'letter' (-> 'countdown', Back hidden) and waits for
        //    "Aage Badho".
        startReveal();
        return;
    }

    if (app.backState === 'love-message') {
        // Back -> the sealed Letter Gate (question page). Order matters:
        // 1. Invalidate the running reveal run.
        app.revealRun += 1;
        // 2. Hide the button + persist the Letter Gate state
        //    immediately - it must vanish the moment it is pressed.
        setBackState('love-letter');
        app.revealStarted = false;
        // 3. Cancel the reveal safely (it may be mid-letter or
        //    restored); the letter wait is resolved and the layer
        //    fully hidden.
        await app.birthdayReveal?.cancel();
        if (app.cleaned) return;
        // 4. Restore the sealed Letter Gate (it re-fires 'love-letter').
        if (app.opening) {
            app.opening.restoreLetterGate();
        } else {
            // Additive fallback (no opening layer): replay the reveal
            // straight from its letter.
            startReveal();
        }
        return;
    }

    if (app.backState === 'memory-landing' || app.backState === 'post-memory') {
        // Back -> Birthday Reveal final/age screen (the stage that
        // handed over to Memory Lane) - never the Love Letter, never
        // a restart, never Memory #1. Order matters:
        // 1. Invalidate any running reveal run so a stale callback
        //    can never open Memory Lane behind the final stage.
        // 2. Record the reveal state so the snapshot and the restore
        //    logic match what is on screen.
        const run = (app.revealRun += 1);
        app.memoryOpened = false;
        app.revealStarted = true;
        app.revealStage = 'final';
        // 3. Hide Memory Lane completely (its z-index sits above the
        //    reveal). It re-enters fresh the next time "Aage Badho"
        //    is pressed on the final stage.
        const scene2 = document.querySelector('#scene-2');
        if (scene2) {
            scene2.hidden = true;
            scene2.classList.remove('is-visible', 'is-active');
        }
        // 4. Re-play the final stage (title + live age + continue).
        //    The button stays visible the whole time - Back again
        //    from the reveal final returns to the open letter
        //    message, as always. Only this run may hand back to
        //    Memory Lane.
        setBackState('birthday-reveal');
        Promise.resolve(app.birthdayReveal?.showFinal()).then(() => {
            if (app.cleaned || run !== app.revealRun) return;
            openMemoryScene();
        });
        return;
    }

    // 'post-memory' end-of-lane + future post-lane sections are
    // handled above (Back -> reveal final).
}


/* ============================================================
   Experience persistence (refresh survival)
   ------------------------------------------------------------
   A small, versioned scene snapshot in localStorage keeps the
   experience where the user was across a refresh - it never
   restarts from the beginning once the user is past the
   opening. Only logical scene states are stored (no timers,
   no DOM state, no animation objects). A first visit has no
   saved state and runs exactly as before. Invalid, corrupt
   or not-yet-restorable state is safely ignored. Nothing is
   ever cleared here: normal navigation, Back presses and
   refreshes all keep the snapshot (there is no global
   "restart the experience" action in the project).
   ============================================================ */

const STATE_KEY = 'hbm.experienceState';
const STATE_VERSION = 1;

/** Scenes that can be restored after a refresh. 'none' (loading /
    opening story) intentionally restarts fresh, and 'post-memory'
    (end-of-lane celebration / future sections) restores into the
    lane intro instead - the snapshot keeps the last restorable
    state, exactly like a mid-chapter refresh. */
const RESTORABLE_SCENES = new Set([
    'love-letter',
    'love-message',
    'countdown',
    'birthday-reveal',
    'memory-landing',
    'memory',
]);

/** Persist the current scene. Called from setBackState() on every
    transition, so the snapshot is always the latest logical scene. */
function saveExperienceState() {
    if (!RESTORABLE_SCENES.has(app.backState)) return;
    try {
        window.localStorage.setItem(STATE_KEY, JSON.stringify({
            version: STATE_VERSION,
            scene: app.backState,
            timestamp: Date.now(),
        }));
    } catch {
        /* Storage unavailable (privacy mode) - best effort */
    }
}

/** Read + validate the saved scene; null means "start fresh". */
function loadExperienceState() {
    try {
        const raw = window.localStorage.getItem(STATE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.version !== STATE_VERSION) return null;
        if (!Number.isFinite(data.timestamp)) return null;
        if (!RESTORABLE_SCENES.has(data.scene)) return null;
        return data.scene;
    } catch {
        return null;
    }
}

/** Bring the user back to the scene they were in before the
    refresh, using only existing scene functions. Runs INSTEAD of
    the opening on that visit; the next full visit starts fresh. */
function restoreExperience(scene) {
    // The tap-to-begin fallback must never interrupt a restored
    // scene - a refresh is not a first visit.
    const tap = document.querySelector('#tap-to-begin');
    if (tap) tap.hidden = true;

    if (scene === 'love-letter') {
        // The letter-gate re-shows itself (restoreLetterGate also
        // un-hides its host loading screen and dims its content);
        // stop the progress simulation, keep the gate interactive.
        if (app.opening) {
            app.loading?.complete();
            // complete() re-reveals the tap button - hide it again
            // (a refresh is not a first visit).
            if (tap) tap.hidden = true;
            app.opening.restoreLetterGate();
        } else {
            startReveal();
        }
        return;
    }

    // Everything past the gate lives under #app: the loading screen
    // must never replay its intro over the restored scene.
    app.loading?.exitToApp(true);

    if (scene === 'countdown' || scene === 'love-message') {
        // Never resume a half-finished old timer sequence: restart
        // the reveal from its Love Letter entry point. 'love-message'
        // is a legacy/transitional snapshot value: replaying the
        // reveal lands on the long-letter page, where the Back
        // button is hidden (same state as the countdown). It stays
        // hidden through the countdown and appears on the final.
        startReveal();
    } else if (scene === 'birthday-reveal') {
        // A stable, readable final stage (title + live age +
        // continue). No old timer sequence is restarted.
        app.revealStarted = true;
        const run = (app.revealRun += 1);
        Promise.resolve(app.birthdayReveal?.showFinal()).then(() => {
            // Natural completion hands over to Memory Lane - unless
            // Back was pressed (the run was invalidated).
            if (app.cleaned || run !== app.revealRun) return;
            openMemoryScene();
        });
    } else if (scene === 'memory' || scene === 'memory-landing') {
        // Memory Lane restores to its landing intro; its own
        // Continue/Next controls work normally (progress lives
        // separately). Refreshing inside a chapter or on the end
        // block lands here too - the snapshot only ever stores
        // logical scenes, and the lane always re-enters its intro.
        openMemoryScene();
    }
}


/* ============================================================
   Background effects (started exactly once)
   ============================================================ */

function startBackgroundEffects() {
    if (app.effectsStarted || !app.effects) return;
    app.effectsStarted = true;

    // Each effect guards itself; the flag above makes doubly sure
    for (const effect of Object.values(app.effects)) {
        try {
            effect?.start();
        } catch (error) {
            console.warn('One background effect failed to start.', error);
        }
    }
}


/* ============================================================
   Music toggle button (#music-toggle from index.html)
   ------------------------------------------------------------
   Tapping it is a user gesture, so first-tap may start the
   music; later taps just mute/unmute. Icons swap via the
   .is-muted class defined in css/style.css.
   ============================================================ */

function wireMusicToggle() {
    const toggle = document.querySelector('#music-toggle');
    if (!toggle) return;

    const syncMusicButton = () => {
        const audio = app.audio;
        if (!audio) return;

        toggle.classList.toggle('is-muted', audio.muted);
        toggle.setAttribute('aria-pressed', String(audio.muted));

        toggle.setAttribute(
            'aria-label',
            audio.muted ? 'Turn background music on' : 'Turn background music off'
        );
    };

    // Restore the correct saved state immediately after AudioManager.init()
    syncMusicButton();

    toggle.addEventListener('click', async () => {
        const audio = app.audio;
        if (!audio) return;

        /*
         * IMPORTANT:
         * Do not automatically unmute on first click.
         * The saved mute state decides whether music should start.
         */

        if (audio.muted) {
            // User explicitly turned music ON
            audio.unmute();

            const started = await audio.play();

            if (!started) {
                console.info('Music could not start.');
            }
        } else {
            // User explicitly turned music OFF
            audio.mute();
            audio.pause();
        }

        // Update icon + accessibility state
        syncMusicButton();
    });
}


/* ============================================================
   Global cleanup
   ------------------------------------------------------------
   Stops loops, removes listeners and releases references
   when the page is being hidden or unloaded.
   ============================================================ */

function cleanup() {
    if (app.cleaned) return;
    app.cleaned = true;

    window.removeEventListener(BEGIN_EVENT, beginExperience);

    try { app.memoryLane?.destroy(); } catch { /* ignore */ }
    app.memoryLane = null;

    try { app.opening?.destroy(); } catch { /* ignore */ }
    app.opening = null;

    try { app.birthdayReveal?.destroy?.(); } catch { /* ignore */ }
    app.birthdayReveal = null;

    try { app.backBtn?.destroy(); } catch { /* ignore */ }
    app.backBtn = null;

    if (app.effects) {
        for (const effect of Object.values(app.effects)) {
            try { effect?.destroy(); } catch { /* ignore */ }
        }
    }

    try { app.audio?.destroy(); } catch { /* ignore */ }
    try { app.loading?.destroy(); } catch { /* ignore */ }
}

window.addEventListener('pagehide', (e) => {
    if (!e.persisted) cleanup();
});


/* ============================================================
   Boot - wait for the DOM, then init once
   ============================================================ */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
    initApp();
}