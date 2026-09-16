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
import { ParticleCountdown } from './particle-countdown.js';
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
    countdown: null,      // Separate cinematic countdown before celebration
    secretGame: null,     // SecretGame instance (THE SECRET OF US)
    infiniteGarden: null, // InfiniteGarden instance (final interactive scene)
    finalLoveLetter: null,// FinalLoveLetter instance
    backBtn: null,        // BackButton instance (global UI-only control)
    backState: 'none',    // 'none' | 'love-letter' | 'love-message' |
                          // 'countdown' | 'birthday-letter' | 'birthday-reveal' |
                          // 'memory-landing' | 'memory' | 'post-memory-message' |
                          // 'secret-game' | 'reward' | 'final-love-letter' | 'infinite-garden'
    revealStage: 'none',  // last reveal stage reported by BirthdayReveal
    revealRun: 0,         // reveal run id - bumped to invalidate stale callbacks
    memoryOpened: false,  // true once the surprise scene is on screen
    memoryTransition: false, // true only while Birthday -> Memory is being prepared
    pendingMemoryStage: null, // lane stage reported before the handoff is committed
    postMemoryRun: 0,     // invalidates post-memory handoff timers
    revealStarted: false, // true once the birthday reveal has been triggered
    effectsStarted: false,// true once background effects run
    audioInitialized: false, // true once AudioManager is created
    cleaned: false,       // true once cleanup() has run
    passwordVerifiedThisSession: false, // never persisted; reset whenever #question-lock is shown
    inactivityTimer: null,
    lastActivityAt: 0,
    inactivityListenersAttached: false,
    inactivityActivityEvents: [],
    inactivityUsesScrollListener: false,
    inactivityLoggingOut: false,
    inactivityRescheduleFrame: null,
    resumeAfterInactivity: false,
    securityHiddenAt: 0,
    mobileBackgroundStartedAt: 0,
    securityLocking: false,
    requiresSecureResume: false,
    mobileSecurityDevice: false,
    mobileSecurityActive: false,
    mobileSecurityListenersAttached: false,
    mobileSecurityHeartbeat: null,
    lastHeartbeatAt: 0,
    navigationRun: 0,
    navigationTimers: new Set(),
};

// Desktop keeps the established eight-minute timeout. Mobile protected
// sessions deliberately use the exact two-minute requirement below.
const DESKTOP_INACTIVITY_TIMEOUT_MS = 480000;
const MOBILE_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;
const MOBILE_HEARTBEAT_MS = 1000;
const MOBILE_BACKGROUND_GRACE_MS = 60 * 1000;
const MOBILE_INACTIVITY_ACTIVITY_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'click'];
const DESKTOP_INACTIVITY_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel'];
const SECURITY_LOCK_KEY = 'hbm.securityLock';
const SECURITY_LOCK_VERSION = 1;

function detectMobileSecurityDevice() {
    const userAgent = navigator.userAgent || '';
    const userAgentMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
    const userAgentDataMobile = navigator.userAgentData?.mobile === true;
    const touchPoints = Number(navigator.maxTouchPoints) || 0;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches === true;
    const narrowTouchViewport = touchPoints > 0 &&
        Math.min(window.innerWidth || Infinity, window.innerHeight || Infinity) <= 900;

    // The touch-only fallback is intentionally combined with a coarse pointer
    // or a narrow viewport, so ordinary desktop browsers do not enter strict
    // mobile mode merely because a touch display is connected.
    return userAgentDataMobile || userAgentMobile ||
        (touchPoints > 0 && coarsePointer) || narrowTouchViewport;
}

function isMobileProtectedSession() {
    return app.mobileSecurityDevice;
}

function inactivityTimeoutMs() {
    return isMobileProtectedSession()
        ? MOBILE_INACTIVITY_TIMEOUT_MS
        : DESKTOP_INACTIVITY_TIMEOUT_MS;
}

function loadSecurityLockState() {
    try {
        const raw = window.localStorage.getItem(SECURITY_LOCK_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.version !== SECURITY_LOCK_VERSION || data.requiresUnlock !== true) return null;
        return { hiddenAt: Number.isFinite(data.hiddenAt) ? data.hiddenAt : 0 };
    } catch {
        return null;
    }
}

function markSecurityLockRequired(hiddenAt = 0) {
    try {
        window.localStorage.setItem(SECURITY_LOCK_KEY, JSON.stringify({
            version: SECURITY_LOCK_VERSION,
            requiresUnlock: true,
            hiddenAt,
        }));
    } catch {
        /* Storage unavailable: the in-memory lock still protects this visit. */
    }
}

function clearSecurityLockState() {
    app.securityHiddenAt = 0;
    app.mobileBackgroundStartedAt = 0;
    app.securityLocking = false;
    app.requiresSecureResume = false;
    try {
        window.localStorage.removeItem(SECURITY_LOCK_KEY);
    } catch {
        /* Storage unavailable: nothing persisted to remove. */
    }
}

const DATE_GATE_STORAGE_KEY = 'hbm.dateGate.v1';

function invalidateNavigation() {
    app.navigationRun += 1;
    for (const timer of app.navigationTimers) clearTimeout(timer);
    app.navigationTimers.clear();
    // A navigation change cancels a pending Birthday -> Memory preparation.
    // The async handoff verifies navigationRun before it can commit later.
    app.memoryTransition = false;
    app.pendingMemoryStage = null;
    return app.navigationRun;
}

function laterForNavigation(ms, callback, run = app.navigationRun) {
    const timer = window.setTimeout(() => {
        app.navigationTimers.delete(timer);
        if (app.cleaned || run !== app.navigationRun) return;
        callback();
    }, ms);
    app.navigationTimers.add(timer);
    return timer;
}

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
    invalidateNavigation();
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

function isProtectedMobileSession() {
    return isMobileProtectedSession() && app.mobileSecurityActive &&
        app.passwordVerifiedThisSession && !app.inactivityLoggingOut;
}

function beginMobileBackgroundGrace() {
    if (!isProtectedMobileSession() || app.mobileBackgroundStartedAt) return;
    // This marker intentionally lives only in memory. A refresh must never
    // turn a partial background interval into a persisted security lock.
    app.mobileBackgroundStartedAt = Date.now();
}

function checkMobileSecurityBeforeResume(reason) {
    if (!isProtectedMobileSession()) return false;
    const persisted = loadSecurityLockState();
    if (persisted || app.requiresSecureResume) {
        triggerSecurityLock(reason);
        return true;
    }

    const startedAt = app.mobileBackgroundStartedAt;
    if (!startedAt) return false;
    const elapsed = Math.max(0, Date.now() - startedAt);
    app.mobileBackgroundStartedAt = 0;
    app.lastHeartbeatAt = Date.now();
    if (elapsed < MOBILE_BACKGROUND_GRACE_MS) {
        // If a browser let the visible inactivity timer elapse while hidden,
        // restart it now from the existing visible-activity timestamp.
        scheduleInactivityLogout();
        return false;
    }

    // Only a completed 60-second grace interval creates the normal
    // persisted lock. The current route snapshot is saved by the lock path.
    app.securityHiddenAt = startedAt;
    triggerSecurityLock(reason);
    return true;
}

function recordInactivityActivity(event) {
    if (!app.passwordVerifiedThisSession || app.inactivityLoggingOut || document.hidden) return;

    // Capture-phase mobile activity must check for a suspended/hidden session
    // before the first post-wake tap can reach a protected scene.
    if (isMobileProtectedSession() && checkMobileSecurityBeforeResume('first-interaction')) {
        if (event?.cancelable) event.preventDefault();
        event?.stopImmediatePropagation?.();
        return;
    }

    app.lastActivityAt = Date.now();
    if (app.inactivityRescheduleFrame != null) return;
    app.inactivityRescheduleFrame = requestAnimationFrame(() => {
        app.inactivityRescheduleFrame = null;
        scheduleInactivityLogout();
    });
}

function scheduleInactivityLogout() {
    if (!app.passwordVerifiedThisSession || app.inactivityLoggingOut) return;
    if (app.inactivityTimer != null) clearTimeout(app.inactivityTimer);

    // On mobile, hidden time is owned by the 60-second background rule,
    // never by the visible inactivity timer.
    if (isMobileProtectedSession() && document.hidden) return;
    const remaining = inactivityTimeoutMs() - (Date.now() - app.lastActivityAt);
    if (remaining <= 0) {
        triggerSecurityLock('inactivity');
        return;
    }
    app.inactivityTimer = window.setTimeout(() => {
        app.inactivityTimer = null;
        if (Date.now() - app.lastActivityAt >= inactivityTimeoutMs()) {
            triggerSecurityLock('inactivity');
        } else {
            scheduleInactivityLogout();
        }
    }, remaining);
}

function handleMobileVisibilityChange() {
    if (!isProtectedMobileSession()) return;
    if (document.visibilityState === 'hidden') {
        beginMobileBackgroundGrace();
    } else {
        checkMobileSecurityBeforeResume('visibility-resume');
    }
}

function handleMobileBlur() {
    beginMobileBackgroundGrace();
}

function handleMobileFocus() {
    checkMobileSecurityBeforeResume('focus-resume');
}

function handleMobilePageShow() {
    checkMobileSecurityBeforeResume('pageshow');
}

function handleMobileFreeze() {
    beginMobileBackgroundGrace();
}

function handleMobileResume() {
    checkMobileSecurityBeforeResume('resume');
}

function handleDesktopVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleInactivityLogout();
}

function runMobileSecurityHeartbeat() {
    if (!isProtectedMobileSession()) return;
    const now = Date.now();
    const gap = now - app.lastHeartbeatAt;
    // A delayed timer is bookkeeping only. If the page was backgrounded,
    // resume handlers apply the same real-time 60-second grace rule.
    if (gap < 0 || gap >= MOBILE_BACKGROUND_GRACE_MS) {
        checkMobileSecurityBeforeResume('suspension-gap');
    }
    app.lastHeartbeatAt = now;
}

function installMobileSecurityListeners() {
    if (!isMobileProtectedSession() || app.mobileSecurityListenersAttached) return;
    for (const eventName of MOBILE_INACTIVITY_ACTIVITY_EVENTS) {
        window.addEventListener(eventName, recordInactivityActivity, { capture: true, passive: false });
    }
    document.addEventListener('visibilitychange', handleMobileVisibilityChange);
    window.addEventListener('blur', handleMobileBlur);
    window.addEventListener('focus', handleMobileFocus);
    window.addEventListener('pageshow', handleMobilePageShow);
    document.addEventListener('freeze', handleMobileFreeze);
    document.addEventListener('resume', handleMobileResume);
    app.mobileSecurityListenersAttached = true;
}

function removeMobileSecurityListeners() {
    if (!app.mobileSecurityListenersAttached) return;
    for (const eventName of MOBILE_INACTIVITY_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, recordInactivityActivity, true);
    }
    document.removeEventListener('visibilitychange', handleMobileVisibilityChange);
    window.removeEventListener('blur', handleMobileBlur);
    window.removeEventListener('focus', handleMobileFocus);
    window.removeEventListener('pageshow', handleMobilePageShow);
    document.removeEventListener('freeze', handleMobileFreeze);
    document.removeEventListener('resume', handleMobileResume);
    app.mobileSecurityListenersAttached = false;
}

function startMobileSecurityHeartbeat() {
    if (!isProtectedMobileSession()) return;
    if (app.mobileSecurityHeartbeat != null) clearInterval(app.mobileSecurityHeartbeat);
    app.lastHeartbeatAt = Date.now();
    app.mobileSecurityHeartbeat = window.setInterval(runMobileSecurityHeartbeat, MOBILE_HEARTBEAT_MS);
}

function stopMobileSecurityHeartbeat() {
    if (app.mobileSecurityHeartbeat != null) clearInterval(app.mobileSecurityHeartbeat);
    app.mobileSecurityHeartbeat = null;
    app.lastHeartbeatAt = 0;
}

function startInactivityTracking() {
    if (app.cleaned || !app.passwordVerifiedThisSession) return;
    app.inactivityLoggingOut = false;
    app.lastActivityAt = Date.now();

    if (isMobileProtectedSession()) {
        app.mobileSecurityActive = true;
        installMobileSecurityListeners();
        startMobileSecurityHeartbeat();
    } else if (!app.inactivityListenersAttached) {
        app.inactivityActivityEvents = DESKTOP_INACTIVITY_ACTIVITY_EVENTS;
        for (const eventName of app.inactivityActivityEvents) {
            if (eventName !== 'scroll') window.addEventListener(eventName, recordInactivityActivity, { passive: true });
        }
        document.addEventListener('scroll', recordInactivityActivity, { passive: true, capture: true });
        document.addEventListener('visibilitychange', handleDesktopVisibilityChange);
        app.inactivityUsesScrollListener = true;
        app.inactivityListenersAttached = true;
    }
    scheduleInactivityLogout();
}

function stopInactivityTracking() {
    if (app.inactivityRescheduleFrame != null) cancelAnimationFrame(app.inactivityRescheduleFrame);
    app.inactivityRescheduleFrame = null;
    if (app.inactivityTimer != null) clearTimeout(app.inactivityTimer);
    app.inactivityTimer = null;

    stopMobileSecurityHeartbeat();
    removeMobileSecurityListeners();
    app.mobileSecurityActive = false;

    if (app.inactivityListenersAttached) {
        for (const eventName of app.inactivityActivityEvents) {
            if (eventName !== 'scroll') window.removeEventListener(eventName, recordInactivityActivity);
        }
        if (app.inactivityUsesScrollListener) document.removeEventListener('scroll', recordInactivityActivity, true);
        document.removeEventListener('visibilitychange', handleDesktopVisibilityChange);
        app.inactivityListenersAttached = false;
    }
    app.inactivityActivityEvents = [];
    app.inactivityUsesScrollListener = false;
    app.lastActivityAt = 0;
}

function clearJourneyProgressForRestart() {
    try {
        window.localStorage.removeItem(STATE_KEY);
        window.localStorage.removeItem(POST_MEMORY_STATE_KEY);
        window.localStorage.removeItem('hbm.secretGameProgress');
        window.localStorage.removeItem('hbm.memoryProgress');
        window.localStorage.removeItem('hbm.memoryReadState');
        window.localStorage.removeItem('hbm.finalLetterProgress');
        window.localStorage.removeItem('hbm.infiniteGardenProgress');
        // A full journey restart returns to the actual opening/date gate;
        // this key only enables the completed-gate early skip.
        window.localStorage.removeItem(DATE_GATE_STORAGE_KEY);
    } catch {
        /* Storage unavailable: the runtime reset still applies. */
    }
}

function triggerSecurityLock(reason, stateAlreadySaved = false) {
    if (app.securityLocking || app.inactivityLoggingOut || !app.passwordVerifiedThisSession) return;
    app.securityLocking = true;
    app.inactivityLoggingOut = true;
    invalidateNavigation();

    // Freeze the stable route before controller teardown. The lock is
    // intentionally non-destructive: successful re-entry restores this
    // snapshot and the existing game/memory progress records.
    if (!stateAlreadySaved) saveExperienceState();
    app.resumeAfterInactivity = !!loadExperienceState();
    if (isMobileProtectedSession()) app.requiresSecureResume = true;
    // This is the only path that persists a security lock: visible
    // inactivity or a completed 60-second mobile background grace.
    markSecurityLockRequired(app.securityHiddenAt || Date.now());
    stopInactivityTracking();

    // Invalidate callbacks before hiding live protected views. Individual
    // progress keys and audio preferences are deliberately not cleared.
    app.revealRun += 1;
    app.postMemoryRun += 1;
    try { app.countdown?.stop?.(); } catch {}
    try { void app.birthdayReveal?.cancel?.(); } catch {}
    try { app.opening?.reset?.(); } catch {}
    try { app.memoryLane?.reset?.({ persist: false }); } catch {}
    try { app.finalLoveLetter?.stop?.(); } catch {}
    try { app.infiniteGarden?.stop?.(); } catch {}
    try { app.secretGame?.destroy?.(); } catch {}

    try {
        app.secretGame = new SecretGame().init();
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
        app.secretGame.onRewardPhaseChange = () => {
            if (app.backState === 'reward') saveExperienceState();
        };
    } catch (error) {
        console.warn('Unable to reset Secret Game during inactivity logout.', error);
    }

    for (const selector of ['#scene-2', '#post-memory-message', '#secret-game']) {
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
    // A persisted security lock is checked before the normal refresh-route
    // restoration below, so reloading a locked experience never exposes its
    // protected snapshot.
    const persistedSecurityLock = loadSecurityLockState();
    app.mobileSecurityDevice = detectMobileSecurityDevice();
    app.resumeAfterInactivity = !!persistedSecurityLock;
    app.securityHiddenAt = persistedSecurityLock?.hiddenAt || 0;
    app.requiresSecureResume = !!persistedSecurityLock;

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
    // the scene: 'intro' is the Our Memories landing (Back visible).
    // Every chapter stage, including the end-of-lane celebration, keeps
    // the global button hidden - the lane owns its own Back/Next controls.
    app.memoryLane.onState = (stage) => {
        if (app.cleaned || app.inactivityLoggingOut) return;
        // enter()/restoreCurrentPosition() reports synchronously. Do not
        // persist a Memory route until its scene has actually been activated.
        if (app.memoryTransition) {
            app.pendingMemoryStage = stage;
            return;
        }
        if (stage === 'intro') {
            setBackState('memory-landing');
        } else if (stage === 'final') {
            // The end-of-lane page is still a Memory Lane subscene.  Keep
            // its route as `memory` so refresh can restore the saved final
            // entry instead of skipping ahead to the post-memory message.
            setBackState('memory');
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
    // of the forward flow - startSecretGame() hands control
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
        startSecretGame();
        const navigationRun = app.navigationRun;
        laterForNavigation(600, () => {
            if (msg && handoffRun === app.postMemoryRun && app.backState === 'secret-game') {
                msg.hidden = true;
            }
        }, navigationRun);
    });

    // 5b. THE SECRET OF US - independent cinematic game (after Memory Lane)
    try {
        app.secretGame = new SecretGame().init();
        // After the reward is fully read, hand over to future sections
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
        app.secretGame.onRewardPhaseChange = () => {
            if (app.backState === 'reward') saveExperienceState();
        };
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
            const resumeState = app.resumeAfterInactivity
                ? loadExperienceState()
                : null;
            app.resumeAfterInactivity = false;
            // Authentication has succeeded. Clear only security metadata and
            // stale timing flags, never the protected route snapshot.
            clearSecurityLockState();
            if (resumeState) {
                restoreExperience(resumeState);
            } else if (app.opening) {
                app.opening.start();
            }
            startInactivityTracking();
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
        // BirthdayReveal asks this guarded callback to prepare Memory Lane
        // before it fades its own layer. A false result keeps Live Age on
        // screen and re-arms Continue instead of ever exposing a blank scene.
        app.birthdayReveal.onForward = () => openMemoryScene();
        app.countdown = new ParticleCountdown();
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

    document.querySelector('#infinite-garden-reset')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        app.infiniteGarden?.reset();
    });

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

        const savedPostMemoryState = loadPostMemoryState();
        const savedExperienceState = loadExperienceState();
        // hbm.experienceState is the current route authority. The older
        // post-memory checkpoint is migration fallback data only and must
        // never override a valid current route such as Reward.
        if (app.resumeAfterInactivity) {
            showQuestionLock();
        } else if (savedExperienceState) {
            restoreExperience(savedExperienceState);
        } else if (savedPostMemoryState) {
            restorePostMemoryExperience(savedPostMemoryState.currentStage);
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

function startReveal({ forceCountdown = false } = {}) {
    if (app.cleaned || app.memoryOpened || app.revealStarted) return;
    app.revealStarted = true;
    const showLetter = !forceCountdown;
    app.revealStage = 'none';
    const run = (app.revealRun += 1);

    // Fire the begin flow (safe no-op once begun) so effects and
    // music are running even if no tap-to-begin was used.
    app.loading?.beginExperience();

    // The reveal lives inside #app. If the loading screen is still
    // finishing its own exit (tap-to-begin fallback path), #app may
    // be hidden for up to ~1s - never let the countdown run unseen.
    waitForAppVisible().then(async () => {
        if (showLetter) {
            await app.birthdayReveal?.play({ showLetter: true, letterOnly: true });
        }
        if (app.cleaned || run !== app.revealRun) return;
        updateBackState('countdown', run);
        if (!app.countdown) {
            console.error('[COUNTDOWN] runtime failure', new Error('Countdown controller is unavailable.'));
            return;
        }
        try {
            await app.countdown.play();
        } catch (error) {
            // A failed countdown must never silently advance to celebration.
            console.error('[COUNTDOWN] runtime failure', error);
            return;
        }
        if (app.cleaned || run !== app.revealRun) return;
        await app.birthdayReveal?.play();

        // BirthdayReveal's Continue callback performs the guarded handoff
        // before its own exit. This completion only confirms that run ended.
        if (app.cleaned || run !== app.revealRun) return;
    }).catch((error) => console.error('[FLOW] birthday handoff failed', error));
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

async function openMemoryScene({ restoreMemoryPosition = false } = {}) {
    if (app.cleaned) return false;
    if (app.memoryOpened) return true;
    if (app.memoryTransition) return false;

    const navigationRun = invalidateNavigation();
    app.memoryTransition = true;
    app.pendingMemoryStage = null;
    const scene2 = document.querySelector('#scene-2');
    const lane = app.memoryLane;

    try {
        if (!scene2 || !lane || typeof lane.enter !== 'function') {
            throw new Error('Memory Lane controller or scene is unavailable.');
        }

        // Prepare first. Its state hook is deliberately held until the root
        // is visibly active, so a failed initializer cannot persist `memory`.
        lane.enter({ restore: restoreMemoryPosition });
        if (restoreMemoryPosition) lane.restoreCurrentPosition?.();
        if (app.cleaned || navigationRun !== app.navigationRun) return false;

        scene2.hidden = false;
        scene2.removeAttribute('aria-hidden');
        scene2.classList.remove('is-leaving');
        scene2.classList.add('is-visible', 'is-active');

        app.memoryOpened = true;
        app.memoryTransition = false;
        const stage = app.pendingMemoryStage || lane.state;
        app.pendingMemoryStage = null;
        // Commit only after the scene has been prepared and activated.
        setBackState(stage === 'intro' ? 'memory-landing' : 'memory');
        return true;
    } catch (error) {
        console.error('[FLOW] Memory Lane activation failed', error);
        if (scene2) {
            scene2.hidden = true;
            scene2.setAttribute('aria-hidden', 'true');
            scene2.classList.remove('is-visible', 'is-active', 'is-leaving');
        }
        app.memoryOpened = false;
        app.memoryTransition = false;
        app.pendingMemoryStage = null;

        if (!app.cleaned && navigationRun === app.navigationRun) {
            app.revealStarted = true;
            app.revealStage = 'age-ready';
            setBackState('birthday-reveal');
            // During a Continue handoff the Birthday layer is still visible.
            // A refresh restore has no active layer, so restore it directly.
            if (!app.birthdayReveal?.playing) void app.birthdayReveal?.showFinal();
        }
        return false;
    }
}

function showPostMemoryMessage({ animate = true } = {}) {
    if (app.cleaned) return;
    const navigationRun = invalidateNavigation();
    const handoffRun = ++app.postMemoryRun;
    // Let the settled Memory Lane scene softly leave before it is removed.
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.classList.add('is-leaving');
        laterForNavigation(animate ? 300 : 0, () => {
            if (handoffRun !== app.postMemoryRun) return;
            scene2.hidden = true;
            scene2.classList.remove('is-visible', 'is-active', 'is-leaving');
        }, navigationRun);
    }
    // Hide any existing game
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
function startSecretGame() {
    if (app.cleaned) return;
    // Prevent double-start if already in game
    if (app.backState === 'secret-game' && app.secretGame?.started) return;
    const navigationRun = invalidateNavigation();
    // Fully hide the previous lane background so nothing leaks
    const scene2 = document.querySelector('#scene-2');
    if (scene2) {
        scene2.hidden = true;
        scene2.classList.remove('is-visible', 'is-active');
    }
    // The game covers the previous scene with its own background.
    setBackState('secret-game');
    // Keep the existing handoff pacing from the post-memory message.
    laterForNavigation(180, () => app.secretGame?.start(), navigationRun);
}

function afterSecretGameReward() {
    if (app.cleaned) return;
    showFinalLoveLetter();
}

function getFinalLetterCallbackData() {
    const memory = app.secretGame?.persistedProgress?.gameProgress?.game4?.results?.date;
    return { loveMixMemory: typeof memory === 'string' && memory.trim() ? memory : null };
}

function showFinalLoveLetter({ restore = false, ending = false } = {}) {
    if (app.cleaned || !app.finalLoveLetter) return;
    invalidateNavigation();
    hideInfiniteGarden();
    app.finalLoveLetter.start({ restore, ending, callbackData: getFinalLetterCallbackData() });
    setBackState('final-love-letter');
    window.scrollTo(0, 0);
}

/* The final garden remains isolated from the preceding letter. */
function showInfiniteGarden({ restore = false } = {}) {
    if (app.cleaned || !app.infiniteGarden) return;
    invalidateNavigation();
    app.finalLoveLetter?.stop();

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
    invalidateNavigation();
    let game = app.secretGame;

    try {
        if (!game || game.destroyed) {
            game = new SecretGame().init();
            game.onRewardContinue = () => afterSecretGameReward();
            game.onRewardShown = () => setBackState('reward');
            game.onRewardPhaseChange = () => {
                if (app.backState === 'reward') saveExperienceState();
            };
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
     'secret-game'     THE SECRET OF US intro/levels - Back -> post-memory message
     'reward'          Game Reward (envelope) - Back -> secret-game
     'final-love-letter' Final Romantic Message - Back -> reward
     'infinite-garden' Final Garden - Back -> Final Romantic Message

    Visibility rule: the Back button is VISIBLE on 'love-letter',
    'birthday-letter', and 'birthday-reveal'
    (Back -> open letter), 'memory-landing' (Our Memory → Back to birthday-reveal),
    'secret-game', 'reward', 'final-love-letter', and 'infinite-garden'.
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
        state === 'secret-game' ||
        state === 'reward' ||
        state === 'final-love-letter' ||
        state === 'infinite-garden'
    );
}

function setBackState(state) {
    // Teardown callbacks must never replace the route snapshot that an
    // inactivity lock is preserving for post-unlock restoration.
    if (app.cleaned || app.inactivityLoggingOut) return;
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
        // The long Happy Birthday letter returns to the date gate.
        app.revealStage = 'letter';
        setBackState('birthday-letter');
    } else if (stage === 'countdown') {
        app.revealStage = 'countdown';
        setBackState('countdown');
    } else if (stage === 'heart-intro' || stage === 'hero-burst' || stage === 'greeting' || stage === 'title-assembly' || stage === 'heart' || stage === 'age' || stage === 'age-ready' || stage === 'final') {
        app.revealStage = stage === 'final' ? 'age-ready' : stage;
        setBackState('birthday-reveal');
    }
}

/** One press of the global Back button - restore the previous scene */
async function handleBack() {
    if (app.cleaned) return;
    const wasMemoryTransition = app.memoryTransition;
    invalidateNavigation();

    if (wasMemoryTransition) {
        // The Birthday layer has not exited yet during an atomic handoff. If
        // this was a restore attempt it may be hidden, so showFinal() is only
        // needed when no Live Age scene is already playing.
        app.memoryOpened = false;
        app.revealRun += 1;
        app.revealStarted = true;
        app.revealStage = 'age-ready';
        const scene2 = document.querySelector('#scene-2');
        if (scene2) {
            scene2.hidden = true;
            scene2.setAttribute('aria-hidden', 'true');
            scene2.classList.remove('is-visible', 'is-active', 'is-leaving');
        }
        setBackState('birthday-reveal');
        if (!app.birthdayReveal?.playing) void app.birthdayReveal?.showFinal();
        return;
    }

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
        app.countdown?.stop?.();
        await app.birthdayReveal?.cancel();
        if (app.cleaned) return;
        app.opening?.restoreLetterGate();
        return;
    }

    if (app.backState === 'birthday-reveal') {
        if (app.revealStage === 'age' || app.revealStage === 'age-ready') {
            // Age is an internal birthday substage: return to the already
            // running celebration heart, not to the preceding letter.
            app.revealRun += 1;
            app.revealStage = 'heart';
            setBackState('birthday-reveal');
            await app.birthdayReveal?.restoreHeart?.();
            return;
        }
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
        app.countdown?.stop?.();
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
        app.countdown?.stop?.();
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

    if (app.backState === 'memory-landing' || app.backState === 'memory' || app.backState === 'post-memory') {
        // Back -> Birthday Reveal final/age screen (the stage that
        // handed over to Memory Lane) - never the Love Letter, never
        // a restart, never Memory #1. Order matters:
        // 1. Invalidate any running reveal run so a stale callback
        //    can never open Memory Lane behind the final stage.
        // 2. Record the reveal state so the snapshot and the restore
        //    logic match what is on screen.
        app.revealRun += 1;
        app.memoryOpened = false;
        app.revealStarted = true;
        app.revealStage = 'age-ready';
        // 3. Hide Memory Lane completely (its z-index sits above the
        //    reveal). It re-enters fresh the next time "Aage Badho"
        //    is pressed on the final stage.
        const scene2 = document.querySelector('#scene-2');
        if (scene2) {
            scene2.hidden = true;
            scene2.classList.remove('is-visible', 'is-active');
        }
        // Also hide the game if it was somehow visible.
        try { app.secretGame?.destroy(); } catch {}
        // 4. Restore the settled final stage. Its Continue action owns the
        //    next guarded handoff; do not chain this restoration to Memory.
        setBackState('birthday-reveal');
        // A Back press can land during BirthdayReveal's successful fade-out.
        // Cancel that stale exit before restoring Live Age, otherwise its
        // completion would hide the freshly restored scene.
        await app.birthdayReveal?.cancel();
        if (app.cleaned) return;
        void app.birthdayReveal?.showFinal();
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

    if (app.backState === 'secret-game') {
        // In-game Back is level navigation, not a game reset. Only
        // Level 1 falls through to the post-memory message.
        if (app.secretGame?.back()) {
            // The game has restored an earlier stable subscene. Re-save the
            // containing route immediately so a refresh uses that subscene's
            // persisted game state instead of a stale future destination.
            setBackState('secret-game');
            return;
        }

        // Back from Game 1 -> return to the "After all these
        // memories..." page (the step that now leads into the game).
        try { app.secretGame?.destroy(); } catch {}
        app.secretGame = new SecretGame().init();
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
        app.secretGame.onRewardPhaseChange = () => {
            if (app.backState === 'reward') saveExperienceState();
        };
        showPostMemoryMessage();
        return;
    }

    if (app.backState === 'reward') {
        // Reward Back restores the completed Secret Game stage; it never
        // resets the game or sends the visitor to an earlier experience scene.
        if (app.secretGame?.back()) setBackState('secret-game');
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
    'post-memory-message',
    'secret-game',
    'reward',
    'final-love-letter',
    'infinite-garden',
]);
const LEGACY_SCENE_MIGRATIONS = Object.freeze({
    timeline: 'post-memory-message',
    'post-reward': 'final-love-letter',
});

function saveExperienceState() {
    if (!RESTORABLE_SCENES.has(app.backState)) return;
    try {
        const snapshot = {
            version: STATE_VERSION,
            scene: app.backState,
            timestamp: Date.now(),
        };
        // Reward has two stable route phases. The game owns the UI; this
        // snapshot contains only the data needed to reconstruct it.
        if (app.backState === 'reward') {
            snapshot.rewardPhase = app.secretGame?.rewardPhase === 'opened' ? 'opened' : 'closed';
        }
        if (app.backState === 'birthday-reveal') {
            snapshot.birthdaySubstage = ['heart-intro', 'hero-burst', 'greeting', 'title-assembly', 'heart', 'age', 'age-ready'].includes(app.revealStage)
                ? app.revealStage
                : 'age-ready';
        }
        window.localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
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
        const scene = RESTORABLE_SCENES.has(data.scene)
            ? data.scene
            : LEGACY_SCENE_MIGRATIONS[data.scene];
        if (!scene) {
            window.localStorage.removeItem(STATE_KEY);
            return null;
        }
        if (scene !== data.scene) {
            try {
                window.localStorage.setItem(STATE_KEY, JSON.stringify({
                    version: STATE_VERSION, scene, timestamp: data.timestamp,
                }));
            } catch { /* The in-memory migration still restores safely. */ }
        }
        return {
            scene,
            rewardPhase: data.rewardPhase === 'opened' ? 'opened' : 'closed',
            birthdaySubstage: data.birthdaySubstage === 'heart-ready'
                ? 'age-ready'
                : ['heart-intro', 'hero-burst', 'greeting', 'title-assembly', 'heart', 'age', 'age-ready'].includes(data.birthdaySubstage)
                    ? data.birthdaySubstage
                    : 'age-ready',
            timestamp: data.timestamp,
        };
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
     Legacy values are migrated during load rather than retained as
     active destinations. */
const POST_MEMORY_CHECKPOINTS = new Set([
    'post-memory-final',
    'secret-game',
    'final-love-letter',
    'infinite-garden',
]);
const LEGACY_POST_MEMORY_MIGRATIONS = Object.freeze({
    timeline: 'post-memory-final',
    'post-reward': 'final-love-letter',
});

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
        const currentStage = POST_MEMORY_CHECKPOINTS.has(data.currentStage)
            ? data.currentStage
            : LEGACY_POST_MEMORY_MIGRATIONS[data.currentStage];
        if (!currentStage) {
            window.localStorage.removeItem(POST_MEMORY_STATE_KEY);
            return null;
        }
        if (currentStage !== data.currentStage) {
            try {
                window.localStorage.setItem(POST_MEMORY_STATE_KEY, JSON.stringify({
                    ...data, currentStage,
                }));
            } catch { /* The in-memory migration still restores safely. */ }
        }
        return { currentStage, timestamp: data.timestamp };
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
    } else if (stage === 'secret-game') {
        startSecretGame();
    } else if (stage === 'final-love-letter') {
        showFinalLoveLetter({ restore: true });
    } else if (stage === 'infinite-garden') {
        showInfiniteGarden({ restore: true });
    }
}

/** Restore the current route snapshot. The legacy post-memory checkpoint is
    used only when no authoritative route snapshot exists. */
function revealRestoredApplication() {
    // LoadingManager intentionally becomes a one-shot controller after the
    // first entry. Security restoration must therefore reveal #app directly
    // as well as asking the manager to hide any remaining loading screen.
    app.loading?.exitToApp(true);
    const appEl = document.querySelector('#app');
    if (!appEl) return;
    appEl.hidden = false;
    appEl.removeAttribute('aria-hidden');
    appEl.removeAttribute('inert');
    appEl.style.removeProperty('display');
    appEl.style.removeProperty('visibility');
    appEl.style.removeProperty('pointer-events');
}

function restoreExperience(snapshot) {
    const savedScene = typeof snapshot === 'string' ? snapshot : snapshot?.scene;
    const scene = LEGACY_SCENE_MIGRATIONS[savedScene] || savedScene;
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

    revealRestoredApplication();

    if (scene === 'countdown') {
        app.revealStage = 'countdown';
        startReveal({ forceCountdown: true });
    } else if (scene === 'love-message' || scene === 'birthday-letter') {
        app.revealStage = 'letter';
        startReveal();
    } else if (scene === 'birthday-reveal') {
        app.revealStarted = true;
        // Restoring a saved celebration is not completion of the celebration.
        // showStage may await user interactions, so it must never decide a
        // later Memory Lane handoff.
        void app.birthdayReveal?.showStage(snapshot?.birthdaySubstage || 'age');
    } else if (scene === 'memory') {
        openMemoryScene({ restoreMemoryPosition: true });
    } else if (scene === 'memory-landing') {
        openMemoryScene();
    } else if (scene === 'post-memory-message') {
        showPostMemoryMessage({ animate: false });
    } else if (scene === 'secret-game') {
        startSecretGame();
    } else if (scene === 'reward') {
        const restored = app.secretGame?.restoreReward({ phase: snapshot?.rewardPhase });
        if (restored) setBackState('reward');
    } else if (scene === 'final-love-letter') {
        showFinalLoveLetter({ restore: true });
    } else if (scene === 'infinite-garden') {
        showInfiniteGarden({ restore: true });
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
    invalidateNavigation();

    stopInactivityTracking();

    window.removeEventListener(BEGIN_EVENT, beginExperience);

    try { app.memoryLane?.destroy(); } catch { /* ignore */ }
    app.memoryLane = null;

    try { app.opening?.destroy(); } catch { /* ignore */ }
    app.opening = null;

    try { app.birthdayReveal?.destroy?.(); } catch { /* ignore */ }
    app.birthdayReveal = null;

    try { app.countdown?.destroy?.(); } catch { /* ignore */ }
    app.countdown = null;

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
    // pagehide is also emitted for a normal refresh. It can start the
    // in-memory grace bookkeeping for a BFCache return, but never creates a
    // security lock by itself and never persists a partial grace interval.
    beginMobileBackgroundGrace();
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

    invalidateNavigation();
    stopInactivityTracking();
    app.passwordVerifiedThisSession = false;
    app.resumeAfterInactivity = false;
    clearSecurityLockState();

    // 1. Invalidate any running reveal run so stale callbacks
    //    can never re-open Memory Lane behind the restart.
    app.revealRun += 1;
    app.postMemoryRun += 1;

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
        scene2.classList.remove('is-visible', 'is-active', 'is-leaving');
    }

    // 4. Hide any post-Memory-Lane scenes (celebration, epilogue, etc.).
    for (let i = 3; i <= 8; i++) {
        const scene = document.querySelector(`#scene-${i}`);
        if (scene) {
            scene.hidden = true;
            scene.classList.remove('is-visible', 'is-active', 'is-leaving', 'is-entered', 'is-restored');
        }
    }
    const postMemoryMessage = document.querySelector('#post-memory-message');
    if (postMemoryMessage) {
        postMemoryMessage.hidden = true;
        postMemoryMessage.classList.remove('is-visible', 'is-active', 'is-leaving', 'is-entered', 'is-restored');
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

    // 8b. Clear every journey checkpoint before constructing a fresh game.
    // This keeps old completed levels out of the new game's in-memory state.
    clearJourneyProgressForRestart();

    // 8c. Reset Secret Game.
    try { app.secretGame?.destroy(); } catch {}
    try {
        app.secretGame = new SecretGame().init();
        app.secretGame.onRewardContinue = () => afterSecretGameReward();
        app.secretGame.onRewardShown = () => setBackState('reward');
        app.secretGame.onRewardPhaseChange = () => {
            if (app.backState === 'reward') saveExperienceState();
        };
    } catch {}
    const sg = document.querySelector('#secret-game');
    if (sg) { sg.hidden = true; sg.classList.remove('is-visible', 'is-leaving'); }

    // 9. Cancel any running reveal safely.
    app.countdown?.stop?.();
    await app.birthdayReveal?.cancel();

    // 9b. Reset Memory Lane opened flag so it can be entered again.
    app.memoryOpened = false;

    // 10. Hide the #app container at the beginning (it will be shown after loading/opening handoff).
    const appEl = document.querySelector('#app');
    if (appEl) {
        appEl.hidden = true;
    }

    // 11. Show the loading screen for the beginning scene.
    const loadingScreen = document.querySelector('#loading-screen');
    if (loadingScreen) {
        loadingScreen.hidden = false;
        loadingScreen.classList.remove('is-leaving', 'is-lettering');
    }

    // 12. Hide the tap-to-begin fallback if it exists (will be re-shown by loading completion if needed).
    const tapToBegin = document.querySelector('#tap-to-begin');
    if (tapToBegin) {
        tapToBegin.hidden = true;
    }

    // 13. Reset opening layer - it will be shown by app.opening.reset()/start().
    // Do not hide it here with leftover classes; let reset handle it.
    const openingLayer = document.querySelector('.opening-cinematic');
    if (openingLayer) {
        openingLayer.classList.remove('is-visible', 'is-leaving');
        // keep hidden until reset/start shows it
        openingLayer.hidden = true;
    }

    // 14. Scroll to top to ensure clean slate.
    window.scrollTo(0, 0);

    // 15. Fire the 'none' back state so the global back button
    //     is hidden (we're at the true beginning).
    setBackState('none');

    // 16. Start from the very beginning - entry lock (which hands over to
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
                Your journey progress will be cleared so you can start again
                from the opening.
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
