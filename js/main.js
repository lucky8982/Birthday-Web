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
import { EntryLockIntro } from './entry-lock.js';
import { QuestionLockScreen } from './question-lock.js';
import { BirthdayReveal } from './birthday-reveal.js';
import { BackButton } from './back-button.js';
import { SecretGame } from './secret-game.js';
import { InfiniteGarden } from './infinite-garden.js';
import { FinalLoveLetter } from './final-love-letter.js';
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
    entryLock: null,      // EntryLockIntro instance (entry lock intro scene)
    questionLock: null,   // QuestionLockScreen instance (question lock screen)
    birthdayReveal: null, // BirthdayReveal instance (letter -> memory handoff)
    secretGame: null,     // SecretGame instance (THE SECRET OF US)
    infiniteGarden: null, // InfiniteGarden instance (final interactive scene)
    finalLoveLetter: null,// FinalLoveLetter instance (post-reward ending)
    backBtn: null,        // BackButton instance (global UI-only control)
    backState: 'none',    // 'none' | 'love-letter' | 'love-message' |
                          // 'countdown' | 'birthday-letter' | 'birthday-reveal' |
                          // 'memory-landing' | 'memory' | 'post-memory' |
                          // 'timeline' | 'secret-game' | 'reward' | 'post-reward'
    revealStage: 'none',  // last reveal stage reported: 'letter' | 'countdown' | 'final'
    revealRun: 0,         // reveal run id - bumped to invalidate stale callbacks
    memoryOpened: false,  // true once the surprise scene is on screen
    postMemoryRun: 0,     // invalidates post-memory handoff timers
    revealStarted: false, // true once the birthday reveal has been triggered
    effectsStarted: false,// true once background effects run
    audioInitialized: false, // true once AudioManager is created
    cleaned: false,       // true once cleanup() has run
    passwordVerifiedThisSession: false, // never persisted; reset whenever #question-lock is shown
    inactivityTimer: null,
    lastActivityAt: 0,
    inactivityListenersAttached: false,
    inactivityLoggingOut: false,
    inactivityRescheduleFrame: null,
};

const INACTIVITY_TIMEOUT_MS = 480000;
const INACTIVITY_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel'];

const DATE_GATE_STORAGE_KEY = 'hbm.dateGate.v1';

function hasCompletedDateGate() {
    try {
        return window.localStorage.getItem(DATE_GATE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function markDateGateCompleted() {
    try {
        window.localStorage.setItem(DATE_GATE_STORAGE_KEY, '1');
    } catch {
        /* Storage unavailable: the current flow remains valid. */
    }
}

function syncEarlySkipButton() {
    const btn = document.querySelector('#opening-skip-btn');
    if (!btn) return;

    const onEligibleMessage =
        app.opening?.state === 'message' &&
        app.opening.messageIndex >= 0 &&
        app.opening.messageIndex <= 2;
    btn.hidden = !(
        app.passwordVerifiedThisSession &&
        hasCompletedDateGate() &&
        onEligibleMessage
    );
}

function skipCompletedEarlyFlow(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const onEligibleMessage =
        app.opening?.state === 'message' &&
        app.opening.messageIndex >= 0 &&
        app.opening.messageIndex <= 2;
    if (!app.passwordVerifiedThisSession || !hasCompletedDateGate() || !onEligibleMessage) return;

    app.opening?.resumeAtDateGate();
}

function showQuestionLock() {
    stopInactivityTracking();
    // This flag is deliberately memory-only. Returning to the password
    // page always requires a fresh successful password verification.
    app.passwordVerifiedThisSession = false;
    syncEarlySkipButton();

    const question = app.questionLock;
    if (!question) return;

    question.cleanup();
    question.started = false;
    question.finished = false;
    question.busy = false;
    question.overlay?.classList.remove('is-visible', 'is-leaving');
    if (question.overlay) question.overlay.hidden = true;
    question.start();
}

function recordInactivityActivity() {
    if (!app.passwordVerifiedThisSession || app.inactivityLoggingOut) return;
    app.lastActivityAt = Date.now();
    // A scrolling panel can emit many events per frame. The timestamp still
    // updates on every event, while timer work is coalesced to one frame.
    if (app.inactivityRescheduleFrame != null) return;
    app.inactivityRescheduleFrame = requestAnimationFrame(() => {
        app.inactivityRescheduleFrame = null;
        scheduleInactivityLogout();
    });
}

function scheduleInactivityLogout() {
    if (!app.passwordVerifiedThisSession || app.inactivityLoggingOut) return;
    if (app.inactivityTimer != null) {
        clearTimeout(app.inactivityTimer);
        app.inactivityTimer = null;
    }

    const remaining = INACTIVITY_TIMEOUT_MS - (Date.now() - app.lastActivityAt);
    if (remaining <= 0) {
        performInactivityLogout();
        return;
    }

    app.inactivityTimer = window.setTimeout(() => {
        app.inactivityTimer = null;
        // Background tabs can delay timers, so use elapsed wall-clock time.
        if (Date.now() - app.lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
            performInactivityLogout();
        } else {
            scheduleInactivityLogout();
        }
    }, remaining);
}

function handleInactivityVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleInactivityLogout();
}

function startInactivityTracking() {
    if (app.cleaned || !app.passwordVerifiedThisSession) return;
    app.inactivityLoggingOut = false;
    app.lastActivityAt = Date.now();

    if (!app.inactivityListenersAttached) {
        for (const eventName of INACTIVITY_ACTIVITY_EVENTS.filter(eventName => eventName !== 'scroll')) {
            window.addEventListener(eventName, recordInactivityActivity, { passive: true });
        }
        // Scroll events do not bubble, so capture them from nested scene
        // scrollers as well as the document itself.
        document.addEventListener('scroll', recordInactivityActivity, { passive: true, capture: true });
        document.addEventListener('visibilitychange', handleInactivityVisibilityChange);
        app.inactivityListenersAttached = true;
    }
    scheduleInactivityLogout();
}

function stopInactivityTracking() {
    if (app.inactivityRescheduleFrame != null) {
        cancelAnimationFrame(app.inactivityRescheduleFrame);
        app.inactivityRescheduleFrame = null;
    }
    if (app.inactivityTimer != null) {
        clearTimeout(app.inactivityTimer);
        app.inactivityTimer = null;
    }
    if (app.inactivityListenersAttached) {
        for (const eventName of INACTIVITY_ACTIVITY_EVENTS.filter(eventName => eventName !== 'scroll')) {
            window.removeEventListener(eventName, recordInactivityActivity);
        }
        document.removeEventListener('scroll', recordInactivityActivity, true);
        document.removeEventListener('visibilitychange', handleInactivityVisibilityChange);
        app.inactivityListenersAttached = false;
    }
    app.lastActivityAt = 0;
}

function clearExperienceRestoreState() {
    try {
        window.localStorage.removeItem(STATE_KEY);
        window.localStorage.removeItem(POST_MEMORY_STATE_KEY);
    } catch {
        /* Storage unavailable: the memory-only lock still applies. */
    }
}

function performInactivityLogout() {
    if (app.inactivityLoggingOut || !app.passwordVerifiedThisSession) return;
    app.inactivityLoggingOut = true;
    stopInactivityTracking();

    // Invalidate callbacks before hiding live protected views. Individual
    // progress keys and audio preferences are deliberately not cleared.
    app.revealRun += 1;
    app.postMemoryRun += 1;
    try { void app.birthdayReveal?.cancel?.(); } catch {}
    try { app.opening?.reset?.(); } catch {}
    try { app.memoryLane?.reset?.(); } catch {}
    try { app.finalLoveLetter?.stop?.(); } catch {}
    try { app.infiniteGarden?.stop?.(); } catch {}
    try { app.secretGame?.destroy?.(); } catch {}

    try {
        app.secretGame = new SecretGame().init();
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
    } catch (error) {
        console.warn('Unable to reset Secret Game during inactivity logout.', error);
    }

    for (const selector of ['#scene-2', '#scene-3', '#scene-4', '#scene-5', '#scene-6', '#scene-7', '#scene-8', '#post-memory-message', '#our-timeline', '#secret-game']) {
        const scene = document.querySelector(selector);
        if (!scene) continue;
        scene.hidden = true;
        scene.classList.remove('is-visible', 'is-active', 'is-leaving', 'is-entered', 'is-restored');
    }
    const appEl = document.querySelector('#app');
    if (appEl) appEl.hidden = true;
    const loading = document.querySelector('#loading-screen');
    if (loading) {
        loading.hidden = false;
        loading.classList.add('is-lettering');
    }

    clearExperienceRestoreState();
    app.memoryOpened = false;
    app.revealStarted = false;
    app.revealStage = 'none';
    app.backState = 'none';
    app.backBtn?.setVisible(false);
    showQuestionLock();
    app.inactivityLoggingOut = false;
}


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
        // Refresh survival: if the saved preference is ON, resume
        // the music on the earliest user interaction (browser-safe).
        wireMusicResumeOnGesture();
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

    // When the user taps "A New Beginning" at the end of Memory Lane,
    // hand over to the separate "Every movement..." message screen,
    // which then leads to Our Timeline. This keeps the final OUR FOREVER
    // page clean (Preview left, New Beginning right) and the message
    // on its own cinematic screen.
    app.memoryLane.onFinal = () => {
        if (app.cleaned) return true;
        showPostMemoryMessage({ animate: true });
        return true; // handled - prevent default reset
    };

    // Post-Memory Message Continue -> THE SECRET OF US game intro
    // ("Tumne hamari kahani dekhi... Ab ek chhota sa secret hai...").
    // The "Har pal, ek kahani" / Our Timeline step is no longer part
    // of the forward flow - hideTimelineForGame() hands control
    // directly to the game's intro screen.
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#post-memory-continue');
        if (!btn) return;
        const msg = document.querySelector('#post-memory-message');
        if (!msg || msg.hidden || !msg.classList.contains('is-visible')) return;
        e.preventDefault();
        const handoffRun = app.postMemoryRun;
        // Hide message, then enter the Secret Game intro directly
        msg.classList.remove('is-visible', 'is-entered', 'is-restored');
        setTimeout(() => {
            if (msg && handoffRun === app.postMemoryRun && app.backState === 'secret-game') {
                msg.hidden = true;
            }
        }, 600);
        hideTimelineForGame();
    });

    // 5b. THE SECRET OF US - independent cinematic game (after timeline)
    try {
        app.secretGame = new SecretGame().init();
        // After the reward is fully read, hand over to future sections
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
    } catch (error) {
        console.warn('Secret Game unavailable, continuing without it.', error);
    }

    try {
        app.infiniteGarden = new InfiniteGarden().init();
    } catch (error) {
        console.warn('Infinite Garden unavailable, continuing without it.', error);
    }

    try {
        app.finalLoveLetter = new FinalLoveLetter().init();
        app.finalLoveLetter.onGarden = () => showInfiniteGarden();
    } catch (error) {
        console.warn('Final love letter unavailable, continuing without it.', error);
    }

    // Timeline CTA -> Secret Game: delegated listener (robust, no duplicate)
    // Handles the button even if it is re-rendered or if direct binding failed.
    // Only fires when timeline is actually visible to avoid double-start.
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#timeline-enter-btn');
        if (!btn) return;
        const tl = document.querySelector('#our-timeline');
        if (!tl || tl.hidden || !tl.classList.contains('is-visible')) return;
        e.preventDefault();
        hideTimelineForGame();
    });

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
            syncEarlySkipButton();
        };
        app.opening.onDateGateComplete = () => {
            markDateGateCompleted();
            syncEarlySkipButton();
        };
        app.opening.onMessageChange = () => syncEarlySkipButton();
    } catch (error) {
        console.warn('Opening cinematic unavailable, continuing without it.', error);
    }

    // 7. Entry Lock Intro - cinematic entry scene that plays
    //    after loading completes, BEFORE the Opening cinematic.
    try {
        app.entryLock = new EntryLockIntro();
        app.entryLock.init();

        // The entry lock reports when it's finished so we can
        // start the Question Lock Screen (Phase 2).
        app.entryLock.onHandover = () => {
            if (app.questionLock) {
                showQuestionLock();
            } else {
                // Fallback if QuestionLock is unavailable
                if (app.opening) {
                    app.opening.start();
                }
            }
        };
    } catch (error) {
        console.warn('Entry Lock Intro unavailable, continuing without it.', error);
    }

    const earlySkipBtn = document.querySelector('#opening-skip-btn');
    earlySkipBtn?.addEventListener('click', skipCompletedEarlyFlow);
    syncEarlySkipButton();

    // 7b. Question Lock Screen (Phase 2) - Question/Entry Lock Screen
    //    Appears after Entry Lock Intro completes. A cinematic question
    //    screen with text input validation and cinematic unlock.
    try {
        app.questionLock = new QuestionLockScreen();
        app.questionLock.init();

        // The question lock reports when it's finished so we can
        // start the Opening cinematic.
        app.questionLock.onHandover = () => {
            app.passwordVerifiedThisSession = true;
            startInactivityTracking();
            if (app.opening) {
                app.opening.start();
            }
        };
    } catch (error) {
        console.warn('Question Lock Screen unavailable, continuing without it.', error);
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

    // Level 1: Memory Lane start - Return to Beginning button
    const restartIntroBtn = document.querySelector('#memory-restart-intro');
    if (restartIntroBtn) {
        restartIntroBtn.addEventListener('click', () => {
            showRestartConfirmation();
        });
    }

    // The existing epilogue now hands forward into the final garden.
    const epilogueRestartBtn = document.querySelector('#epilogue-restart');
    if (epilogueRestartBtn) {
        epilogueRestartBtn.addEventListener('click', () => {
            showInfiniteGarden();
        });
    }

    document.querySelector('#infinite-garden-restart')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        restartExperience();
    });

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

        const savedPostMemoryStage = loadPostMemoryState();
        const savedScene = loadExperienceState();
        if (savedPostMemoryStage) {
            restorePostMemoryExperience(savedPostMemoryStage);
        } else if (savedScene) {
            restoreExperience(savedScene);
        } else {
            // Start the Entry Lock Intro first, which will then
            // hand over to the Opening cinematic when complete.
            if (app.entryLock) {
                app.entryLock.start();
            } else {
                app.opening.start();
            }
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
   (3 -> 2 -> 1 -> "Happy Birthday, My Love ❤️" ->
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

function showPostMemoryMessage({ animate = true } = {}) {
    if (app.cleaned) return;
    const handoffRun = ++app.postMemoryRun;
    // This is the first stable checkpoint after Memory Lane. It is
    // intentionally recorded here (and nowhere before this handoff).
    savePostMemoryState('post-memory-final');

    // Let the settled Memory Lane scene softly leave before it is removed.
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.classList.add('is-leaving');
        window.setTimeout(() => {
            if (handoffRun !== app.postMemoryRun) return;
            scene2.hidden = true;
            scene2.classList.remove('is-visible', 'is-active', 'is-leaving');
        }, animate ? 300 : 0);
    }
    for (let i = 3; i <= 8; i++) {
        const s = document.querySelector(`#scene-${i}`);
        if (s) { s.hidden = true; s.classList.remove('is-visible', 'is-active'); }
    }
    // Hide any existing timeline/game
    const tl = document.querySelector('#our-timeline');
    if (tl) { tl.hidden = true; tl.classList.remove('is-visible'); }
    const sg = document.querySelector('#secret-game');
    if (sg) { sg.hidden = true; sg.classList.remove('is-visible'); }
    const appEl = document.querySelector('#app');
    if (appEl) appEl.hidden = false;
    // Show the separate Every-movement message screen
    const msg = document.querySelector('#post-memory-message');
    if (msg) {
        msg.classList.remove('is-visible', 'is-entered', 'is-restored');
        msg.hidden = false;
        void msg.offsetWidth;
        msg.classList.add('is-visible');
        msg.classList.add(animate ? 'is-entered' : 'is-restored');
    }
    // This Back returns to the clean Our Memories start, not a chapter.
    setBackState('post-memory-message');
    window.scrollTo(0, 0);
}

/* ============================================================
   Our Timeline → THE SECRET OF US handoff
   ------------------------------------------------------------
   The game is NOT the next screen after the intro. It appears
   ONLY after Our Timeline is completed, which itself appears
   after Memory Lane's final celebration. This keeps the order:
   Our Story → Memory Lane → Love Letters → Special Moments
   → Our Timeline → THE SECRET OF US → Reward → Special
   Message → Final Birthday Celebration → Final Love Message
   ============================================================ */
function showTimelineScene() {
    if (app.cleaned) return;
    // Hide Memory Lane completely - it must not remain behind
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.hidden = true;
        scene2.classList.remove('is-visible', 'is-active');
    }
    // Hide post-memory message if visible
    const pm = document.querySelector('#post-memory-message');
    if (pm) {
        pm.hidden = true;
        pm.classList.remove('is-visible');
    }
    // Hide any other placeholder scenes that might be visible
    for (let i = 3; i <= 8; i++) {
        const s = document.querySelector(`#scene-${i}`);
        if (s) { s.hidden = true; s.classList.remove('is-visible', 'is-active'); }
    }
    // Ensure the app container is visible (it hosts #our-timeline)
    const appEl = document.querySelector('#app');
    if (appEl) appEl.hidden = false;

    // Hand over to the SecretGame's timeline view
    app.secretGame?.showTimeline();
    setBackState('timeline');
}

function hideTimelineForGame() {
    if (app.cleaned) return;
    // Prevent double-start if already in game
    if (app.backState === 'secret-game' && app.secretGame?.started) return;
    const tl = document.querySelector('#our-timeline');
    if (tl && !tl.hidden) {
        // Smooth fade: remove visible class, then hide after transition
        tl.classList.remove('is-visible');
        setTimeout(() => { if (tl) tl.hidden = true; }, 620);
    } else if (tl) {
        tl.hidden = true;
        tl.classList.remove('is-visible');
    }
    // Fully hide the previous lane background so nothing leaks
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.hidden = true;
        scene2.classList.remove('is-visible', 'is-active');
    }
    // Ensure game container is ready (hidden -> visible will be handled by SecretGame.start)
    // The game itself is outside #app so it covers everything with its own background
    setBackState('secret-game');
    // Small delay to let timeline fade begin, then start game (which also hides timeline)
    setTimeout(() => app.secretGame?.start(), 180);
}

function afterSecretGameReward() {
    if (app.cleaned) return;
    showFinalLoveLetter();
}

function showFinalLoveLetter({ restore = false, ending = false } = {}) {
    if (app.cleaned || !app.finalLoveLetter) return;
    hideInfiniteGarden();
    for (let i = 3; i <= 8; i++) {
        const scene = document.querySelector(`#scene-${i}`);
        if (scene) { scene.hidden = true; scene.classList.remove('is-visible', 'is-active'); }
    }
    app.finalLoveLetter.start({ restore, ending });
    setBackState('final-love-letter');
    window.scrollTo(0, 0);
}

/* The final garden remains isolated from the preceding epilogue. */
function showInfiniteGarden({ restore = false } = {}) {
    if (app.cleaned || !app.infiniteGarden) return;
    app.finalLoveLetter?.stop();

    const epilogue = document.querySelector('#scene-8');
    if (epilogue) {
        epilogue.hidden = true;
        epilogue.classList.remove('is-visible', 'is-active');
    }

    app.infiniteGarden.start({ restore });
    setBackState('infinite-garden');
    window.scrollTo(0, 0);
}

function hideInfiniteGarden({ returnToLetter = false } = {}) {
    if (!app.infiniteGarden) return;
    app.infiniteGarden.stop();

    if (returnToLetter) showFinalLoveLetter({ ending: true });
}

// This is a presentation restore, not a new game. Keep the outgoing letter
// on screen until the reward has been restored, so a stale/destroyed game
// controller can never leave the Back press looking like a no-op.
function returnToSecretGameReward() {
    let game = app.secretGame;

    try {
        if (!game || game.destroyed) {
            game = new SecretGame().init();
            game.onRewardContinue = () => afterSecretGameReward();
            game.onRewardShown = () => setBackState('reward');
            app.secretGame = game;
        }

        if (!game.restoreReward?.()) return false;

        app.infiniteGarden?.stop();
        app.finalLoveLetter?.stop();
        setBackState('reward');
        window.scrollTo(0, 0);
        return true;
    } catch (error) {
        console.warn('Unable to restore the earned Secret Game reward.', error);
        return false;
    }
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
     'birthday-letter' long Happy Birthday letter - Back -> date gate
     'birthday-reveal' final: title + live age + continue
     'memory-landing'  Our Memories landing (Preview only, no global Back)
     'memory'          inside a memory chapter (Preview/Next only)
     'post-memory'     end-of-lane celebration (NEW BEGINNING only, no Back)
     'timeline'        Our Timeline (Har pal, ek kahani) - Back -> post-memory
     'secret-game'     THE SECRET OF US intro/levels - Back -> timeline
     'reward'          Game Reward (envelope) - Back -> secret-game
     'post-reward'     Reward handoff / Special Message - Back -> timeline

    Visibility rule: the Back button is VISIBLE on 'love-letter',
    'birthday-letter', and 'birthday-reveal'
    (Back -> open letter), 'memory-landing' (Our Memory → Back to birthday-reveal),
    'timeline' (Back -> post-memory), 'secret-game' (Back -> timeline),
    'reward' and 'post-reward'.
    It stays HIDDEN on 'post-memory' (Preview owns final navigation),
    on Love Letter gate, countdown, and inside memory chapters.
    Never history.back(), never a reload - main.js decides
   what "back" means for the current state.
   ============================================================ */

/** Only these states ever make the Back button visible */
function backButtonVisible(state) {
    return (
        state === 'love-letter' ||
        state === 'birthday-letter' ||
        state === 'birthday-reveal' ||
        state === 'memory-landing' ||
        state === 'post-memory-message' ||
        state === 'timeline' ||
        state === 'secret-game' ||
        state === 'reward' ||
        state === 'post-reward' ||
        state === 'final-love-letter' ||
        state === 'infinite-garden'
    );
}

function setBackState(state) {
    if (app.cleaned) return;
    app.backState = state;
    app.backBtn?.setVisible(backButtonVisible(state));
    saveExperienceState();
    savePostMemoryCheckpointForState(state);
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
        // The long Happy Birthday letter returns to the date gate.
        app.revealStage = 'letter';
        setBackState('birthday-letter');
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

    if (app.backState === 'love-letter') {
        // Date gate -> the true first main page (#entry-lock). This only
        // resets the transient opening/entry scenes; later experience
        // progress remains untouched.
        app.opening?.reset();
        const host = document.querySelector('#loading-screen');
        if (host) {
            host.hidden = false;
            host.classList.add('is-lettering');
            host.classList.remove('is-leaving');
        }
        const entry = app.entryLock;
        if (entry) {
            entry.cleanup();
            entry.started = false;
            entry.finished = false;
            entry.busy = false;
            entry.currentScene = 0;
            entry.overlay?.classList.remove('is-visible', 'is-leaving');
            if (entry.overlay) entry.overlay.hidden = true;
        }
        setBackState('none');
        try { window.localStorage.removeItem(STATE_KEY); } catch {}
        entry?.start();
        return;
    }

    if (app.backState === 'birthday-letter') {
        // Long Happy Birthday letter -> clean, reusable date gate.
        app.revealRun += 1;
        app.revealStarted = false;
        app.revealStage = 'none';
        await app.birthdayReveal?.cancel();
        if (app.cleaned) return;
        app.opening?.restoreLetterGate();
        return;
    }

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
        // Also hide timeline/game if they were somehow visible
        try { app.secretGame?.destroy(); } catch {}
        const tl = document.querySelector('#our-timeline');
        if (tl) { tl.hidden = true; tl.classList.remove('is-visible'); }
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

    if (app.backState === 'post-memory-message') {
        // Back from the post-memory cinematic page -> clean Our Memories start.
        // This only changes navigation position; the post-memory checkpoint stays.
        const msg = document.querySelector('#post-memory-message');
        app.postMemoryRun += 1;
        if (msg) { msg.hidden = true; msg.classList.remove('is-visible', 'is-entered', 'is-restored'); }
        const scene2 = document.querySelector('#scene-2');
        if (scene2) {
            scene2.hidden = false;
            scene2.classList.add('is-visible', 'is-active');
        }
        app.memoryOpened = true;
        app.memoryLane?.enter();
        setBackState('memory-landing');
        return;
    }

    if (app.backState === 'timeline') {
        // Back from Our Timeline -> post-memory-message (if it exists) else post-memory
        const tl = document.querySelector('#our-timeline');
        if (tl) { tl.hidden = true; tl.classList.remove('is-visible'); }
        const msg = document.querySelector('#post-memory-message');
        // Prefer returning to the cinematic post-memory message if it was the previous step
        if (msg) {
            msg.hidden = false;
            void msg.offsetWidth;
            msg.classList.add('is-visible');
            setBackState('post-memory-message');
            return;
        }
        // Fallback to Memory Final
        const scene2 = document.querySelector('#scene-2');
        if (scene2) {
            scene2.hidden = false;
            scene2.classList.add('is-visible', 'is-active');
        }
        app.memoryLane?.onState?.('final');
        setBackState('post-memory');
        return;
    }

    if (app.backState === 'secret-game') {
        // In-game Back is level navigation, not a game reset. Only
        // Level 1 falls through to the existing timeline destination.
        if (app.secretGame?.back()) return;

        // Back from Game 1 -> return to the "After all these
        // memories..." page (the step that now leads into the game).
        try { app.secretGame?.destroy(); } catch {}
        app.secretGame = new SecretGame().init();
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
        showPostMemoryMessage();
        return;
    }

    if (app.backState === 'reward') {
        // Reward Back restores the completed Secret Game stage; it never
        // resets the game or sends the visitor to an earlier experience scene.
        if (app.secretGame?.back()) setBackState('secret-game');
        return;
    }

    if (app.backState === 'post-reward') {
        // Legacy saved state: route it into the replacement final letter.
        showFinalLoveLetter({ restore: true });
        return;
    }

    if (app.backState === 'final-love-letter') {
        returnToSecretGameReward();
        return;
    }

    if (app.backState === 'infinite-garden') {
        // Return to the final letter at its closing, not an earlier scene.
        hideInfiniteGarden({ returnToLetter: true });
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
const RESTORABLE_SCENES = new Set([
    'love-letter',
    'love-message',
    'countdown',
    'birthday-letter',
    'birthday-reveal',
    'memory-landing',
    'memory',
    'timeline',
    'secret-game',
    'post-reward',
    'final-love-letter',
    'infinite-garden',
]);

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

const POST_MEMORY_STATE_KEY = 'hbm.postMemoryProgress';
const POST_MEMORY_STATE_VERSION = 1;

/** Scenes that can be restored after a refresh. 'none' (loading /
     opening story) intentionally restarts fresh, and 'post-memory'
     (end-of-lane celebration / future sections) restores into the
     lane intro instead - the snapshot keeps the last restorable
     state, exactly like a mid-chapter refresh.
     Timeline and post-reward are also restorable so a refresh
     inside the game flow never loses the place. */
const POST_MEMORY_CHECKPOINTS = new Set([
    'post-memory-final',
    'timeline',
    'secret-game',
    'post-reward',
    'final-love-letter',
    'infinite-garden',
]);

/** Persist only stable checkpoints reached after the Memory Lane handoff. */
function savePostMemoryState(stage) {
    if (!POST_MEMORY_CHECKPOINTS.has(stage)) return;
    try {
        window.localStorage.setItem(POST_MEMORY_STATE_KEY, JSON.stringify({
            version: POST_MEMORY_STATE_VERSION,
            enteredPostMemory: true,
            currentStage: stage,
            timestamp: Date.now(),
        }));
    } catch {
        /* Storage unavailable (privacy mode) - best effort */
    }
}

/** Read + validate the post-memory checkpoint; null preserves original startup. */
function loadPostMemoryState() {
    try {
        const raw = window.localStorage.getItem(POST_MEMORY_STATE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.version !== POST_MEMORY_STATE_VERSION) return null;
        if (data.enteredPostMemory !== true) return null;
        if (!Number.isFinite(data.timestamp)) return null;
        if (!POST_MEMORY_CHECKPOINTS.has(data.currentStage)) return null;
        return data.currentStage;
    } catch {
        return null;
    }
}

/** Bring the user back to the scene they were in before the
    refresh, using only existing scene functions. Runs INSTEAD of
    the opening on that visit; the next full visit starts fresh. */
function restorePostMemoryExperience(stage) {
    // The tap-to-begin fallback must never interrupt a restored
    // scene - a refresh is not a first visit.
    const tap = document.querySelector('#tap-to-begin');
    if (tap) tap.hidden = true;

    // Everything in this branch is post-boundary, so the loading scene
    // must never replay over the restored stable screen.
    app.loading?.exitToApp(true);

    if (stage === 'post-memory-final') {
        showPostMemoryMessage({ animate: false });
    } else if (stage === 'timeline') {
        showTimelineScene();
    } else if (stage === 'secret-game') {
        hideTimelineForGame();
    } else if (stage === 'post-reward') {
        showFinalLoveLetter({ restore: true });
    } else if (stage === 'final-love-letter') {
        showFinalLoveLetter({ restore: true });
    } else if (stage === 'infinite-garden') {
        showInfiniteGarden({ restore: true });
    }
}

/** Existing pre-boundary restore flow. A valid post-memory checkpoint is
    always checked first, so this never displaces the new boundary state. */
function restoreExperience(scene) {
    const tap = document.querySelector('#tap-to-begin');
    if (tap) tap.hidden = true;

    if (scene === 'love-letter') {
        if (app.opening) {
            app.loading?.complete();
            if (tap) tap.hidden = true;
            app.opening.restoreLetterGate();
        } else {
            startReveal();
        }
        return;
    }

    app.loading?.exitToApp(true);

    if (scene === 'countdown' || scene === 'love-message' || scene === 'birthday-letter') {
        startReveal();
    } else if (scene === 'birthday-reveal') {
        app.revealStarted = true;
        const run = (app.revealRun += 1);
        Promise.resolve(app.birthdayReveal?.showFinal()).then(() => {
            if (app.cleaned || run !== app.revealRun) return;
            openMemoryScene();
        });
    } else if (scene === 'memory' || scene === 'memory-landing') {
        openMemoryScene();
    } else if (scene === 'timeline') {
        openMemoryScene();
        setTimeout(() => showPostMemoryMessage(), 320);
    } else if (scene === 'secret-game' || scene === 'post-reward') {
        openMemoryScene();
        setTimeout(() => showPostMemoryMessage(), 320);
    } else if (scene === 'final-love-letter') {
        showFinalLoveLetter({ restore: true });
    } else if (scene === 'infinite-garden') {
        showInfiniteGarden({ restore: true });
    }
}

/** Keep navigation position separate from completion: moving Back to
    Our Memories never overwrites a previously earned post-memory stage. */
function savePostMemoryCheckpointForState(state) {
    const stageByState = {
        'post-memory-message': 'post-memory-final',
        timeline: 'timeline',
        'secret-game': 'secret-game',
        'post-reward': 'post-reward',
        'final-love-letter': 'final-love-letter',
        'infinite-garden': 'infinite-garden',
    };
    const stage = stageByState[state];
    if (stage) savePostMemoryState(stage);
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
   Music resume after refresh (saved preference = ON)
   ------------------------------------------------------------
   The AudioManager already restores volume/mute preferences, but
   browsers block playback until a user gesture - so after a
   refresh the music stayed silent even though the preference was
   ON. This wires ONE self-removing capture-phase listener set:
   the earliest existing user interaction retries play() exactly
   once per gesture until the saved track is audible. No new
   button, no second audio element, no autoplay hack - when the
   preference is OFF or music already plays, it stands down.
   ============================================================ */

function wireMusicResumeOnGesture() {
    if (!app.audio) return;

    // If saved preference is OFF, never auto-start - stay silent
    if (app.audio.muted) return;

    const EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
    let detached = false;

    const detach = () => {
        if (detached) return;
        detached = true;
        for (const type of EVENTS) {
            document.removeEventListener(type, onGesture, true);
            window.removeEventListener(type, onGesture, true);
        }
    };

    const onGesture = async () => {
        const audio = app.audio;
        if (!audio) { detach(); return; }

        // Re-evaluate preference on each gesture (user may have toggled)
        if (audio.muted) { detach(); return; }
        if (audio.isPlaying()) { detach(); return; }
        // Extra guard: element may be paused but AudioManager thinks not
        if (audio.audio && !audio.audio.paused && !audio.audio.ended) { detach(); return; }

        try {
            const started = await audio.play();
            if (started) {
                detach();
            }
            // If blocked, keep listeners so the next gesture retries
        } catch {
            // Keep attached for next gesture
        }
    };

    for (const type of EVENTS) {
        document.addEventListener(type, onGesture, { capture: true });
        window.addEventListener(type, onGesture, { capture: true });
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

    stopInactivityTracking();

    window.removeEventListener(BEGIN_EVENT, beginExperience);

    try { app.memoryLane?.destroy(); } catch { /* ignore */ }
    app.memoryLane = null;

    try { app.opening?.destroy(); } catch { /* ignore */ }
    app.opening = null;

    try { app.birthdayReveal?.destroy?.(); } catch { /* ignore */ }
    app.birthdayReveal = null;

    try { app.secretGame?.destroy(); } catch { /* ignore */ }
    app.secretGame = null;

    try { app.infiniteGarden?.destroy(); } catch { /* ignore */ }
    app.infiniteGarden = null;

    try { app.finalLoveLetter?.destroy(); } catch { /* ignore */ }
    app.finalLoveLetter = null;

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
   Centralized restart mechanism
   ------------------------------------------------------------
   Single source of truth for restarting the entire experience
   from the beginning. Can be called from:
   - Memory Lane start navigation (Level 1, with confirmation)
   - Final "Experience Again" button (Level 2, no confirmation)
   ------------------------------------------------------------ */
async function restartExperience() {
    if (app.cleaned) return;

    stopInactivityTracking();
    app.passwordVerifiedThisSession = false;

    // 1. Invalidate any running reveal run so stale callbacks
    //    can never re-open Memory Lane behind the restart.
    app.revealRun += 1;

    // 2. Reset Memory Lane to its initial state (intro).
    //    This clears all timers, clears chapter state, hides
    //    the chapter, shows the intro, and fires 'intro' state.
    app.memoryLane?.reset();
    hideInfiniteGarden();
    app.finalLoveLetter?.stop();

    // 3. Hide Memory Lane scene completely.
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.hidden = true;
        scene2.classList.remove('is-visible', 'is-active');
    }

    // 4. Hide any post-Memory-Lane scenes (celebration, epilogue, etc.).
    for (let i = 3; i <= 8; i++) {
        const scene = document.querySelector(`#scene-${i}`);
        if (scene) {
            scene.hidden = true;
            scene.classList.remove('is-visible', 'is-active');
        }
    }

    // 5. Hide the final CTA if it's showing.
    const memoryFinal = document.querySelector('#memory-final');
    if (memoryFinal) {
        memoryFinal.hidden = true;
        memoryFinal.classList.remove('memory-final-in');
    }

    // 6. Hide the Memory Lane intro back button.
    const memoryBackIntro = document.querySelector('#memory-back-intro');
    if (memoryBackIntro) {
        memoryBackIntro.hidden = true;
        memoryBackIntro.classList.remove('is-visible');
    }

    // 7. Hide the global experience back button.
    app.backBtn?.setVisible(false);

    // 8. Reset reveal state so the experience starts fresh.
    app.revealStarted = false;
    app.revealStage = 'none';
    app.memoryOpened = false;

    // 8b. Reset Secret Game and Timeline
    try { app.secretGame?.destroy(); } catch {}
    try {
        app.secretGame = new SecretGame().init();
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
    } catch {}
    const tl = document.querySelector('#our-timeline');
    if (tl) { tl.hidden = true; tl.classList.remove('is-visible'); }
    const sg = document.querySelector('#secret-game');
    if (sg) { sg.hidden = true; sg.classList.remove('is-visible', 'is-leaving'); }

    // 9. Cancel any running reveal safely.
    await app.birthdayReveal?.cancel();

    // 9b. Reset Memory Lane opened flag so it can be entered again.
    app.memoryOpened = false;

    // 10. Clear the persisted experience state so a refresh
    //     also starts fresh.
    try {
        window.localStorage.removeItem(STATE_KEY);
        window.localStorage.removeItem(POST_MEMORY_STATE_KEY);
    } catch { /* ignore */ }

    // 11. Hide the #app container at the beginning (it will be shown after loading/opening handoff).
    const appEl = document.querySelector('#app');
    if (appEl) {
        appEl.hidden = true;
    }

    // 12. Show the loading screen for the beginning scene.
    const loadingScreen = document.querySelector('#loading-screen');
    if (loadingScreen) {
        loadingScreen.hidden = false;
        loadingScreen.classList.remove('is-leaving', 'is-lettering');
    }

    // 13. Hide the tap-to-begin fallback if it exists (will be re-shown by loading completion if needed).
    const tapToBegin = document.querySelector('#tap-to-begin');
    if (tapToBegin) {
        tapToBegin.hidden = true;
    }

    // 14. Reset opening layer - it will be shown by app.opening.reset()/start().
    // Do not hide it here with leftover classes; let reset handle it.
    const openingLayer = document.querySelector('.opening-cinematic');
    if (openingLayer) {
        openingLayer.classList.remove('is-visible', 'is-leaving');
        // keep hidden until reset/start shows it
        openingLayer.hidden = true;
    }

    // 15. Scroll to top to ensure clean slate.
    window.scrollTo(0, 0);

    // 16. Fire the 'none' back state so the global back button
    //     is hidden (we're at the true beginning).
    setBackState('none');

    // 17. Start from the very beginning - entry lock (which hands over to
    //     question lock then opening). Reset entry/question/opening so they
    //     can start again even after a prior run.
    //     Do not hide the loading screen with leftover is-leaving/is-lettering.
    const loadingEl = document.querySelector('#loading-screen');
    if (loadingEl) {
        loadingEl.hidden = false;
        loadingEl.classList.remove('is-leaving', 'is-lettering');
        loadingEl.removeAttribute('aria-hidden');
    }
    // Reset entry-lock if it was finished
    if (app.entryLock) {
        try { app.entryLock.cleanup(); } catch {}
        app.entryLock.started = false;
        app.entryLock.finished = false;
        app.entryLock.busy = false;
        app.entryLock.currentScene = 0;
        // Ensure overlay is ready to show again
        const entryOverlay = document.querySelector('#entry-lock');
        if (entryOverlay) {
            entryOverlay.hidden = true;
            entryOverlay.classList.remove('is-visible', 'is-leaving');
        }
    }
    if (app.questionLock) {
        try { app.questionLock.cleanup?.(); } catch {}
        // question-lock cleanup will reset its state; ensure overlay hidden
        const qOverlay = document.querySelector('#question-lock');
        if (qOverlay) {
            qOverlay.hidden = true;
            qOverlay.classList.remove('is-visible', 'is-leaving');
        }
        // Reset internal flags if they exist
        if ('started' in app.questionLock) app.questionLock.started = false;
        if ('finished' in app.questionLock) app.questionLock.finished = false;
        if ('unlocked' in app.questionLock) app.questionLock.unlocked = false;
    }
    if (app.opening) {
        try { app.opening.cleanup(); } catch {}
        app.opening.started = false;
        app.opening.finished = false;
        app.opening.busy = false;
        app.opening.state = 'idle';
    }
    // Ensure loading progress is reset and tap-to-begin hidden (entry will handle)
    app.loading?.complete?.();
    const tapBtn2 = document.querySelector('#tap-to-begin');
    if (tapBtn2) tapBtn2.hidden = true;
    if (loadingEl) loadingEl.classList.add('is-lettering');

    if (app.entryLock) {
        app.entryLock.start();
    } else if (app.opening) {
        app.opening.reset();
        app.opening.start();
    } else {
        startReveal();
    }
}

/* ============================================================
   Level 1: Memory Lane Start - Restart Confirmation
   ------------------------------------------------------------
   Shows a premium confirmation dialog when the user taps
   "Return to Beginning" at the Memory Lane intro.
   ============================================================ */
function showRestartConfirmation() {
    // Create premium confirmation overlay
    const overlay = document.createElement('div');
    overlay.className = 'restart-confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'restart-confirm-title');
    overlay.innerHTML = `
        <div class="restart-confirm-backdrop" aria-hidden="true"></div>
        <div class="restart-confirm-dialog" role="document">
            <div class="restart-confirm-glow" aria-hidden="true"></div>
            <h2 id="restart-confirm-title" class="restart-confirm-title">Return to Beginning?</h2>
            <p class="restart-confirm-message">
                This will take you back to the very beginning of the experience.
                Your progress in Memory Lane will be preserved, but you'll start
                from the opening again.
            </p>
            <div class="restart-confirm-actions">
                <button type="button" class="restart-confirm-btn restart-confirm-cancel" aria-label="Cancel, stay here">
                    <span>Stay Here</span>
                </button>
                <button type="button" class="restart-confirm-btn restart-confirm-confirm" aria-label="Confirm, return to beginning">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"></path>
                        <path d="M3 12h6M9 18l-6-6 6-6"></path>
                    </svg>
                    <span>Return to Beginning</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Force reflow then animate in
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');

    const cancelBtn = overlay.querySelector('.restart-confirm-cancel');
    const confirmBtn = overlay.querySelector('.restart-confirm-confirm');
    const backdrop = overlay.querySelector('.restart-confirm-backdrop');

    const close = (confirmed) => {
        overlay.classList.remove('is-visible');
        overlay.addEventListener('transitionend', () => {
            overlay.remove();
        }, { once: true });
        if (confirmed) {
            restartExperience();
        }
    };

    cancelBtn?.addEventListener('click', () => close(false));
    confirmBtn?.addEventListener('click', () => close(true));
    backdrop?.addEventListener('click', () => close(false));

    // ESC key to cancel
    const onKey = (e) => {
        if (e.key === 'Escape') {
            close(false);
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);
}

/* ============================================================
   Boot - wait for the DOM, then init once
   ============================================================ */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
    initApp();
}
