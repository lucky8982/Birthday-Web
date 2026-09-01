/* ============================================================
   Happy Birthday My Love 💙 - THE SECRET OF US - Game Engine
   ------------------------------------------------------------
   File:    js/secret-game.js
   Purpose: Full-screen cinematic romantic game. State machine
            intro → level1 → level2 → level3 → level4 → level5
            → complete → reward.

   Progression rule (ONE authoritative path):
   Every level has a single dedicated TEST button. Solving a
   puzzle only makes TEST available; clicking TEST validates
   the current puzzle exactly once - PASS shows "TEST PASS"
   and schedules exactly one cinematic transition to the next
   level via _queueLevelTransition(); FAIL shows "TEST FAIL"
   with a romantic retry message and the player stays on the
   same level/puzzle to try again. There is no auto-advance,
   no Next button and no second progression path.

   Data:    Reads entirely from js/secret-game-data.js
            (TIMELINE_MOMENTS, GAME2_MEMORY_DATA, MIND_READING_DATA,
             CHEMISTRY_QUESTIONS, JACKPOT_CATEGORIES,
             SECRET_REWARD, GAME_META).
   ============================================================ */

import { sleep, prefersReducedMotion } from './utils.js';
import {
    TIMELINE_MOMENTS,
    GAME2_MEMORY_DATA,
    MIND_READING_DATA,
    WHO_WOULD_DATA,
    WHO_CHOICE_META,
    CHEMISTRY_QUESTIONS,
    JACKPOT_CATEGORIES,
    PHOTO_MEMORY_PUZZLE,
    SECRET_REWARD,
    GAME_META,
} from './secret-game-data.js';

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* ------------------------------------------------------------
   TEST validation feedback - romantic message pools.
   Messages vary between retries; the picker never repeats
   the immediately previous message of its pool.
   ------------------------------------------------------------ */
const TEST_PASS_MESSAGES = [
    'Bilkul sahi... tumne phir se hamara ek lamha yaad rakha. ❤️',
    'Test pass... dil ne tumhe pehchaan liya. ✨',
    'Sahi jawab... hamari kahani tumhe ab bhi yaad hai. ❤️',
    'Bilkul wahi... jaise hamari kahani mein hona chahiye tha. 🌙',
];

const TEST_RETRY_MESSAGES = [
    'Hmm... dil kuch aur keh raha hai. Ek baar phir sochho. ❤️',
    'Thoda sa aur... hamari kahani itni aasaan nahi thi. ✨',
    'Nahi jaan... ye wala lamha kuch aur keh raha hai. Phir se try karo. 🌙',
    'Dil ke kareeb ho, bas jawab thoda sa door hai. ❤️',
    'Ek baar aur... shayad yaad ka koi chhota sa tukda reh gaya hai. ✨',
    'Galat nahi, bas abhi hamari kahani ka ye hissa poora nahi hua. ❤️',
    'Phir se koshish karo... kuch yaadein dobara mehsoos karne ke liye hoti hain. 🌙',
];

// Game 3 uses one paced cinematic sequence. Durations include the
// ~400 ms entrance and exit so the visible reading hold is 2–3 seconds.
const GAME3_TIMING = Object.freeze({
    successFeedback: 1900,
    retryFeedback: 1900,
    cinematic: {
        short: 2800,
        normal: 3300,
        emotional: 3700,
    },
    climaxBeforeContinue: 3900,
});

const SECRET_GAME_PROGRESS_KEY = 'hbm.secretGameProgress';
const SECRET_GAME_PROGRESS_VERSION = 1;

function loadSecretGameProgress() {
    try {
        const raw = window.localStorage.getItem(SECRET_GAME_PROGRESS_KEY);
        if (!raw) return { highestCompletedGame: 0, currentGame: null, game5Completed: false };
        const data = JSON.parse(raw);
        const highestCompletedGame = data?.highestCompletedGame;
        if (data?.version !== SECRET_GAME_PROGRESS_VERSION ||
            !Number.isInteger(highestCompletedGame) ||
            highestCompletedGame < 0 || highestCompletedGame > 5 ||
            !(data.currentGame == null || (Number.isInteger(data.currentGame) && data.currentGame >= 1 && data.currentGame <= 5)) ||
            typeof data.game5Completed !== 'boolean' ||
            data.game5Completed !== (highestCompletedGame === 5)) {
            return { highestCompletedGame: 0, currentGame: null, game5Completed: false };
        }
        return { highestCompletedGame, currentGame: data.currentGame ?? null, game5Completed: data.game5Completed };
    } catch {
        return { highestCompletedGame: 0, currentGame: null, game5Completed: false };
    }
}

function saveSecretGameProgress(highestCompletedGame, currentGame = null) {
    try {
        window.localStorage.setItem(SECRET_GAME_PROGRESS_KEY, JSON.stringify({
            version: SECRET_GAME_PROGRESS_VERSION,
            highestCompletedGame,
            currentGame,
            game5Completed: highestCompletedGame === 5,
        }));
    } catch {
        /* Storage unavailable: the in-memory game flow remains valid. */
    }
}

function clearSecretGameProgress() {
    try {
        window.localStorage.removeItem(SECRET_GAME_PROGRESS_KEY);
    } catch {
        /* Storage unavailable: the in-memory reset remains valid. */
    }
}

const L1_ARRIVAL_VECTORS = [
    { x: '-54vw', y: '-6vh', rotate: '-3deg' },
    { x: '54vw', y: '-8vh', rotate: '3deg' },
    { x: '-34vw', y: '-24vh', rotate: '-2deg' },
    { x: '42vw', y: '-22vh', rotate: '4deg' },
    { x: '-60vw', y: '8vh', rotate: '-4deg' },
    { x: '58vw', y: '7vh', rotate: '3deg' },
    { x: '-23vw', y: '24vh', rotate: '-2deg' },
    { x: '35vw', y: '22vh', rotate: '3deg' },
];

/** Pick a message from a pool without repeating the last one shown. */
function pickMessage(pool, lastMessage) {
    if (!pool.length) return '';
    if (pool.length === 1) return pool[0];
    let msg = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (msg === lastMessage && guard < 8) {
        msg = pool[Math.floor(Math.random() * pool.length)];
        guard += 1;
    }
    return msg;
}

/* ============================================================
   Class: SecretGame
   ============================================================ */
export class SecretGame {
    constructor() {
        this.root = null;             // #secret-game
        this.timelineRoot = null;     // #our-timeline
        this.shell = null;
        this.bgStars = null;
        this.progressCurrent = null;
        this.progressFill = null;
        this.progressEl = null;

        this.introEl = null;
        this.introLine1 = null;
        this.introLine2 = null;
        this.titleEl = null;
        this.readyEl = null;
        this.beginBtn = null;

        this.levels = {};             // map level key -> element
        this.completeEl = null;
        this.rewardEl = null;

        // Level 1 refs
        this.l1List = null;
        this.l1Feedback = null;
        this.l1CheckBtn = null;       // dedicated TEST button
        this.l1SkipBtn = null;        // temporary development-only control
        this.l1Order = [];            // current visible order of photo ids
        this.l1Shuffled = [];
        this.l1Drag = null;
        this.l1EntranceToken = 0;

        // Level 2 refs and isolated session state
        this.l2Card = null;
        this.l2StageEl = null;
        this.l2ProgressEl = null;
        this.l2Feedback = null;
        this.l2MainSlot = 0;
        this.l2Stage = 'original';
        this.l2Attempts = 0;
        this.l2SelectedIndex = -1;
        this.l2TotalWrongAnswers = 0;
        this.l2Locked = false;
        this.l2RoundToken = 0;

        // Game 3 refs and isolated two-part session state
        this.l3Header = null;
        this.l3Eyebrow = null;
        this.l3Title = null;
        this.l3Subtitle = null;
        this.l3Progress = null;
        this.l3Quiz = null;
        this.l3Card = null;
        this.l3QuestionEl = null;
        this.l3ChoicesEl = null;
        this.l3Feedback = null;
        this.l3TestBtn = null;
        this.l3Cinematic = null;
        this.l3CinematicLine = null;
        this.l3ContinueBtn = null;
        this.l3Phase = 'mind';
        this.l3MindIndex = 0;
        this.l3WhoIndex = 0;
        this.l3Pick = -1;
        this.l3Locked = false;
        this.l3SequenceToken = 0;
        this.l3LastPassMessage = null;
        this.l3LastRetryMessage = null;

        // Game 4 refs and isolated chemistry / jackpot state
        this.l4Chemistry = null;
        this.l4Jackpot = null;
        this.l4Progress = null;
        this.l4Card = null;
        this.l4Question = null;
        this.l4Choices = null;
        this.l4TestBtn = null;
        this.l4Reveal = null;
        this.l4ChoiceReveal = null;
        this.l4FinalReveal = null;
        this.l4NextBtn = null;
        this.l4JackpotGrid = null;
        this.l4JackpotAction = null;
        this.l4JackpotReveal = null;
        this.l4ContinueBtn = null;
        this.l4Phase = 'chemistry';
        this.l4QuestionIndex = 0;
        this.l4SelectedChoice = -1;
        this.l4Results = {};
        this.l4JackpotRunning = false;
        this.l4SequenceToken = 0;

        // Level 5: self-contained four-stage "Unlock My Heart" experience
        this.l5Panels = null;
        this.l5Steps = null;
        this.l5StartBtn = null;
        this.l5FindField = null;
        this.l5HoldHeart = null;
        this.l5HoldFill = null;
        this.l5HoldLabel = null;
        this.l5StoryField = null;
        this.l5StorySvg = null;
        this.l5StoryPath = null;
        this.l5StoryProgress = null;
        this.l5StoryStatus = null;
        this.l5Choices = null;
        this.l5FinishBtn = null;
        this.l5Stage = 'intro';
        this.l5StageDone = 0;
        this.l5Token = 0;
        this.l5HoldProgress = 0;
        this.l5Holding = false;
        this.l5HoldPointer = null;
        this.l5HoldLastFrame = 0;
        this.l5Raf = null;
        this.l5StoryPoints = [];
        this.l5StoryTracing = false;
        this.l5StoryPointer = null;
        this.l5StoryProgressValue = 0;
        this.l5FindMisses = 0;
        this.l5HoldReleaseCount = 0;

        // Completion survives in-game Back/forward navigation and refreshes.
        // It is intentionally reset only with the explicit replay action.
        this.completedLevels = { level1: false, level2: false, level3: false, level4: false, level5: false };
        this.persistedProgress = { highestCompletedGame: 0, currentGame: null, game5Completed: false };
        this.backLocked = false;
        this.l1Restored = false;
        this.l4Restored = false;

        // Complete / Reward refs
        this.completeSymbols = null;
        this.completeLine1 = null;
        this.completeLine2 = null;
        this.completeUnlockBtn = null;
        this.completeReplayBtn = null;
        this.envelope = null;
        this.envelopePaper = null;
        this.rewardCard = null;
        this.rewardContinueBtn = null;
        this.rewardRun = 0;
        this.rewardReady = false;
        this.rewardPhase = 'idle';

        // Timeline refs
        this.timelineTrack = null;
        this.timelineEnterBtn = null;

        this.reduced = prefersReducedMotion();
        this.state = 'idle'; // idle | timeline | intro | level1..level5 | complete | reward
        this.timers = [];
        this.rafs = [];
        this.boundHandlers = [];
        this.started = false;
        this.transitioning = false; // lock to prevent double progression
        this.pendingTransition = null;
        this.transitionToken = 0;
        this.destroyed = false;
        this._lastPassMsg = null;     // avoid repeating the same TEST PASS message
        this._lastRetryMsg = null;    // avoid repeating the same TEST FAIL message
        this._failToken = 0;          // only the latest TEST FAIL message auto-clears
        this._onRewardContinue = null; // wired by main.js
        this._onRewardShown = null;    // wired by main.js
    }

    /* --------------------------------------------------------
       Lifecycle
       -------------------------------------------------------- */
    init() {
        this.root = document.querySelector('#secret-game');
        this.timelineRoot = document.querySelector('#our-timeline');
        if (!this.root) return this;

        this.shell = this.root.querySelector('.sg-shell');
        this.bgStars = this.root.querySelector('#sg-stars');
        this.progressCurrent = this.root.querySelector('#sg-progress-current');
        this.progressFill = this.root.querySelector('#sg-progress-fill');
        this.progressEl = this.root.querySelector('.sg-progress');

        this.introEl = this.root.querySelector('#sg-intro');
        this.introLine1 = this.root.querySelector('#sg-intro-line1');
        this.introLine2 = this.root.querySelector('#sg-intro-line2');
        this.titleEl = this.root.querySelector('#sg-title');
        this.readyEl = this.root.querySelector('#sg-ready');
        this.beginBtn = this.root.querySelector('#sg-begin-btn');

        this.levels.level1 = this.root.querySelector('#sg-level-1');
        this.levels.level2 = this.root.querySelector('#sg-level-2');
        this.levels.level3 = this.root.querySelector('#sg-level-3');
        this.levels.level4 = this.root.querySelector('#sg-level-4');
        this.levels.level5 = this.root.querySelector('#sg-level-5');
        this.completeEl = this.root.querySelector('#sg-complete');
        this.rewardEl = this.root.querySelector('#sg-reward');

        // L1
        this.l1List = this.root.querySelector('#sg-l1-list');
        this.l1Feedback = this.root.querySelector('#sg-l1-feedback');
        this.l1CheckBtn = this.root.querySelector('#sg-l1-check');
        this.l1SkipBtn = this.root.querySelector('#sg-l1-skip');

        // L2
        this.l2Card = this.root.querySelector('#sg-l2-card');
        this.l2StageEl = this.root.querySelector('#sg-l2-stage');
        this.l2ProgressEl = this.root.querySelector('#sg-l2-progress');

        // L3
        this.l3Header = this.root.querySelector('#sg-l3-header');
        this.l3Eyebrow = this.root.querySelector('#sg-l3-eyebrow');
        this.l3Title = this.root.querySelector('#sg-l3-title');
        this.l3Subtitle = this.root.querySelector('#sg-l3-subtitle');
        this.l3Progress = this.root.querySelector('#sg-l3-progress');
        this.l3Quiz = this.root.querySelector('#sg-l3-quiz');
        this.l3Card = this.root.querySelector('#sg-l3-card');
        this.l3QuestionEl = this.root.querySelector('#sg-l3-question');
        this.l3ChoicesEl = this.root.querySelector('#sg-l3-choices');
        this.l3Feedback = this.root.querySelector('#sg-l3-feedback');
        this.l3TestBtn = this.root.querySelector('#sg-l3-action');
        this.l3Cinematic = this.root.querySelector('#sg-l3-cinematic');
        this.l3CinematicLine = this.root.querySelector('#sg-l3-cinematic-line');
        this.l3ContinueBtn = this.root.querySelector('#sg-l3-continue');

        // L4
        this.l4Chemistry = this.root.querySelector('#sg-l4-chemistry');
        this.l4Jackpot = this.root.querySelector('#sg-l4-jackpot');
        this.l4Progress = this.root.querySelector('#sg-l4-progress');
        this.l4Card = this.root.querySelector('#sg-l4-chemistry-card');
        this.l4Question = this.root.querySelector('#sg-l4-question');
        this.l4Choices = this.root.querySelector('#sg-l4-choices');
        this.l4TestBtn = this.root.querySelector('#sg-l4-test');
        this.l4Reveal = this.root.querySelector('#sg-l4-chemistry-reveal');
        this.l4ChoiceReveal = this.root.querySelector('#sg-l4-choice-reveal');
        this.l4FinalReveal = this.root.querySelector('#sg-l4-final-reveal');
        this.l4NextBtn = this.root.querySelector('#sg-l4-next');
        this.l4JackpotGrid = this.root.querySelector('#sg-l4-jackpot-grid');
        this.l4JackpotAction = this.root.querySelector('#sg-l4-jackpot-action');
        this.l4JackpotReveal = this.root.querySelector('#sg-l4-jackpot-reveal');
        this.l4ContinueBtn = this.root.querySelector('#sg-l4-continue');

        // L5
        this.l5Panels = this.root.querySelectorAll('[data-l5-panel]');
        this.l5Steps = this.root.querySelectorAll('.sg-l5-steps span');
        this.l5StartBtn = this.root.querySelector('#sg-l5-start');
        this.l5FindField = this.root.querySelector('#sg-l5-find-field');
        this.l5HoldHeart = this.root.querySelector('#sg-l5-hold-heart');
        this.l5HoldFill = this.root.querySelector('.sg-l5-hold-fill');
        this.l5HoldLabel = this.root.querySelector('#sg-l5-hold-label');
        this.l5StoryField = this.root.querySelector('#sg-l5-story-field');
        this.l5StorySvg = this.root.querySelector('#sg-l5-story-svg');
        this.l5StoryPath = this.root.querySelector('#sg-l5-story-track');
        this.l5StoryProgress = this.root.querySelector('#sg-l5-story-progress');
        this.l5StoryStatus = this.root.querySelector('#sg-l5-story-status');
        this.l5Choices = this.root.querySelector('#sg-l5-choices');
        this.l5FinishBtn = this.root.querySelector('#sg-l5-finish');

        // Complete
        this.completeSymbols = this.root.querySelector('#sg-complete-symbols');
        this.completeLine1 = this.root.querySelector('#sg-complete-line1');
        this.completeLine2 = this.root.querySelector('#sg-complete-line2');
        this.completeUnlockBtn = this.root.querySelector('#sg-complete-unlock');
        this.completeReplayBtn = this.root.querySelector('#sg-complete-replay');

        // Reward
        this.envelope = this.root.querySelector('#sg-envelope');
        this.rewardCard = this.root.querySelector('#sg-reward-card');
        this.rewardContinueBtn = this.root.querySelector('#sg-reward-continue');

        // Timeline
        if (this.timelineRoot) {
            this.timelineTrack = this.timelineRoot.querySelector('#timeline-track');
            this.timelineEnterBtn = this.timelineRoot.querySelector('#timeline-enter-btn');
        }

        this.reduced = prefersReducedMotion();
        this._hydratePersistedProgress();
        this.destroyed = false;
        this.transitioning = false;
        this._spawnBgStars();
        this._wireOnce();
        this._renderTimeline();
        this._renderRewardStatic();
        return this;
    }

    _wireOnce() {
        // Helper to bind once and track for destroy
        const on = (el, evt, fn, opts) => {
            if (!el) return;
            el.addEventListener(evt, fn, opts);
            this.boundHandlers.push([el, evt, fn]);
        };

        // Intro begin
        on(this.beginBtn, 'click', () => this._enterLevel1());
        on(document, 'visibilitychange', () => {
            if (!document.hidden) this._recoverAfterVisibilityChange();
        });

        // Timeline -> game is wired by main.js (showTimelineScene /
        // hideTimelineForGame) so the game does not double-start when
        // the timeline button is pressed. The button still exists in
        // the DOM for accessibility, but its click is handled outside.

        // ONE authoritative progression path per level:
        // solve puzzle -> dedicated TEST button validates exactly once
        // -> PASS advances via _queueLevelTransition / FAIL stays.
        on(this.l1CheckBtn, 'click', () => this._validateLevel1());
        on(this.l1SkipBtn, 'click', () => this._skipLevel1());
        on(this.l3TestBtn, 'click', () => this._confirmLevel3());
        on(this.l3ContinueBtn, 'click', () => this._continueFromLevel3());
        on(this.l4TestBtn, 'click', () => this._revealChemistry());
        on(this.l4NextBtn, 'click', () => this._advanceChemistry());
        on(this.l4JackpotAction, 'click', () => this._handleJackpotAction());
        on(this.l4ContinueBtn, 'click', () => this._continueFromLevel4());
        // L5 is deliberately user-paced. Each listener is scoped to its
        // current stage; no global touch or scrolling behavior is changed.
        on(this.l5StartBtn, 'click', () => this._startL5FromIntro());
        on(this.l5FindField, 'click', (e) => this._handleL5Find(e));
        on(this.l5HoldHeart, 'pointerdown', (e) => this._startL5Hold(e));
        on(this.l5HoldHeart, 'pointerup', (e) => this._stopL5Hold(e));
        on(this.l5HoldHeart, 'pointercancel', (e) => this._stopL5Hold(e));
        on(this.l5HoldHeart, 'lostpointercapture', () => this._stopL5Hold());
        on(this.l5StoryField, 'pointerdown', (e) => this._startL5Story(e));
        on(this.l5StoryField, 'pointermove', (e) => this._traceL5Story(e));
        on(this.l5StoryField, 'pointerup', (e) => this._stopL5Story(e));
        on(this.l5StoryField, 'pointercancel', (e) => this._stopL5Story(e));
        on(this.l5Choices, 'click', (e) => this._chooseL5Choice(e));
        on(this.root, 'click', (e) => { if (e.target.closest('[data-l5-next]')) this._advanceL5Stage(); });
        on(this.l5FinishBtn, 'click', () => this._finishLevel5());

        // L2 objects are delegated via _renderLevel2 per object

        on(this.l4Choices, 'click', (e) => {
            const choice = e.target.closest('.sg-game4-choice');
            if (choice) this._selectChemistryChoice(Number(choice.dataset.choice));
        });

        // Complete -> reward
        on(this.completeUnlockBtn, 'click', () => this._enterReward());
        on(this.completeReplayBtn, 'click', () => this._playAgain());

        // Envelope open
        on(this.envelope, 'click', () => this._openEnvelope());
        on(this.envelope, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openEnvelope(); }});

        // Reward continue -> handoff to future sections (main.js)
        on(this.rewardContinueBtn, 'click', () => {
            this._handoffAfterReward();
        });
    }

    /* --------------------------------------------------------
       Public API - called by main.js
       -------------------------------------------------------- */
    // Show the dedicated Our Timeline section (after Memory Lane)
    showTimeline() {
        this._clearAllTimers();
        this.state = 'timeline';
        // Hide game if it was visible
        if (this.root) {
            this.root.classList.remove('is-visible');
            this.root.hidden = true;
        }
        // Hide memory lane / other scenes (main.js also hides)
        if (this.timelineRoot) {
            this.timelineRoot.hidden = false;
            // force reflow then visible
            void this.timelineRoot.offsetWidth;
            this.timelineRoot.classList.add('is-visible');
        }
        // Ensure body not scrolling behind incorrectly
        window.scrollTo(0, 0);
    }

    hideTimeline() {
        if (this.timelineRoot) {
            this.timelineRoot.classList.remove('is-visible');
            // delay hidden for transition
            this.later(600, () => { if (this.timelineRoot) this.timelineRoot.hidden = true; });
        }
    }

    // Entry point from main.js after timeline completes
    async start() {
        if (this.started) return;
        this.started = true;
        this._clearAllTimers();
        this.state = 'intro';

        // Hide timeline with fade
        this.hideTimeline();

        // Hide any other scene backgrounds: main.js hides #scene-2 etc.
        // Ensure game is the only full-screen scene
        if (this.root) {
            this.root.hidden = false;
            // small delay to let timeline fade
            await sleep(this.reduced ? 0 : 520);
            void this.root.offsetWidth;
            this.root.classList.add('is-visible');
            this.root.classList.remove('is-leaving');
        }

        // Reset all levels to hidden
        this._hideAllLevels();
        if (this.introEl) this.introEl.hidden = false;
        if (this.completeEl) { this.completeEl.classList.remove('is-active'); this.completeEl.hidden = true; }
        if (this.rewardEl) { this.rewardEl.classList.remove('is-active'); this.rewardEl.hidden = true; }

        this._setGameProgressVisible(true);
        if (!this._restorePersistedProgress()) {
            this._setProgress(0);
            this._playIntro();
        }
        // Focus for keyboard
        this.root?.focus?.({ preventScroll: true });
    }

    // Clean teardown (called on destroy / restart)
    destroy() {
        this._cleanupL1Drag();
        this._clearAllTimers();
        for (const [el, evt, fn] of this.boundHandlers) {
            try { el.removeEventListener(evt, fn); } catch {}
        }
        this.boundHandlers = [];
        if (this.root) {
            this.root.classList.remove('is-visible', 'is-leaving');
            this.root.hidden = true;
        }
        if (this.timelineRoot) {
            this.timelineRoot.classList.remove('is-visible');
            this.timelineRoot.hidden = true;
        }
        this.started = false;
        this.state = 'idle';
        this.destroyed = true;
        this.transitioning = false;
    }

    reset() {
        this.destroy();
        this.init();
    }

    /* Allow main.js to hook reward continuation */
    set onRewardContinue(fn) { this._onRewardContinue = fn; }
    set onRewardShown(fn) { this._onRewardShown = fn; }

    // Used only when Back returns from the final letter. It restores the
    // already-earned reward; no level, score, or game progress is replayed.
    restoreReward() {
        if (this.destroyed || !this.root) return false;
        this._clearAllTimers();
        this.started = true;
        this._hideAllLevels();
        this._hideCompleteUI();
        this.rewardReady = true;
        this.rewardPhase = 'opened';
        this.state = 'reward';
        this._setGameProgressVisible(false);
        this.root.hidden = false;
        this.root.classList.remove('is-leaving');
        this.root.classList.add('is-visible', 'sg-reward-active');
        if (this.rewardEl) { this.rewardEl.hidden = false; this.rewardEl.classList.add('is-active'); }
        if (this.envelope) this.envelope.classList.add('is-open');
        if (this.rewardCard) { this.rewardCard.hidden = false; this.rewardCard.classList.add('is-in'); }
        if (this.rewardContinueBtn) { this.rewardContinueBtn.hidden = false; this.rewardContinueBtn.classList.add('is-in'); }
        const hint = this.rewardEl?.querySelector('#sg-reward-hint');
        if (hint) hint.hidden = true;
        if (this.shell) this.shell.scrollTop = 0;
        this._onRewardShown?.();
        return true;
    }

    /**
     * Navigate one game backwards without destroying this session.
     * Returns false only when Level 1 should use main.js's existing
     * scene-level Back destination.
     */
    back() {
        if (!this.started || this.destroyed || this.backLocked) return true;
        const state = this.state;
        if (state === 'intro' || state === 'level1') return false;

        this.backLocked = true;
        this._clearAllTimers();
        this.transitioning = false;
        this.l3SequenceToken += 1;
        this.root?.classList.remove('is-leaving');

        if (state === 'level2') this._restoreCompletedLevel1();
        else if (state === 'level3') this._restoreCompletedLevel2();
        else if (state === 'level4') this._restoreCompletedLevel3();
        else if (state === 'level5' || state === 'complete') this._restoreCompletedLevel4();
        else if (state === 'reward') this._restoreCompletedLevel5();
        else { this.backLocked = false; return false; }

        this.backLocked = false;
        return true;
    }

    /* --------------------------------------------------------
       Background stars
       -------------------------------------------------------- */
    _spawnBgStars() {
        if (!this.bgStars || this.reduced) return;
        this.bgStars.innerHTML = '';
        const total = 42;
        for (let i = 0; i < total; i++) {
            const s = document.createElement('span');
            s.className = 'sg-star';
            s.style.left = (Math.random() * 100).toFixed(1) + '%';
            s.style.top = (Math.random() * 100).toFixed(1) + '%';
            s.style.setProperty('--dur', (2.4 + Math.random() * 3.2).toFixed(2) + 's');
            s.style.setProperty('--delay', (-Math.random() * 4).toFixed(2) + 's');
            s.style.setProperty('--o', (0.18 + Math.random() * 0.30).toFixed(2));
            this.bgStars.appendChild(s);
        }
    }

    /* --------------------------------------------------------
       Timeline placeholder rendering (Our Timeline)
       Uses the same TIMELINE_MOMENTS that Level 1 uses.
       -------------------------------------------------------- */
    _renderTimeline() {
        if (!this.timelineTrack) return;
        this.timelineTrack.innerHTML = '';
        for (const m of TIMELINE_MOMENTS) {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <span class="timeline-dot" aria-hidden="true"></span>
                <div class="timeline-item-body">
                    <div class="timeline-item-title">${m.title}</div>
                    <div class="timeline-item-date">${m.subtitle}</div>
                    <div class="timeline-item-hint">${m.hint}</div>
                </div>
            `;
            this.timelineTrack.appendChild(item);
        }
    }

    _renderRewardStatic() {
        if (!this.rewardCard) return;
        // Fill reward content from config
        const eyebrow = this.rewardCard.querySelector('#sg-reward-eyebrow');
        const title = this.rewardCard.querySelector('#sg-reward-title');
        const body = this.rewardCard.querySelector('#sg-reward-body');
        const signFrom = this.rewardCard.querySelector('#sg-reward-from');
        const signName = this.rewardCard.querySelector('#sg-reward-name');
        if (eyebrow) eyebrow.textContent = SECRET_REWARD.eyebrow;
        if (title) title.textContent = SECRET_REWARD.title;
        if (body) {
            body.innerHTML = '';
            for (const para of SECRET_REWARD.paragraphs) {
                const p = document.createElement('p');
                p.textContent = para;
                body.appendChild(p);
            }
        }
        if (signFrom) signFrom.textContent = SECRET_REWARD.signFrom;
        if (signName) signName.textContent = SECRET_REWARD.signName;
        if (this.rewardContinueBtn) {
            const label = this.rewardContinueBtn.querySelector('.sg-btn-label');
            if (label) label.textContent = SECRET_REWARD.continueLabel;
        }
    }

    /* --------------------------------------------------------
       Persistent completed-game checkpoints
       -------------------------------------------------------- */
    _hydratePersistedProgress() {
        this.persistedProgress = loadSecretGameProgress();
        const highest = this.persistedProgress.highestCompletedGame;
        Object.keys(this.completedLevels).forEach((key, index) => {
            this.completedLevels[key] = index < highest;
        });
    }

    _markLevelCompleted(gameNumber) {
        const highestCompletedGame = Math.max(this.persistedProgress.highestCompletedGame, gameNumber);
        this.persistedProgress = {
            highestCompletedGame,
            currentGame: this.persistedProgress.currentGame,
            game5Completed: highestCompletedGame === 5,
        };
        Object.keys(this.completedLevels).forEach((key, index) => {
            if (index < highestCompletedGame) this.completedLevels[key] = true;
        });
        saveSecretGameProgress(highestCompletedGame, this.persistedProgress.currentGame);
    }

    _recordCurrentGame(gameNumber) {
        this.persistedProgress = { ...this.persistedProgress, currentGame: gameNumber };
        saveSecretGameProgress(this.persistedProgress.highestCompletedGame, gameNumber);
    }

    _restorePersistedProgress() {
        const highest = this.persistedProgress.highestCompletedGame;
        if (!highest) {
            if (this.persistedProgress.currentGame === 1) {
                this._showLevel('level1', 1);
                this._renderLevel1();
                return true;
            }
            return false;
        }

        if (this.persistedProgress.game5Completed) {
            this._showComplete(true);
            return true;
        }

        if (highest === 1) {
            this._showLevel('level2', 2);
            this._renderLevel2();
        } else if (highest === 2) {
            this._startLevel3();
        } else if (highest === 3) {
            this._enterLevel4();
        } else if (highest === 4) {
            this._showLevel('level5', 5);
            this._renderLevel5();
        }
        return true;
    }

    _playAgain() {
        if (this.state !== 'complete' || this.transitioning) return;
        this.transitioning = true;
        this.completeReplayBtn && (this.completeReplayBtn.disabled = true);
        clearSecretGameProgress();
        this.persistedProgress = { highestCompletedGame: 0, currentGame: null, game5Completed: false };
        this.completedLevels = { level1: false, level2: false, level3: false, level4: false, level5: false };
        this._clearAllTimers();
        this._cleanupL1Drag();
        this.l1Restored = false;
        this.l4Restored = false;
        this.l3SequenceToken += 1;
        this.l4SequenceToken += 1;
        this._hideAllLevels();
        if (this.completeEl) { this.completeEl.classList.remove('is-active'); this.completeEl.hidden = true; }
        if (this.rewardEl) { this.rewardEl.classList.remove('is-active'); this.rewardEl.hidden = true; }
        this._setProgress(0);
        this.state = 'intro';
        this.transitioning = false;
        this._enterLevel1();
    }

    _recoverAfterVisibilityChange() {
        if (!this.started || this.destroyed) return;

        if (this.pendingTransition) this._finishPendingTransition(this.pendingTransition.token);
        this.backLocked = false;

        if (this.state === 'level1' && this.root?.classList.contains('sg-game1-entering')) {
            this.l1EntranceToken += 1;
            this.root.classList.remove('sg-game1-entering');
            this.root.classList.add('sg-game1-entered');
        }

        if (this.state === 'level4') {
            if (this.l4Phase === 'jackpot-spinning') this._finishJackpotSpin();
            else if (this.l4Phase === 'complete') this._showTestBtn(this.l4ContinueBtn);
        }

        if (this.state === 'complete') {
            this._showTestBtn(this.completeUnlockBtn);
            this._showTestBtn(this.completeReplayBtn);
        }
    }

    /* --------------------------------------------------------
       Progress
       -------------------------------------------------------- */
    _setGameProgressVisible(visible) {
        if (!this.progressEl) return;
        this.progressEl.hidden = !visible;
        this.progressEl.setAttribute('aria-hidden', visible ? 'true' : 'true');
    }

    _setProgress(n) {
        // n is 0..5 intuitive, show as fraction
        if (this.progressCurrent) {
            const txt = n === 0 ? '00 / 05' : String(n).padStart(2, '0') + ' / 05';
            this.progressCurrent.textContent = txt;
        }
        if (this.progressFill) {
            const pct = (n / 5) * 100;
            this.progressFill.style.width = pct + '%';
        }
    }

    _hideAllLevels() {
        this._resetRewardUI();
        this._cleanupL1Drag();
        this._cleanupLevel5();
        this.l1EntranceToken += 1;
        this.l3SequenceToken += 1;
        this.root?.classList.remove('sg-game1-entering', 'sg-game1-entered');
        for (const key of Object.keys(this.levels)) {
            const el = this.levels[key];
            if (!el) continue;
            el.classList.remove('is-active', 'is-exiting');
            el.hidden = true;
        }
        if (this.introEl) {
            this.introEl.hidden = true;
            this.introEl.classList.remove('is-in');
        }
    }

    _showLevel(key, progressNum) {
        this._hideAllLevels();
        this.transitioning = false;
        this._setGameProgressVisible(true);
        if (this.completeEl) { this.completeEl.classList.remove('is-active'); this.completeEl.hidden = true; }
        if (this.rewardEl) { this.rewardEl.classList.remove('is-active'); this.rewardEl.hidden = true; }
        const el = this.levels[key];
        if (!el) return;
        el.hidden = false;
        void el.offsetWidth;
        el.classList.add('is-active');
        this._setProgress(progressNum);
        this.state = key;
        this._recordCurrentGame(progressNum);
        // ensure shell scrolls to top for new level
        if (this.shell) this.shell.scrollTop = 0;
    }

    _setButtonLabel(button, label) {
        const text = button?.querySelector('span');
        if (text) text.textContent = label;
    }

    _restoreCompletedLevel1() {
        this._showLevel('level1', 1);
        if (!this.l1List?.children.length) {
            this._renderLevel1(true);
            const correctIds = this._l1CorrectIds();
            this.l1Order = correctIds;
            correctIds.forEach(id => this.l1List?.appendChild(this.l1List.querySelector(`[data-id="${id}"]`)));
        }
        this.l1Restored = true;
        this.l1List?.querySelectorAll('.sg-memory-photo').forEach(card => {
            card.classList.remove('is-wrong');
            card.classList.add('is-correct');
            card.style.pointerEvents = 'none';
        });
        if (this.l1Feedback) {
            this.l1Feedback.textContent = 'Hamari yaadein bilkul sahi jagah par hain. ❤️';
            this.l1Feedback.className = 'sg-feedback is-visible is-success';
        }
        this._setButtonLabel(this.l1CheckBtn, 'Aage Chalein →');
        this._showTestBtn(this.l1CheckBtn);
        if (this.l1SkipBtn) this.l1SkipBtn.hidden = true;
    }

    _restoreCompletedLevel2() {
        this._showLevel('level2', 2);
        ++this.l2RoundToken;
        this.l2Locked = true;
        this._renderCompletedLevel2();
        const wrap = this.l2StageEl?.querySelector('.sg-game2-complete');
        if (!wrap || !this.l2Card) return;
        this.l2Card.className = 'sg-game2-card is-complete';
        wrap.querySelector('#sg-l2-resume')?.remove();
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'sg-l2-resume';
        button.className = 'sg-btn is-in';
        button.setAttribute('aria-label', 'Aage chalein');
        button.textContent = 'Aage Chalein →';
        button.addEventListener('click', () => {
            if (this.transitioning || this.state !== 'level2') return;
            button.disabled = true;
            this._queueLevelTransition('level2', () => {
                if (this.completedLevels.level3) this._restoreCompletedLevel3();
                else this._enterLevel3();
            }, this.reduced ? 0 : 420);
        }, { once: true });
        wrap.appendChild(button);
    }

    _restoreCompletedLevel3() {
        this._showLevel('level3', 3);
        this.l3Phase = 'final';
        this.l3Locked = true;
        if (this.l3Quiz) this.l3Quiz.hidden = true;
        if (this.l3Cinematic) this.l3Cinematic.hidden = false;
        this.l3Header?.classList.add('is-cinematic');
        if (this.l3CinematicLine) {
            this.l3CinematicLine.classList.remove('is-in');
            this.l3CinematicLine.classList.add('is-climax');
            this.l3CinematicLine.textContent = 'TUM HUMEIN JAANTI HO. ❤️';
        }
        this._showTestBtn(this.l3ContinueBtn);
    }

    _restoreCompletedLevel4() {
        this._showLevel('level4', 4);
        this.l4Restored = true;
        this.l4Phase = 'complete';
        this._showJackpotStage();
        this._renderJackpotCards();
        this._showJackpotFinal(true);
    }

    /* --------------------------------------------------------
       TEST button + feedback helpers (shared by all 5 levels)
       -------------------------------------------------------- */
    /** Reveal a level's TEST button (visible + enabled). */
    _showTestBtn(btn, focus = false) {
        if (!btn) return;
        btn.hidden = false;
        btn.disabled = false;
        btn.classList.add('is-in');
        if (focus) btn.focus?.({ preventScroll: true });
    }

    /** Hide/disable a level's TEST button (used on PASS and on reset). */
    _hideTestBtn(btn) {
        if (!btn) return;
        btn.hidden = true;
        btn.disabled = true;
    }

    /** Show TEST PASS feedback with a romantic message. */
    _showPassFeedback(el, extraText = '') {
        const msg = pickMessage(TEST_PASS_MESSAGES, this._lastPassMsg);
        this._lastPassMsg = msg;
        el.textContent = `TEST PASS — ${extraText ? extraText + ' ' : ''}${msg}`;
        el.className = 'sg-feedback is-visible is-success';
    }

    /** Show TEST FAIL feedback with a romantic retry message. */
    _showFailFeedback(el, shakeEl = null) {
        const msg = pickMessage(TEST_RETRY_MESSAGES, this._lastRetryMsg);
        this._lastRetryMsg = msg;
        el.textContent = `TEST FAIL — ${msg}`;
        el.className = 'sg-feedback is-visible is-error';
        // subtle shake - soft, premium, never harsh
        shakeEl?.animate?.(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
            { duration: 320, easing: 'ease-out' }
        );
        // let the message settle, then clear it so the retry feels fresh
        // (token ensures only the LATEST fail message clears itself)
        const token = ++this._failToken;
        this.later(2600, () => {
            if (this.transitioning || token !== this._failToken) return;
            if (el.textContent.startsWith('TEST FAIL')) {
                el.className = 'sg-feedback';
                el.textContent = '';
            }
        });
    }

    /* --------------------------------------------------------
       Intro sequence
       -------------------------------------------------------- */
    _playIntro() {
        if (!this.introEl) { this._enterLevel1(); return; }
        this.introEl.hidden = false;
        // reset
        [this.introLine1, this.introLine2, this.titleEl, this.readyEl, this.beginBtn].forEach(el => {
            if (!el) return;
            el.classList.remove('is-in');
        });
        this.introEl.classList.remove('is-in');
        void this.introEl.offsetWidth;
        this.introEl.classList.add('is-in');

        const d = this.reduced ? 0 : 1;
        // staggered reveal
        this.later(400 * d, () => this.introLine1?.classList.add('is-in'));
        this.later(1100 * d, () => this.introLine2?.classList.add('is-in'));
        this.later(1900 * d, () => this.titleEl?.classList.add('is-in'));
        this.later(2700 * d, () => this.readyEl?.classList.add('is-in'));
        this.later(3100 * d, () => this.beginBtn?.classList.add('is-in'));
        // auto-focus button when ready
        this.later(3300 * d, () => this.beginBtn?.focus?.({ preventScroll: true }));
    }

    /* --------------------------------------------------------
       LEVEL 1 - REMEMBER
       -------------------------------------------------------- */
    _enterLevel1() {
        if (this.transitioning || this.state === 'level1') return;
        const wait = this.introEl ? (this.reduced ? 0 : 420) : 0;
        if (this.introEl) this.introEl.classList.remove('is-in');
        this._queueLevelTransition('intro', () => {
            if (this.introEl) this.introEl.hidden = true;
            this._showLevel('level1', 1);
            this._renderLevel1();
        }, wait);
    }

    _renderLevel1(restored = false) {
        if (!this.l1List) return;
        this.l1Restored = false;
        this._cleanupL1Drag();
        const level = this.levels.level1;
        level?.querySelector('.sg-level-eyebrow')?.replaceChildren('01 / 05 — OUR MEMORIES');
        level?.querySelector('.sg-level-title')?.replaceChildren('Put Our Memories In Order ❤️');
        level?.querySelector('.sg-level-subtitle')?.replaceChildren('Every photo holds a memory. Arrange them in the order our story unfolded.');
        this.l1List.innerHTML = '';
        this.l1Feedback.textContent = '';
        this.l1Feedback.className = 'sg-feedback';
        this._setButtonLabel(this.l1CheckBtn, 'TEST');
        this._showTestBtn(this.l1CheckBtn);
        if (this.l1SkipBtn) { this.l1SkipBtn.hidden = false; this.l1SkipBtn.disabled = false; }

        // The source data remains untouched. A solved random shuffle is retried.
        const correctIds = this._l1CorrectIds();
        do {
            this.l1Shuffled = shuffle(PHOTO_MEMORY_PUZZLE);
            this.l1Order = this.l1Shuffled.map(memory => memory.id);
        } while (this.l1Order.every((id, index) => id === correctIds[index]));

        const fragment = document.createDocumentFragment();
        this.l1Shuffled.forEach((memory, idx) => {
            const card = document.createElement('div');
            card.className = 'sg-memory-photo';
            card.setAttribute('data-id', memory.id);
            card.setAttribute('role', 'listitem');
            card.setAttribute('aria-label', `Memory photo ${idx + 1}. Drag to reorder.`);
            const arrival = L1_ARRIVAL_VECTORS[idx % L1_ARRIVAL_VECTORS.length];
            card.style.setProperty('--memory-entry-x', arrival.x);
            card.style.setProperty('--memory-entry-y', arrival.y);
            card.style.setProperty('--memory-entry-rotate', arrival.rotate);
            card.style.setProperty('--memory-entry-delay', `${760 + idx * 70}ms`);
            card.innerHTML = `
                <img src="${memory.src}" alt="" draggable="false" decoding="async">
            `;
            card.addEventListener('pointerdown', (event) => this._l1PointerDown(event, memory.id));
            fragment.appendChild(card);
        });
        this.l1List.appendChild(fragment);
        this.l1SkipBtn?.classList.add('is-in');
        if (!restored) this._startLevel1Entrance();
    }

    _startLevel1Entrance() {
        const token = ++this.l1EntranceToken;
        this.root?.classList.remove('sg-game1-entering', 'sg-game1-entered');
        void this.root?.offsetWidth;
        this.root?.classList.add('sg-game1-entering');
        // CSS handles the complete stagger; this single timer only restores input.
        this.later(this.reduced ? 0 : 3400, () => {
            if (token !== this.l1EntranceToken || this.state !== 'level1') return;
            this.root?.classList.remove('sg-game1-entering');
            this.root?.classList.add('sg-game1-entered');
        });
    }

    _l1CorrectIds() {
        return [...PHOTO_MEMORY_PUZZLE].sort((a, b) => a.order - b.order).map(memory => memory.id);
    }

    _clearL1IncorrectState() {
        this.l1List?.querySelectorAll('.sg-memory-photo.is-wrong, .sg-memory-photo.is-correct')
            .forEach(card => card.classList.remove('is-wrong', 'is-correct'));
    }

    // Pointer Events keep mouse, touch, and pen in one reorder system.
    _l1PointerDown(e, id) {
        if (e.button !== undefined && e.button !== 0) return;
        const card = e.currentTarget;
        if (!card) return;
        this._cleanupL1Drag();
        const drag = { card, id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, index: this.l1Order.indexOf(id), active: false, lastTargetId: null, frameId: null, x: e.clientX, y: e.clientY };
        this.l1Drag = drag;
        const onMove = (ev) => {
            if (ev.pointerId !== drag.pointerId) return;
            if (!drag.active && Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 7) return;
            if (!drag.active) {
                drag.active = true;
                this._clearL1IncorrectState();
                card.classList.add('is-dragging');
                card.style.pointerEvents = 'none';
                card.setPointerCapture?.(ev.pointerId);
            }
            ev.preventDefault();
            drag.x = ev.clientX;
            drag.y = ev.clientY;
            if (drag.frameId === null) {
                drag.frameId = requestAnimationFrame(() => {
                    drag.frameId = null;
                    this._reorderL1AtPoint(drag);
                });
            }
        };
        const onUp = (ev) => { if (ev.pointerId === drag.pointerId) this._cleanupL1Drag(); };
        drag.onMove = onMove;
        drag.onUp = onUp;
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }

    _reorderL1AtPoint(drag) {
        const target = document.elementFromPoint(drag.x, drag.y)?.closest('.sg-memory-photo');
        if (!target || target.dataset.id === drag.id || target.dataset.id === drag.lastTargetId) return;
        const targetIndex = this.l1Order.indexOf(target.dataset.id);
        if (targetIndex === -1 || targetIndex === drag.index) return;
        drag.lastTargetId = target.dataset.id;
        this.l1Order.splice(drag.index, 1);
        this.l1Order.splice(targetIndex, 0, drag.id);
        if (drag.index < targetIndex) this.l1List.insertBefore(drag.card, target.nextSibling);
        else this.l1List.insertBefore(drag.card, target);
        drag.index = targetIndex;
    }

    _cleanupL1Drag() {
        const drag = this.l1Drag;
        if (!drag) return;
        if (drag.frameId !== null) cancelAnimationFrame(drag.frameId);
        drag.card.classList.remove('is-dragging');
        drag.card.style.pointerEvents = '';
        window.removeEventListener('pointermove', drag.onMove);
        window.removeEventListener('pointerup', drag.onUp);
        window.removeEventListener('pointercancel', drag.onUp);
        try { drag.card.releasePointerCapture?.(drag.pointerId); } catch {}
        this.l1Drag = null;
    }

    /* --------------------------------------------------------
       LEVEL 1 validation - dedicated TEST button.
       Correct order -> TEST PASS -> exactly one queued
       transition to Level 2. Wrong -> TEST FAIL, stay, retry.
       -------------------------------------------------------- */
    _validateLevel1() {
        if (this.transitioning || this.state !== 'level1') return;

        if (this.l1Restored && this.completedLevels.level1) {
            this.l1Restored = false;
            this._hideTestBtn(this.l1CheckBtn);
            this._queueLevelTransition('level1', () => {
                if (this.completedLevels.level2) this._restoreCompletedLevel2();
                else this._enterLevel2();
            }, this.reduced ? 0 : 420);
            return;
        }

        const correctIds = this._l1CorrectIds();
        const isCorrect = this.l1Order.length === correctIds.length &&
                          this.l1Order.every((id, i) => id === correctIds[i]);

        // mark each card right/wrong (soft visual feedback)
        const cards = [...this.l1List.querySelectorAll('.sg-memory-photo')];
        cards.forEach((c, i) => {
            c.classList.remove('is-correct', 'is-wrong');
            if (isCorrect) {
                c.classList.add('is-correct');
            } else {
                const id = c.getAttribute('data-id');
                const shouldIdx = correctIds.indexOf(id);
                if (shouldIdx === i) c.classList.add('is-correct');
                else c.classList.add('is-wrong');
            }
        });

        if (isCorrect) {
            // PASS - lock the puzzle and commit exactly one transition
            this._markLevelCompleted(1);
            this._showPassFeedback(this.l1Feedback, GAME_META.successMessages.level1);
            this._hideTestBtn(this.l1CheckBtn);
            this.l1List.querySelectorAll('.sg-memory-photo').forEach(c => c.style.pointerEvents = 'none');
            this.l1List.animate?.(
                [{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }],
                { duration: 520, easing: 'ease-out' }
            );
            this._queueLevelTransition('level1', () => this._enterLevel2(), this.reduced ? 500 : 1100);
        } else {
            // FAIL - stay on the level, allow rearrange + retry
            this._showFailFeedback(this.l1Feedback, this.l1List);
        }
    }

    // TEMP: Remove Game 1 skip after final memory photos/order are added.
    _skipLevel1() {
        if (this.transitioning || this.state !== 'level1') return;
        this._markLevelCompleted(1);
        this._hideTestBtn(this.l1CheckBtn);
        if (this.l1SkipBtn) this.l1SkipBtn.disabled = true;
        this._showPassFeedback(this.l1Feedback, 'Game skipped for development.');
        this._queueLevelTransition('level1', () => this._enterLevel2(), this.reduced ? 0 : 550);
    }

    /* --------------------------------------------------------
       LEVEL 2 - OUR MEMORY DETECTOR
       -------------------------------------------------------- */
    _enterLevel2() {
        const cur = this.levels.level1;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => {
                this._showLevel('level2', 2);
                this._renderLevel2();
            });
        } else {
            this._showLevel('level2', 2);
            this._renderLevel2();
        }
    }

    _renderLevel2() {
        if (!this.l2StageEl || !this.l2Card) return;
        this.l2MainSlot = 0;
        this.l2Stage = 'original';
        this.l2Attempts = 0;
        this.l2SelectedIndex = -1;
        this.l2TotalWrongAnswers = 0;
        this.l2Locked = false;
        this.l2RoundToken += 1;
        this._renderLevel2Round();
    }

    _getLevel2Memory() { return GAME2_MEMORY_DATA[this.l2MainSlot]?.[this.l2Stage] || null; }

    _renderLevel2Round() {
        const memory = this._getLevel2Memory();
        if (!memory || !this.l2StageEl || !this.l2Card) return;
        this.l2Attempts = 0;
        this.l2SelectedIndex = -1;
        this.l2Locked = false;
        const token = ++this.l2RoundToken;
        this.l2Card.className = 'sg-game2-card';
        if (this.l2ProgressEl) this.l2ProgressEl.textContent = `Memory ${this.l2MainSlot + 1} / 3`;
        this.l2StageEl.replaceChildren();

        const heading = document.createElement('div');
        heading.className = 'sg-game2-memory-copy';
        const title = document.createElement('h4');
        title.className = 'sg-game2-memory-title'; title.textContent = memory.title;
        const question = document.createElement('p');
        question.className = 'sg-game2-question'; question.textContent = memory.question;
        heading.append(title, question);

        const frame = document.createElement('div');
        frame.className = 'sg-game2-image-frame is-loading';
        const image = document.createElement('img');
        image.className = 'sg-game2-image is-obscured'; image.src = memory.image; image.alt = memory.title; image.decoding = 'async';
        const fallback = document.createElement('div');
        fallback.className = 'sg-game2-image-fallback'; fallback.setAttribute('aria-hidden', 'true'); fallback.textContent = 'A memory waiting to be revealed';
        const settleImage = () => {
            if (token !== this.l2RoundToken || this.state !== 'level2') return;
            frame.classList.remove('is-loading'); frame.classList.add('is-loaded');
        };
        image.addEventListener('load', settleImage, { once: true });
        image.addEventListener('error', () => {
            if (token !== this.l2RoundToken || this.state !== 'level2') return;
            frame.classList.remove('is-loading'); frame.classList.add('is-missing');
        }, { once: true });
        frame.append(image, fallback);

        const chances = document.createElement('p');
        chances.className = 'sg-game2-chances'; chances.setAttribute('aria-live', 'polite'); chances.textContent = '2 Chances ❤';
        const kisses = document.createElement('p');
        kisses.className = 'sg-game2-kisses'; kisses.setAttribute('aria-live', 'polite'); kisses.textContent = `Kisses: ${this.l2TotalWrongAnswers * 5} 😘`;
        const status = document.createElement('div');
        status.className = 'sg-game2-status'; status.append(chances, kisses);
        const options = document.createElement('div');
        options.className = 'sg-game2-options'; options.setAttribute('role', 'group'); options.setAttribute('aria-label', `Answers for ${memory.title}`);
        memory.options.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'sg-game2-option'; button.textContent = label;
            button.style.setProperty('--option-delay', `${this.reduced ? 0 : index * 70}ms`);
            button.addEventListener('click', () => this._handleLevel2Choice(index, button));
            options.appendChild(button);
        });
        const feedback = document.createElement('p');
        feedback.className = 'sg-game2-feedback'; feedback.setAttribute('aria-live', 'polite'); this.l2Feedback = feedback;
        this.l2StageEl.append(heading, frame, status, options, feedback);
        if (image.complete && image.naturalWidth > 0) settleImage();
    }

    _handleLevel2Choice(index, button) {
        const memory = this._getLevel2Memory();
        if (!memory || this.l2Locked || this.transitioning || this.state !== 'level2' || button.disabled) return;
        this.l2Locked = true; this.l2SelectedIndex = index;
        if (index === memory.correctIndex) { this._resolveLevel2Correct(button, memory); return; }
        this.l2TotalWrongAnswers += 1; this.l2Attempts += 1;
        this._updateLevel2Kisses();
        button.disabled = true; button.classList.add('is-wrong');
        const chances = this.l2StageEl?.querySelector('.sg-game2-chances');
        if (chances) chances.textContent = this.l2Attempts === 1 ? '1 Chance Left ❤' : '0 Chances';
        this.l2Card?.classList.remove('is-penalty'); void this.l2Card?.offsetWidth; this.l2Card?.classList.add('is-penalty');
        if (this.l2Attempts === 1) { this._setLevel2Feedback('Hmm... ek baar aur socho. ❤', 'is-wrong'); this.l2Locked = false; return; }
        this._setLevel2Feedback('Oops... dono chances chale gaye. ❤ Penalty: 10 kisses 😘', 'is-penalty');
        const token = this.l2RoundToken;
        this.later(this.reduced ? 650 : 2000, () => {
            if (this.state !== 'level2' || token !== this.l2RoundToken) return;
            if (this.l2Stage === 'original') this._transitionLevel2Content('recovery'); else this._advanceLevel2Slot();
        });
    }

    _resolveLevel2Correct(button, memory) {
        this.l2Card?.classList.remove('is-penalty'); this.l2Card?.classList.add('is-success');
        button.classList.add('is-correct');
        this.l2StageEl?.querySelectorAll('.sg-game2-option').forEach(option => { option.disabled = true; });
        this.l2StageEl?.querySelector('.sg-game2-image')?.classList.remove('is-obscured');
        this._setLevel2Feedback(memory.revealText, 'is-success');
        const token = this.l2RoundToken;
        this.later(this.reduced ? 650 : 1900, () => {
            if (this.state !== 'level2' || token !== this.l2RoundToken) return;
            this._advanceLevel2Slot();
        });
    }

    _setLevel2Feedback(text, modifier = '') { if (this.l2Feedback) { this.l2Feedback.textContent = text; this.l2Feedback.className = `sg-game2-feedback is-visible ${modifier}`.trim(); } }

    _updateLevel2Kisses() {
        const kisses = this.l2StageEl?.querySelector('.sg-game2-kisses');
        if (!kisses) return;
        kisses.textContent = `Kisses: ${this.l2TotalWrongAnswers * 5} 😘`;
        kisses.classList.remove('is-updating');
        void kisses.offsetWidth;
        kisses.classList.add('is-updating');
    }

    _transitionLevel2Content(stage) {
        if (!this.l2Card) return;
        this.l2Locked = true; this.l2Card.classList.add('is-transitioning');
        const token = this.l2RoundToken;
        this.later(this.reduced ? 0 : 320, () => {
            if (this.state !== 'level2' || token !== this.l2RoundToken) return;
            this.l2Stage = stage; this._renderLevel2Round();
        });
    }

    _advanceLevel2Slot() {
        this.l2MainSlot += 1; this.l2Stage = 'original';
        if (this.l2MainSlot >= 3) { this._completeLevel2(); return; }
        this._transitionLevel2Content('original');
    }

    _renderCompletedLevel2() {
        if (!this.l2Card || !this.l2StageEl) return;
        if (this.l2ProgressEl) this.l2ProgressEl.textContent = 'Memory 3 / 3';
        this.l2Card.className = 'sg-game2-card is-complete';
        this.l2StageEl.replaceChildren();
        const wrap = document.createElement('div'); wrap.className = 'sg-game2-complete';
        const title = document.createElement('h4'); title.textContent = 'Memory Detector Complete â¤';
        const copy = document.createElement('p'); copy.textContent = 'You may miss a few answers... but you never miss what matters to us. â¤';
        const summary = document.createElement('p'); summary.className = 'sg-game2-complete-summary'; summary.textContent = `Wrong Answers: ${this.l2TotalWrongAnswers}`;
        const kissTotal = document.createElement('p'); kissTotal.className = 'sg-game2-complete-kisses'; kissTotal.textContent = `${this.l2TotalWrongAnswers} Ã— 5 = ${this.l2TotalWrongAnswers * 5} Kisses ðŸ˜˜`;
        wrap.append(title, copy, summary, kissTotal);
        this.l2StageEl.append(wrap);
    }

    _completeLevel2() {
        if (!this.l2Card || !this.l2StageEl) return;
        this._markLevelCompleted(2);
        ++this.l2RoundToken; this.l2Locked = true;
        if (this.l2ProgressEl) this.l2ProgressEl.textContent = 'Memory 3 / 3';
        this.l2Card.className = 'sg-game2-card is-complete'; this.l2StageEl.replaceChildren();
        const wrap = document.createElement('div'); wrap.className = 'sg-game2-complete';
        const title = document.createElement('h4'); title.textContent = 'Memory Detector Complete ❤';
        const copy = document.createElement('p'); copy.textContent = 'You may miss a few answers... but you never miss what matters to us. ❤';
        const summary = document.createElement('p'); summary.className = 'sg-game2-complete-summary'; summary.textContent = `Wrong Answers: ${this.l2TotalWrongAnswers}`;
        const kissTotal = document.createElement('p'); kissTotal.className = 'sg-game2-complete-kisses'; kissTotal.textContent = `${this.l2TotalWrongAnswers} × 5 = ${this.l2TotalWrongAnswers * 5} Kisses 😘`;
        wrap.append(title, copy, summary, kissTotal); this.l2StageEl.append(wrap);
        this.later(this.reduced ? 800 : 2600, () => {
            if (this.state === 'level2') this._queueLevelTransition('level2', () => this._enterLevel3(), 0);
        });
    }

    /* --------------------------------------------------------
       GAME 3 - READ MY MIND / WHO WOULD DO IT?
       -------------------------------------------------------- */
    _enterLevel3() {
        const cur = this.levels.level2;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => this._startLevel3());
        } else this._startLevel3();
    }

    _startLevel3() {
        this._showLevel('level3', 3);
        this.l3Phase = 'mind';
        this.l3MindIndex = 0;
        this.l3WhoIndex = 0;
        this.l3Pick = -1;
        this.l3Locked = false;
        this.l3LastPassMessage = null;
        this.l3LastRetryMessage = null;
        this._renderLevel3Question();
    }

    _renderLevel3Question() {
        const isMind = this.l3Phase === 'mind';
        const index = isMind ? this.l3MindIndex : this.l3WhoIndex;
        const data = isMind ? MIND_READING_DATA : WHO_WOULD_DATA;
        const question = data[index];
        if (!question || !this.l3Card || !this.l3ChoicesEl) return;

        this.l3Locked = false;
        this.l3Pick = -1;
        if (this.l3Quiz) this.l3Quiz.hidden = false;
        if (this.l3Cinematic) this.l3Cinematic.hidden = true;
        this.l3Header?.classList.remove('is-cinematic');
        this._hideTestBtn(this.l3TestBtn);
        if (this.l3Feedback) { this.l3Feedback.textContent = ''; this.l3Feedback.className = 'sg-game3-feedback'; }

        if (this.l3Eyebrow) this.l3Eyebrow.textContent = `03 / 05 — ${isMind ? 'MERE DIL KI BAAT' : 'YE KARTA KAUN?'}`;
        if (this.l3Title) this.l3Title.textContent = isMind ? 'MERE DIL KI BAAT ❤️' : 'YE KARTA KAUN? 😌';
        if (this.l3Subtitle) this.l3Subtitle.textContent = isMind ? 'Dekhte hain tum mujhe kitna achhe se samajhti ho...' : 'Sach sach batana… ye actually hum dono me se kaun karega?';
        if (this.l3Progress) this.l3Progress.textContent = `${index + 1} / 3 · ${isMind ? 'Batao, main kya choose karta?' : 'Batao kaun?'}`;
        this.l3QuestionEl.textContent = question.question;
        this.l3ChoicesEl.replaceChildren();

        const choices = isMind ? question.options.map((text, idx) => ({ id: String(idx), label: text, number: String(idx + 1).padStart(2, '0') })) : WHO_CHOICE_META;
        choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sg-game3-choice${isMind ? '' : ' is-who-choice'}`;
            btn.style.setProperty('--option-delay', `${idx * 95}ms`);
            btn.dataset.choice = choice.id;
            btn.setAttribute('aria-label', choice.label);
            if (isMind) {
                const number = document.createElement('span'); number.className = 'sg-game3-choice-number'; number.textContent = choice.number;
                const label = document.createElement('span'); label.className = 'sg-game3-choice-label'; label.textContent = choice.label;
                btn.append(number, label);
            } else {
                const label = document.createElement('span'); label.className = 'sg-game3-who-label'; label.textContent = choice.label;
                const note = document.createElement('span'); note.className = 'sg-game3-who-note'; note.textContent = choice.note;
                btn.append(label, note);
            }
            btn.addEventListener('click', () => this._pickLevel3Choice(isMind ? idx : choice.id, btn));
            this.l3ChoicesEl.appendChild(btn);
        });

        this.l3Card.animate?.(
            [{ opacity: '0', transform: 'translateY(10px)', filter: 'blur(3px)' }, { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' }],
            { duration: this.reduced ? 1 : 460, easing: 'cubic-bezier(.22,1,.36,1)' }
        );
    }

    _pickLevel3Choice(value, btn) {
        if (this.transitioning || this.state !== 'level3' || this.l3Locked || !btn) return;
        this.l3Pick = value;
        this.l3ChoicesEl?.querySelectorAll('.sg-game3-choice').forEach(choice => choice.classList.toggle('is-selected', choice === btn));
        if (this.l3Feedback) { this.l3Feedback.textContent = ''; this.l3Feedback.className = 'sg-game3-feedback'; }
        this._showTestBtn(this.l3TestBtn);
    }

    _confirmLevel3() {
        if (this.transitioning || this.state !== 'level3' || this.l3Locked || this.l3Pick === -1) return;
        const isMind = this.l3Phase === 'mind';
        const index = isMind ? this.l3MindIndex : this.l3WhoIndex;
        const question = (isMind ? MIND_READING_DATA : WHO_WOULD_DATA)[index];
        const isCorrect = isMind ? this.l3Pick === question?.correctIndex : this.l3Pick === question?.correctChoice;
        if (!question) return;

        this.l3Locked = true;
        this._hideTestBtn(this.l3TestBtn);
        const selected = this.l3ChoicesEl?.querySelector('.sg-game3-choice.is-selected');
        this.l3ChoicesEl?.querySelectorAll('.sg-game3-choice').forEach(choice => { choice.disabled = true; });
        if (!isCorrect) {
            selected?.classList.add('is-wrong');
            const retry = pickMessage(isMind ? [
                'Hmm… ye nahi. Thoda aur mujhe samajhne ki koshish karo. ❤️',
                'Achha try tha… par mera dil kuch aur keh raha tha. 😌',
                'Almost… lekin ye wala nahi. ❤️',
                'Tum mujhe jaanti ho… ek baar aur socho. 🌙',
            ] : [
                'Sach sach batao… tumhe bhi pata hai ye answer nahi hai. 😏',
                'Hmm… ek baar hum dono ke baare me fir se socho. ❤️',
                'Nice try. 😌 Ek baar aur.',
                'Are you sure? Mujhe lagta hai tum answer jaanti ho. ❤️',
            ], this.l3LastRetryMessage);
            this._setLevel3Feedback(retry, 'is-error');
            this.l3LastRetryMessage = retry;
            this.l3Card?.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: this.reduced ? 1 : 340, easing: 'ease-out' });
            this.later(GAME3_TIMING.retryFeedback, () => {
                if (this.state === 'level3' && !this.transitioning) this._renderLevel3Question();
            });
            return;
        }

        selected?.classList.add('is-correct');
        const passPool = isMind ? ['Haan! Bilkul yahi. ❤️', 'Tumne sach me mere dil ki baat pakad li. ✨', 'Exactly… main bhi yahi choose karta. ❤️', 'Tum mujhe kuch zyada hi achhe se jaanti ho. 😌❤️'] : ['Haan… bilkul. 😂❤️', 'Exactly! Ye to bilkul hum hain. ❤️', 'Tum hum dono ko kuch zyada hi achhe se jaanti ho. ✨', 'Haha… ye answer to obvious tha. 😌❤️'];
        const pass = pickMessage(passPool, this.l3LastPassMessage);
        this.l3LastPassMessage = pass;
        this._setLevel3Feedback(pass, 'is-success');
        const isLast = index === 2;
        this.later(GAME3_TIMING.successFeedback, () => {
            if (this.state !== 'level3' || this.transitioning) return;
            if (!isLast) {
                if (isMind) this.l3MindIndex += 1; else this.l3WhoIndex += 1;
                this._renderLevel3Question();
            } else if (isMind) this._playLevel3Bridge();
            else this._playLevel3Finale();
        });
    }

    _setLevel3Feedback(message, modifier = '') {
        if (!this.l3Feedback) return;
        this.l3Feedback.textContent = message;
        this.l3Feedback.className = `sg-game3-feedback is-visible ${modifier}`.trim();
    }

    _playLevel3Bridge() {
        this.l3Phase = 'bridge';
        this._playLevel3Cinematic([
            { text: 'Achha…', duration: GAME3_TIMING.cinematic.short },
            { text: 'Tum sach me mujhe kaafi achhe se jaanti ho. ❤️', duration: GAME3_TIMING.cinematic.normal },
            { text: 'Lekin ab ek aur cheez dekhte hain…', duration: GAME3_TIMING.cinematic.normal },
            { text: 'Mere dil ki baat samajhna to easy tha…', duration: GAME3_TIMING.cinematic.normal },
            { text: 'Lekin actually ye karta kaun? 😌', duration: GAME3_TIMING.cinematic.normal },
        ], () => {
            this.l3Phase = 'who';
            this.l3WhoIndex = 0;
            this._renderLevel3Question();
        });
    }

    _playLevel3Finale() {
        this._markLevelCompleted(3);
        this.l3Phase = 'final';
        this._playLevel3Cinematic([
            { text: 'Achha…', duration: GAME3_TIMING.cinematic.short },
            { text: 'To shayad tum sach me mujhe kaafi achhe se jaanti ho…', duration: GAME3_TIMING.cinematic.normal },
            { text: 'Aur shayad…', duration: GAME3_TIMING.cinematic.short },
            { text: 'hum dono sach me ek dusre ke liye hi bane hain. ❤️', duration: GAME3_TIMING.cinematic.emotional },
        ], () => {
            if (this.state !== 'level3' || this.l3Phase !== 'final') return;
            this.l3CinematicLine?.classList.add('is-climax');
            if (this.l3CinematicLine) this.l3CinematicLine.textContent = 'TUM HUMEIN JAANTI HO. ❤️';
            this.later(GAME3_TIMING.climaxBeforeContinue, () => {
                if (this.state === 'level3' && this.l3Phase === 'final') this._showTestBtn(this.l3ContinueBtn);
            });
        });
    }

    _playLevel3Cinematic(lines, done) {
        const token = ++this.l3SequenceToken;
        if (this.l3Quiz) this.l3Quiz.hidden = true;
        if (this.l3Cinematic) this.l3Cinematic.hidden = false;
        this.l3Header?.classList.add('is-cinematic');
        this._hideTestBtn(this.l3ContinueBtn);
        if (this.l3CinematicLine) this.l3CinematicLine.classList.remove('is-climax');
        let offset = 0;
        lines.forEach(({ text, duration }) => {
            this.later(offset, () => {
                if (token !== this.l3SequenceToken || this.state !== 'level3') return;
                if (this.l3CinematicLine) {
                    this.l3CinematicLine.classList.remove('is-in');
                    void this.l3CinematicLine.offsetWidth;
                    this.l3CinematicLine.style.setProperty('--cinematic-duration', `${duration}ms`);
                    this.l3CinematicLine.textContent = text;
                    this.l3CinematicLine.classList.add('is-in');
                }
            });
            offset += duration;
        });
        this.later(offset, () => {
            if (token === this.l3SequenceToken && this.state === 'level3') done();
        });
    }

    _continueFromLevel3() {
        if (this.transitioning || this.state !== 'level3' || this.l3Phase !== 'final') return;
        this.l3ContinueBtn.disabled = true;
        this.levels.level3?.classList.add('is-exiting');
        this._queueLevelTransition('level3', () => {
            if (this.completedLevels.level4) this._restoreCompletedLevel4();
            else this._enterLevel4();
        }, this.reduced ? 0 : 420);
    }

    /* --------------------------------------------------------
       LEVEL 4 - OUR CHEMISTRY × DATE NIGHT JACKPOT
       -------------------------------------------------------- */
    _enterLevel4() {
        this.l4Restored = false;
        this._showLevel('level4', 4);
        this.l4Phase = 'chemistry';
        this.l4QuestionIndex = 0;
        this.l4SelectedChoice = -1;
        this.l4Results = {};
        this.l4JackpotRunning = false;
        this.l4SequenceToken += 1;
        this._showChemistryStage();
        this._renderChemistryQuestion();
    }

    _showChemistryStage() {
        if (this.l4Chemistry) this.l4Chemistry.hidden = false;
        if (this.l4Jackpot) this.l4Jackpot.hidden = true;
    }

    _showJackpotStage() {
        if (this.l4Chemistry) this.l4Chemistry.hidden = true;
        if (this.l4Jackpot) {
            this.l4Jackpot.hidden = false;
            void this.l4Jackpot.offsetWidth;
            this.l4Jackpot.classList.add('is-entered');
        }
    }

    // Completion and reward are sibling screens, so every route out of the
    // reward must fully reset it before another screen is allowed to show.
    _resetRewardUI() {
        this.rewardRun += 1;
        this.rewardReady = false;
        this.rewardPhase = 'idle';
        this.root?.classList.remove('sg-reward-active');
        if (this.rewardEl) {
            this.rewardEl.classList.remove('is-active');
            this.rewardEl.hidden = true;
        }
        if (this.envelope) {
            this.envelope.classList.remove('is-open');
            this.envelope.setAttribute('tabindex', '0');
            this.envelope.setAttribute('role', 'button');
            this.envelope.setAttribute('aria-label', 'Open your reward');
        }
        if (this.rewardCard) {
            this.rewardCard.classList.remove('is-in');
            this.rewardCard.hidden = true;
        }
        if (this.rewardContinueBtn) {
            this.rewardContinueBtn.classList.remove('is-in');
            this.rewardContinueBtn.hidden = true;
        }
        const hint = this.rewardEl?.querySelector('#sg-reward-hint');
        if (hint) hint.hidden = true;
    }

    _hideCompleteUI() {
        if (this.completeEl) {
            this.completeEl.classList.remove('is-active');
            this.completeEl.hidden = true;
        }
        if (this.completeUnlockBtn) {
            this.completeUnlockBtn.classList.remove('is-in');
            this.completeUnlockBtn.hidden = true;
        }
        if (this.completeReplayBtn) {
            this.completeReplayBtn.classList.remove('is-in');
            this.completeReplayBtn.hidden = true;
        }
    }

    _renderChemistryQuestion() {
        const item = CHEMISTRY_QUESTIONS[this.l4QuestionIndex];
        if (!item || !this.l4Question || !this.l4Choices) return;
        this.l4Phase = 'chemistry';
        this.l4SelectedChoice = -1;
        if (this.l4Progress) this.l4Progress.textContent = `${this.l4QuestionIndex + 1} / ${CHEMISTRY_QUESTIONS.length}`;
        this.l4Question.textContent = item.question;
        this.l4Choices.replaceChildren();
        this.l4Card?.classList.remove('is-leaving');
        this.l4Reveal?.classList.remove('is-visible');
        this.l4Reveal.hidden = true;
        this._hideTestBtn(this.l4TestBtn);
        this._hideTestBtn(this.l4NextBtn);
        item.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sg-game4-choice';
            button.dataset.choice = String(index);
            button.setAttribute('aria-pressed', 'false');
            button.style.setProperty('--option-delay', `${index * 100}ms`);
            const number = document.createElement('span');
            number.className = 'sg-game4-choice-check';
            number.setAttribute('aria-hidden', 'true');
            number.textContent = '✓';
            const label = document.createElement('span');
            label.textContent = choice.label;
            button.append(number, label);
            this.l4Choices.append(button);
        });
    }

    _selectChemistryChoice(index) {
        if (this.state !== 'level4' || this.l4Phase !== 'chemistry' || this.l4SelectedChoice !== -1) return;
        const question = CHEMISTRY_QUESTIONS[this.l4QuestionIndex];
        if (!question?.choices[index]) return;
        this.l4SelectedChoice = index;
        this.l4Choices?.querySelectorAll('.sg-game4-choice').forEach((button, choiceIndex) => {
            const selected = choiceIndex === index;
            button.classList.toggle('is-selected', selected);
            button.classList.toggle('is-dimmed', !selected);
            button.setAttribute('aria-pressed', String(selected));
            button.disabled = true;
        });
        this._showTestBtn(this.l4TestBtn);
    }

    _revealChemistry() {
        if (this.state !== 'level4' || this.l4Phase !== 'chemistry' || this.l4SelectedChoice < 0) return;
        const question = CHEMISTRY_QUESTIONS[this.l4QuestionIndex];
        const selected = question?.choices[this.l4SelectedChoice];
        if (!selected) return;
        this.l4Phase = 'chemistry-reveal';
        this._hideTestBtn(this.l4TestBtn);
        this.l4Choices?.querySelector('.is-selected')?.classList.add('is-glowing');
        if (this.l4ChoiceReveal) this.l4ChoiceReveal.textContent = selected.reveal;
        if (this.l4FinalReveal) this.l4FinalReveal.textContent = question.finalLine;
        if (this.l4Reveal) {
            this.l4Reveal.hidden = false;
            void this.l4Reveal.offsetWidth;
            this.l4Reveal.classList.add('is-visible');
        }
        const token = ++this.l4SequenceToken;
        this.later(this.reduced ? 0 : 1050, () => {
            if (token !== this.l4SequenceToken || this.state !== 'level4' || this.l4Phase !== 'chemistry-reveal') return;
            this._setButtonLabel(this.l4NextBtn, this.l4QuestionIndex === CHEMISTRY_QUESTIONS.length - 1 ? 'Continue to Jackpot ✨' : 'NEXT →');
            this._showTestBtn(this.l4NextBtn);
        });
    }

    _advanceChemistry() {
        if (this.state !== 'level4' || this.l4Phase !== 'chemistry-reveal') return;
        this._hideTestBtn(this.l4NextBtn);
        if (this.l4QuestionIndex < CHEMISTRY_QUESTIONS.length - 1) {
            this.l4Card?.classList.add('is-leaving');
            this.l4Reveal?.classList.remove('is-visible');
            this.later(this.reduced ? 0 : 360, () => {
                if (this.state !== 'level4') return;
                this.l4QuestionIndex += 1;
                this._renderChemistryQuestion();
            });
            return;
        }
        this._enterJackpot();
    }

    _enterJackpot() {
        if (this.state !== 'level4') return;
        this.l4Phase = 'jackpot';
        this.l4Chemistry?.classList.add('is-leaving');
        this.later(this.reduced ? 0 : 420, () => {
            if (this.state !== 'level4' || this.l4Phase !== 'jackpot') return;
            this._showJackpotStage();
            this._renderJackpotCards();
        });
    }

    _renderJackpotCards() {
        if (!this.l4JackpotGrid) return;
        this.l4JackpotGrid.replaceChildren();
        JACKPOT_CATEGORIES.forEach((category, index) => {
            const card = document.createElement('article');
            card.className = 'sg-jackpot-card';
            card.dataset.category = category.key;
            card.style.setProperty('--card-delay', `${index * 95}ms`);
            const label = document.createElement('p');
            label.className = 'sg-jackpot-label';
            label.textContent = category.label;
            const value = document.createElement('p');
            value.className = 'sg-jackpot-value';
            value.textContent = this.l4Results[category.key] || '—';
            card.append(label, value);
            this.l4JackpotGrid.append(card);
        });
        if (this.l4JackpotReveal) {
            this.l4JackpotReveal.classList.remove('is-visible');
            this.l4JackpotReveal.hidden = true;
        }
        this._hideTestBtn(this.l4ContinueBtn);
        this._setButtonLabel(this.l4JackpotAction, 'Create Our Date Night ✨');
        this.l4JackpotAction.disabled = false;
        this._showTestBtn(this.l4JackpotAction);
    }

    _handleJackpotAction() {
        if (this.state !== 'level4' || this.l4JackpotRunning) return;
        if (this.l4Phase === 'jackpot-ready') {
            this._showJackpotFinal();
            return;
        }
        if (this.l4Phase !== 'jackpot') return;
        this._runJackpot();
    }

    _runJackpot() {
        this.l4JackpotRunning = true;
        this.l4JackpotAction.disabled = true;
        this.l4Phase = 'jackpot-spinning';
        const token = ++this.l4SequenceToken;
        let offset = 0;
        JACKPOT_CATEGORIES.forEach((category, categoryIndex) => {
            const result = category.options[Math.floor(Math.random() * category.options.length)];
            this.l4Results[category.key] = result;
            const card = this.l4JackpotGrid?.querySelector(`[data-category="${category.key}"]`);
            const value = card?.querySelector('.sg-jackpot-value');
            const cycles = this.reduced ? 1 : 5;
            for (let cycle = 0; cycle < cycles; cycle += 1) {
                this.later(offset + cycle * (this.reduced ? 0 : 95), () => {
                    if (token !== this.l4SequenceToken || this.state !== 'level4' || this.l4Phase !== 'jackpot-spinning') return;
                    if (value) value.textContent = category.options[(cycle + categoryIndex + 1) % category.options.length];
                    card?.classList.add('is-cycling');
                });
            }
            const lockAt = offset + (this.reduced ? 0 : 580);
            this.later(lockAt, () => {
                if (token !== this.l4SequenceToken || this.state !== 'level4' || this.l4Phase !== 'jackpot-spinning') return;
                if (value) value.textContent = result;
                card?.classList.remove('is-cycling');
                card?.classList.add('is-locked');
            });
            offset = lockAt + (this.reduced ? 0 : 140);
        });
        this.later(offset + (this.reduced ? 0 : 180), () => {
            if (token !== this.l4SequenceToken) return;
            this._finishJackpotSpin();
        });
    }

    _finishJackpotSpin() {
        if (this.state !== 'level4' || this.l4Phase !== 'jackpot-spinning') return;
        this.l4JackpotGrid?.querySelectorAll('.sg-jackpot-card').forEach(card => {
            const value = card.querySelector('.sg-jackpot-value');
            if (value) value.textContent = this.l4Results[card.dataset.category] || value.textContent;
            card.classList.remove('is-cycling');
            card.classList.add('is-locked');
        });
        this.l4JackpotRunning = false;
        this.l4Phase = 'jackpot-ready';
        this._setButtonLabel(this.l4JackpotAction, 'Reveal Our Jackpot ❤️');
        if (this.l4JackpotAction) this.l4JackpotAction.disabled = false;
    }

    _showJackpotFinal(restored = false) {
        this.l4Phase = 'complete';
        this.l4JackpotAction?.classList.remove('is-in');
        if (this.l4JackpotAction) this.l4JackpotAction.hidden = true;
        if (this.l4JackpotReveal) {
            this.l4JackpotReveal.hidden = false;
            void this.l4JackpotReveal.offsetWidth;
            this.l4JackpotReveal.classList.add('is-visible');
        }
        this.l4JackpotGrid?.querySelectorAll('.sg-jackpot-card').forEach(card => card.classList.add('is-emphasized'));
        const token = ++this.l4SequenceToken;
        this.later(restored || this.reduced ? 0 : 1100, () => {
            if (token !== this.l4SequenceToken || this.state !== 'level4' || this.l4Phase !== 'complete') return;
            this._showTestBtn(this.l4ContinueBtn);
        });
    }

    _continueFromLevel4() {
        if (this.transitioning || this.state !== 'level4' || this.l4Phase !== 'complete') return;
        this._markLevelCompleted(4);
        this.l4ContinueBtn.disabled = true;
        this.levels.level4?.classList.add('is-exiting');
        this._queueLevelTransition('level4', () => {
            if (this.completedLevels.level5) this._restoreCompletedLevel5();
            else this._enterLevel5();
        }, this.reduced ? 0 : 420);
    }

    _enterLevel5() {
        const cur = this.levels.level4;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => {
                this._showLevel('level5', 5);
                this._renderLevel5();
            });
        } else {
            this._showLevel('level5', 5);
            this._renderLevel5();
        }
    }

    /* --------------------------------------------------------
       LEVEL 5 - UNLOCK MY HEART
       The internal stages intentionally remain transient. Only the
       final Continue commits Game 5 to the shared completion store.
       -------------------------------------------------------- */
    _renderLevel5() {
        this._cleanupLevel5();
        this.l5StageDone = 0;
        this.l5HoldProgress = 0;
        this.l5StoryProgressValue = 0;
        this.l5FindMisses = 0;
        this.l5HoldReleaseCount = 0;
        this.l5Panels?.forEach(panel => {
            panel.querySelectorAll('[data-l5-next]').forEach(btn => { btn.hidden = true; btn.disabled = false; btn.classList.remove('is-in'); });
            panel.querySelectorAll('.sg-l5-status').forEach(status => { status.textContent = ''; status.className = 'sg-l5-status'; });
        });
        this.l5FindField?.querySelectorAll('.sg-l5-find-object').forEach(btn => { btn.disabled = false; btn.classList.remove('is-missed', 'is-found'); });
        this.l5StoryField?.classList.remove('is-complete');
        this.l5Choices?.querySelectorAll('button').forEach(btn => { btn.disabled = false; btn.classList.remove('is-chosen'); });
        this.l5Choices?.classList.remove('is-visible');
        this.l5FinishBtn && (this.l5FinishBtn.hidden = true);
        this.l5FinishBtn?.classList.remove('is-in');
        this.l5FinishBtn && (this.l5FinishBtn.disabled = false);
        this.root?.querySelector('#sg-l5-unlock-heart')?.classList.remove('is-unlocked');
        this.root?.querySelector('#sg-l5-heart-thread')?.classList.remove('is-unlocking');
        this.root?.classList.remove('sg-l5-final-calm');
        this.l5StartBtn && (this.l5StartBtn.disabled = false);
        this.l5StartBtn?.classList.remove('is-in', 'is-pressed');
        this.l5Choices && (this.l5Choices.hidden = false);
        this._randomizeL5Find();
        this._setL5Stage('intro', true);
    }

    _cleanupLevel5() {
        this.l5Token += 1;
        this.l5Holding = false;
        this.l5HoldPointer = null;
        this.l5StoryTracing = false;
        this.l5StoryPointer = null;
        if (this.l5Raf) cancelAnimationFrame(this.l5Raf);
        this.l5Raf = null;
        this.l5HoldHeart?.classList.remove('is-holding', 'is-safe');
    }

    _randomizeL5Find() {
        const positions = [['12%','20%'],['39%','15%'],['74%','21%'],['21%','50%'],['57%','47%'],['87%','55%'],['12%','80%'],['42%','79%'],['73%','77%']];
        const shuffled = shuffle(positions);
        this.l5FindField?.querySelectorAll('.sg-l5-find-object').forEach((object, index) => {
            const [x, y] = shuffled[index]; object.style.setProperty('--x', x); object.style.setProperty('--y', y);
        });
    }

    _startL5FromIntro() {
        if (this.state !== 'level5' || this.l5Stage !== 'intro' || this.l5StartBtn?.disabled) return;
        this.l5StartBtn.disabled = true;
        this.l5StartBtn.classList.add('is-pressed');
        const token = this.l5Token;
        this.later(this.reduced ? 0 : 280, () => {
            if (token === this.l5Token && this.l5Stage === 'intro') this._setL5Stage('find');
        });
    }

    _revealL5Intro() {
        const panel = this._activeL5Panel();
        const lines = panel?.querySelectorAll('.sg-l5-intro-line');
        const heart = panel?.querySelector('.sg-l5-lock-heart');
        const token = this.l5Token;
        lines?.forEach(line => line.classList.remove('is-visible'));
        heart?.classList.remove('is-visible');
        this.l5StartBtn?.classList.remove('is-in');
        const reveal = (index) => {
            if (token !== this.l5Token || this.l5Stage !== 'intro') return;
            lines?.[index]?.classList.add('is-visible');
        };
        this.later(this.reduced ? 0 : 180, () => reveal(0));
        this.later(this.reduced ? 0 : 700, () => reveal(1));
        this.later(this.reduced ? 0 : 1050, () => { if (token === this.l5Token && this.l5Stage === 'intro') heart?.classList.add('is-visible'); });
        this.later(this.reduced ? 0 : 1250, () => reveal(2));
        this.later(this.reduced ? 0 : 1750, () => reveal(3));
        this.later(this.reduced ? 0 : 2150, () => {
            if (token === this.l5Token && this.l5Stage === 'intro') this.l5StartBtn?.classList.add('is-in');
        });
    }

    _setL5Stage(stage, immediate = false) {
        if (this.state !== 'level5') return;
        this._cleanupLevel5();
        this.l5Stage = stage;
        this.l5Panels?.forEach(panel => {
            const active = panel.dataset.l5Panel === stage;
            panel.hidden = !active;
            panel.classList.toggle('is-active', active);
        });
        this._updateL5Steps();
        this.levels.level5?.classList.toggle('is-intro', stage === 'intro');
        if (stage === 'intro') this._revealL5Intro();
        if (stage === 'hold') this._resetL5Hold();
        if (stage === 'story') this._resetL5Story();
        if (stage === 'choice') this._prepareL5Choice();
        if (stage === 'unlock') this._revealL5Unlock(immediate);
    }

    _updateL5Steps() {
        this.l5Steps?.forEach((step, index) => step.classList.toggle('is-done', index < this.l5StageDone));
        this.root?.querySelectorAll('#sg-l5-heart-thread i').forEach((ring, index) => ring.classList.toggle('is-done', index < this.l5StageDone));
    }

    _activeL5Panel() {
        return this.root?.querySelector(`[data-l5-panel="${this.l5Stage}"]`);
    }

    _l5Status(message, modifier = '') {
        const status = this._activeL5Panel()?.querySelector('.sg-l5-status');
        if (status) {
            status.textContent = message;
            status.className = `sg-l5-status ${modifier}`.trim();
        }
    }

    _showL5Next(label = 'CONTINUE') {
        const btn = this._activeL5Panel()?.querySelector('[data-l5-next]');
        if (!btn) return;
        this._setButtonLabel(btn, label);
        btn.hidden = false;
        void btn.offsetWidth;
        btn.classList.add('is-in');
    }

    _handleL5Find(event) {
        if (this.state !== 'level5' || this.l5Stage !== 'find') return;
        const object = event.target.closest('.sg-l5-find-object');
        if (!object || object.disabled) return;
        if (object.dataset.heart === 'true') {
            this.l5StageDone = Math.max(this.l5StageDone, 1);
            this.l5FindField?.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
            object.classList.add('is-found');
            this._updateL5Steps();
            this._l5Status('Of course... tum mujhe dhoond hi leti ho. ❤️', 'is-success');
            const token = this.l5Token;
            this.later(this.reduced ? 0 : 1050, () => {
                if (token !== this.l5Token || this.l5Stage !== 'find') return;
                this._l5Status('Pehla lock khul gaya. ✨', 'is-success');
                this._showL5Next();
            });
        } else {
            object.disabled = true;
            object.classList.add('is-missed');
            const messages = ['Yahan nahi 😌', 'Nice try...', 'Dil itna easily nahi milta 😏', 'Thoda aur dhundo... ❤️'];
            const message = messages[this.l5FindMisses % messages.length];
            this._l5Status(message);
            this.l5FindMisses += 1;
            const token = this.l5Token;
            this.later(this.reduced ? 0 : 1250, () => {
                if (token === this.l5Token && this.l5Stage === 'find') this._l5Status('');
            });
        }
    }

    _resetL5Hold() {
        this.l5HoldProgress = 0;
        if (this.l5HoldFill) this.l5HoldFill.style.strokeDashoffset = '327';
        if (this.l5HoldLabel) this.l5HoldLabel.textContent = 'Press and hold';
        this._l5Status('');
    }

    _startL5Hold(event) {
        if (this.state !== 'level5' || this.l5Stage !== 'hold' || this.l5StageDone >= 2) return;
        event.preventDefault();
        this.l5Holding = true;
        this.l5HoldPointer = event.pointerId;
        this.l5HoldHeart?.setPointerCapture?.(event.pointerId);
        this.l5HoldHeart?.classList.add('is-holding');
        this._l5Status(this.l5HoldProgress > .66 ? 'Bas aise hi...' : this.l5HoldProgress > .33 ? 'Safe lag raha hai... ❤️' : 'Thoda aur...');
        this.l5HoldLastFrame = performance.now();
        if (!this.l5Raf) this.l5Raf = requestAnimationFrame((now) => this._tickL5Hold(now));
    }

    _stopL5Hold(event) {
        if (event && this.l5HoldPointer != null && event.pointerId !== this.l5HoldPointer) return;
        this.l5Holding = false;
        this.l5HoldPointer = null;
        this.l5HoldHeart?.classList.remove('is-holding');
        if (this.l5HoldProgress > .12 && this.l5HoldProgress < 1 && this.l5HoldReleaseCount++ % 3 === 0) this._l5Status('Mat chhodo na... 😌');
    }

    _tickL5Hold(now) {
        this.l5Raf = null;
        if (this.state !== 'level5' || this.l5Stage !== 'hold' || this.l5StageDone >= 2) return;
        const elapsed = Math.min(48, now - this.l5HoldLastFrame || 16);
        this.l5HoldLastFrame = now;
        this.l5HoldProgress = Math.max(0, Math.min(1, this.l5HoldProgress + (elapsed / 3000) * (this.l5Holding ? 1 : -0.45)));
        if (this.l5HoldFill) this.l5HoldFill.style.strokeDashoffset = String(327 * (1 - this.l5HoldProgress));
        if (this.l5HoldLabel) this.l5HoldLabel.textContent = `${Math.round(this.l5HoldProgress * 100)}% held`;
        if (this.l5Holding) this._l5Status(this.l5HoldProgress > .66 ? 'Bas aise hi...' : this.l5HoldProgress > .33 ? 'Safe lag raha hai... ❤️' : 'Thoda aur...');
        if (this.l5HoldProgress >= 1) {
            this.l5StageDone = Math.max(this.l5StageDone, 2);
            this.l5Holding = false;
            this.l5HoldHeart?.classList.remove('is-holding');
            this.l5HoldHeart?.classList.add('is-safe');
            this._updateL5Steps();
            if (this.l5HoldLabel) this.l5HoldLabel.textContent = 'Safe.';
            this._l5Status('Exactly where it belongs. ❤️', 'is-success');
            const token = this.l5Token;
            this.later(this.reduced ? 0 : 1150, () => {
                if (token !== this.l5Token || this.l5Stage !== 'hold') return;
                this._l5Status('Dusra lock khul gaya. ✨', 'is-success');
                this._showL5Next();
            });
            return;
        }
        this.l5Raf = requestAnimationFrame((next) => this._tickL5Hold(next));
    }

    _resetL5Story() {
        const path = this.l5StoryPath;
        if (!path) return;
        this.l5StoryField?.classList.remove('is-complete', 'is-near-end');
        if (!this.l5StorySvg?.querySelector('.sg-l5-story-nodes')) {
            const nodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodes.setAttribute('class', 'sg-l5-story-nodes');
            [[95,104],[182,159],[261,127],[326,57]].forEach(([x, y]) => {
                const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                node.setAttribute('cx', x); node.setAttribute('cy', y); node.setAttribute('r', '5'); nodes.appendChild(node);
            });
            this.l5StorySvg?.insertBefore(nodes, this.l5StorySvg.querySelector('.sg-l5-story-start'));
        }
        const length = path.getTotalLength();
        this.l5StoryPoints = Array.from({ length: 101 }, (_, i) => path.getPointAtLength(length * i / 100));
        if (this.l5StoryProgress) {
            this.l5StoryProgress.style.strokeDasharray = String(length);
            this.l5StoryProgress.style.strokeDashoffset = String(length);
        }
        this.l5StoryField?.querySelectorAll('.sg-l5-story-nodes circle').forEach(node => node.classList.remove('is-lit'));
        if (this.l5StoryStatus) this.l5StoryStatus.textContent = 'Start from YOU';
        this._l5Status('');
    }

    _getL5SvgPoint(event) {
        const point = this.l5StorySvg?.createSVGPoint();
        const matrix = this.l5StorySvg?.getScreenCTM();
        if (!point || !matrix) return null;
        point.x = event.clientX; point.y = event.clientY;
        return point.matrixTransform(matrix.inverse());
    }

    _nearestL5StoryPoint(point) {
        let nearest = 0; let distance = Infinity;
        this.l5StoryPoints.forEach((sample, index) => {
            const d = Math.hypot(sample.x - point.x, sample.y - point.y);
            if (d < distance) { distance = d; nearest = index; }
        });
        return { nearest, distance };
    }

    _startL5Story(event) {
        if (this.state !== 'level5' || this.l5Stage !== 'story' || this.l5StageDone >= 3) return;
        const point = this._getL5SvgPoint(event); if (!point) return;
        const hit = this._nearestL5StoryPoint(point);
        if (hit.nearest > 10 || hit.distance > 34) { if (this.l5StoryStatus) this.l5StoryStatus.textContent = 'Start from YOU'; return; }
        event.preventDefault();
        this.l5StoryTracing = true; this.l5StoryPointer = event.pointerId;
        this.l5StoryField?.setPointerCapture?.(event.pointerId);
        if (this.l5StoryStatus) this.l5StoryStatus.textContent = 'Follow the light...';
    }

    _traceL5Story(event) {
        if (!this.l5StoryTracing || event.pointerId !== this.l5StoryPointer || this.l5Stage !== 'story') return;
        event.preventDefault();
        const point = this._getL5SvgPoint(event); if (!point) return;
        const hit = this._nearestL5StoryPoint(point);
        if (hit.distance > 32 || hit.nearest > this.l5StoryProgressValue + 14 || hit.nearest < this.l5StoryProgressValue - 8) return;
        if (hit.nearest > this.l5StoryProgressValue) this.l5StoryProgressValue = hit.nearest;
        const length = this.l5StoryPath?.getTotalLength() || 0;
        if (this.l5StoryProgress) this.l5StoryProgress.style.strokeDashoffset = String(length * (1 - this.l5StoryProgressValue / 100));
        this.l5StoryField?.querySelectorAll('.sg-l5-story-nodes circle').forEach((node, index) => node.classList.toggle('is-lit', this.l5StoryProgressValue >= [24, 49, 74, 94][index]));
        this.l5StoryField?.classList.toggle('is-near-end', this.l5StoryProgressValue >= 72);
        const checkpoints = [[25, 'Ek mulaqat...'], [50, 'Thodi si baatein...'], [75, 'Bahut saari yaadein...'], [96, 'Aur phir... hum. ❤️']];
        const checkpoint = checkpoints.filter(([at]) => this.l5StoryProgressValue >= at).pop();
        if (checkpoint && this.l5StoryStatus) this.l5StoryStatus.textContent = checkpoint[1];
        if (this.l5StoryProgressValue >= 98) this._completeL5Story();
    }

    _stopL5Story(event) {
        if (event && this.l5StoryPointer != null && event.pointerId !== this.l5StoryPointer) return;
        this.l5StoryTracing = false; this.l5StoryPointer = null;
    }

    _completeL5Story() {
        if (this.l5StageDone >= 3) return;
        this.l5StageDone = 3; this.l5StoryTracing = false; this._updateL5Steps();
        this.l5StoryField?.classList.add('is-complete');
        if (this.l5StoryStatus) this.l5StoryStatus.textContent = 'YOU + ME ♥';
        this._l5Status('Har raasta tum tak hi aata hai. ❤️', 'is-success');
        const token = this.l5Token;
        this.later(this.reduced ? 0 : 1050, () => {
            if (token !== this.l5Token || this.l5Stage !== 'story') return;
            this._l5Status('Teesra lock khul gaya. ✨', 'is-success');
            this._showL5Next();
        });
    }

    _prepareL5Choice() {
        const panel = this._activeL5Panel();
        const setup = panel?.querySelectorAll('.sg-l5-choice-setup p');
        const token = this.l5Token;
        this.l5Choices && (this.l5Choices.hidden = true);
        setup?.forEach(line => line.classList.remove('is-visible'));
        const reveal = (index) => {
            if (token !== this.l5Token || this.l5Stage !== 'choice') return;
            setup?.[index]?.classList.add('is-visible');
        };
        this.later(this.reduced ? 0 : 160, () => reveal(0));
        this.later(this.reduced ? 0 : 760, () => reveal(1));
        this.later(this.reduced ? 0 : 1460, () => reveal(2));
        this.later(this.reduced ? 0 : 2100, () => {
            if (token !== this.l5Token || this.l5Stage !== 'choice' || !this.l5Choices) return;
            this.l5Choices.hidden = false; void this.l5Choices.offsetWidth; this.l5Choices.classList.add('is-visible');
        });
        this.later(this.reduced ? 0 : 6400, () => {
            if (token === this.l5Token && this.l5Stage === 'choice' && this.l5StageDone < 4) this._l5Status('Waise answer mujhe already pata hai... 😌');
        });
    }

    _chooseL5Choice(event) {
        if (this.state !== 'level5' || this.l5Stage !== 'choice' || this.l5StageDone >= 4) return;
        const choice = event.target.closest('button'); if (!choice) return;
        this.l5StageDone = 4; this._updateL5Steps();
        this.l5Choices?.querySelectorAll('button').forEach(btn => { btn.disabled = true; btn.classList.toggle('is-chosen', btn === choice); });
        this._l5Status('Hmm...');
        const token = this.l5Token;
        this.later(this.reduced ? 0 : 720, () => {
            if (token === this.l5Token && this.l5Stage === 'choice') this._l5Status('Problem ye hai...');
        });
        this.later(this.reduced ? 0 : 1500, () => {
            if (token === this.l5Token && this.l5Stage === 'choice') this._l5Status('Wrong answer choose karne ka option diya hi nahi tha. 😌❤️', 'is-success');
        });
        this.later(this.reduced ? 0 : 2400, () => {
            if (token !== this.l5Token || this.l5Stage !== 'choice') return;
            this._l5Status('Har baar... tum. Chautha lock khul gaya. ✨', 'is-success');
            this._showL5Next('REVEAL MY HEART');
        });
    }

    _advanceL5Stage() {
        if (this.state !== 'level5') return;
        if (this.l5Stage === 'find' && this.l5StageDone >= 1) this._setL5Stage('hold');
        else if (this.l5Stage === 'hold' && this.l5StageDone >= 2) this._setL5Stage('story');
        else if (this.l5Stage === 'story' && this.l5StageDone >= 3) this._setL5Stage('choice');
        else if (this.l5Stage === 'choice' && this.l5StageDone >= 4) this._setL5Stage('unlock');
    }

    _revealL5Unlock(immediate) {
        const token = this.l5Token;
        const panel = this._activeL5Panel();
        const heart = panel?.querySelector('#sg-l5-unlock-heart');
        const thread = this.root?.querySelector('#sg-l5-heart-thread');
        let lastLine = panel?.querySelector('.sg-l5-reveal-last');
        if (!lastLine && panel && this.l5FinishBtn) {
            lastLine = document.createElement('p');
            lastLine.className = 'sg-l5-reveal-line sg-l5-reveal-last';
            lastLine.textContent = 'Aur ye to kab ka tumhara ho chuka hai.';
            panel.insertBefore(lastLine, this.l5FinishBtn);
        }
        thread?.classList.add('is-unlocking');
        this.root?.classList.add('sg-l5-final-calm');
        heart?.classList.add('is-unlocked');
        const lines = panel?.querySelectorAll('.sg-l5-reveal-line, .sg-l5-reveal-title');
        lines?.forEach(line => line.classList.remove('is-visible'));
        const reveal = (index) => {
            if (token !== this.l5Token || this.l5Stage !== 'unlock') return;
            lines?.[index]?.classList.add('is-visible');
        };
        this.later(immediate || this.reduced ? 0 : 650, () => reveal(0));
        this.later(immediate || this.reduced ? 0 : 1800, () => reveal(1));
        this.later(immediate || this.reduced ? 0 : 2900, () => reveal(2));
        this.later(immediate || this.reduced ? 0 : 4050, () => reveal(3));
        this.later(immediate || this.reduced ? 0 : 5100, () => {
            if (token !== this.l5Token || this.l5Stage !== 'unlock' || !this.l5FinishBtn) return;
            this.l5FinishBtn.hidden = false; void this.l5FinishBtn.offsetWidth; this.l5FinishBtn.classList.add('is-in');
        });
    }

    _finishLevel5() {
        if (this.transitioning || this.state !== 'level5' || this.l5Stage !== 'unlock' || this.l5StageDone !== 4) return;
        this.l5FinishBtn.disabled = true;
        this._markLevelCompleted(5);
        this._queueLevelTransition('level5', () => this._enterComplete(), this.reduced ? 0 : 500);
    }

    _enterComplete() {
        const cur = this.levels.level5;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => this._showComplete());
        } else {
            this._showComplete();
        }
    }

    _restoreCompletedLevel5() {
        this._showComplete();
    }

    /* --------------------------------------------------------
       COMPLETE
       -------------------------------------------------------- */
    _showComplete(restored = false) {
        this._hideAllLevels();
        this.state = 'complete';
        this._setProgress(5);
        // The shared Game HUD belongs to levels 1–5 only. The existing
        // completion scene owns the screen from this point onward.
        this._setGameProgressVisible(false);
        if (this.completeEl) {
            this.completeEl.hidden = false;
            void this.completeEl.offsetWidth;
            this.completeEl.classList.add('is-active');
        }
        if (this.shell) this.shell.scrollTop = 0;

        const showFinalActions = () => {
            if (this.completeUnlockBtn) {
                this.completeUnlockBtn.hidden = false;
                this.completeUnlockBtn.classList.add('is-in');
            }
            if (this.completeReplayBtn) {
                this.completeReplayBtn.disabled = false;
                this.completeReplayBtn.hidden = false;
                this.completeReplayBtn.classList.add('is-in');
            }
        };

        if (restored) {
            this.completeEl?.querySelectorAll('.sg-symbol, .sg-plus, .sg-heart-merge, .sg-complete-line')
                .forEach(el => el.classList.add('is-in'));
            showFinalActions();
            return;
        }

        // Animate symbols one by one
        const symbols = this.completeEl?.querySelectorAll('.sg-symbol');
        const pluses = this.completeEl?.querySelectorAll('.sg-plus');
        symbols?.forEach((el, i) => {
            el.classList.remove('is-in');
            this.later(i * 120, () => el.classList.add('is-in'));
        });
        pluses?.forEach((el, i) => {
            el.classList.remove('is-in');
            this.later(i * 120 + 60, () => el.classList.add('is-in'));
        });

        // Heart merge
        const merge = this.completeEl?.querySelector('.sg-heart-merge');
        if (merge) {
            merge.classList.remove('is-in');
            this.later((symbols?.length || 5) * 120 + 260, () => merge.classList.add('is-in'));
        }

        // Lines
        if (this.completeLine1) {
            this.completeLine1.classList.remove('is-in');
            this.later(1200, () => this.completeLine1.classList.add('is-in'));
        }
        if (this.completeLine2) {
            this.completeLine2.classList.remove('is-in');
            this.later(1900, () => this.completeLine2.classList.add('is-in'));
        }
        if (this.completeUnlockBtn) {
            this.completeUnlockBtn.classList.remove('is-in');
            this.completeUnlockBtn.hidden = true;
        }
        if (this.completeReplayBtn) {
            this.completeReplayBtn.classList.remove('is-in');
            this.completeReplayBtn.hidden = true;
        }
        this.later(2600, () => {
            showFinalActions();
            if (this.completeUnlockBtn) {
                this.completeUnlockBtn.focus({ preventScroll: true });
            }
        });
    }

    _enterReward() {
        this._clearLevelTimers();
        if (this.completeEl) {
            this.completeEl.classList.remove('is-active');
            this.later(this.reduced ? 0 : 380, () => {
                this.completeEl.hidden = true;
                this._showReward();
            });
        } else {
            this._showReward();
        }
    }

    _showReward() {
        // This is the only entry point into the unopened reward. Make the
        // completion panel exclusive even if a delayed transition was
        // interrupted or this screen is restored by the host app.
        this._hideCompleteUI();
        this.rewardRun += 1;
        this.rewardReady = false;
        this.rewardPhase = 'opening';
        this.state = 'reward';
        this.root?.classList.add('sg-reward-active');
        if (this.rewardEl) {
            this.rewardEl.hidden = false;
            void this.rewardEl.offsetWidth;
            this.rewardEl.classList.add('is-active');
        }
        if (this.shell) this.shell.scrollTop = 0;
        // envelope is locked initially
        if (this.envelope) {
            this.envelope.classList.remove('is-open');
            this.envelope.setAttribute('tabindex', '0');
            this.envelope.setAttribute('role', 'button');
            this.envelope.setAttribute('aria-label', 'Open your reward');
        }
        if (this.rewardCard) {
            this.rewardCard.classList.remove('is-in');
            this.rewardCard.hidden = true;
        }
        if (this.rewardContinueBtn) {
            this.rewardContinueBtn.classList.remove('is-in');
            this.rewardContinueBtn.hidden = true;
        }
        // hint
        const hint = this.rewardEl?.querySelector('#sg-reward-hint');
        if (hint) { hint.textContent = 'Tap the envelope to open it...'; hint.hidden = false; }
        this._onRewardShown?.();
    }

    _openEnvelope() {
        if (this.state !== 'reward' || !this.envelope) return;
        if (this.envelope.classList.contains('is-open')) return;
        const rewardRun = this.rewardRun;
        this.envelope.classList.add('is-open');
        const hint = this.rewardEl?.querySelector('#sg-reward-hint');
        if (hint) hint.hidden = true;

        this.later(this.reduced ? 0 : 720, () => {
            if (this.state !== 'reward' || rewardRun !== this.rewardRun || !this.envelope?.classList.contains('is-open')) return;
            if (this.rewardCard) {
                this.rewardCard.hidden = false;
                void this.rewardCard.offsetWidth;
                this.rewardCard.classList.add('is-in');
                // scroll card into view gently
                this.later(300, () => this.rewardCard.scrollIntoView({ behavior: this.reduced ? 'auto' : 'smooth', block: 'nearest' }));
            }
            this.later(this.reduced ? 0 : 800, () => this._revealRewardContinue(rewardRun));
        });
    }

    _revealRewardContinue(rewardRun) {
        if (this.state !== 'reward' || rewardRun !== this.rewardRun || this.rewardReady) return;
        this.rewardReady = true;
        this.rewardPhase = 'opened';
        if (!this.rewardContinueBtn) return;
        this.rewardContinueBtn.hidden = false;
        void this.rewardContinueBtn.offsetWidth;
        this.rewardContinueBtn.classList.add('is-in');
        this.rewardContinueBtn.focus({ preventScroll: true });
    }

    _handoffAfterReward() {
        // Clean transition out of game, then call main.js hook
        this._clearAllTimers();
        if (this.root) {
            this.root.classList.add('is-leaving');
            this.later(this.reduced ? 0 : 600, () => {
                this.root.classList.remove('is-visible', 'is-leaving');
                this.root.hidden = true;
                this.state = 'done';
                // notify host
                if (typeof this._onRewardContinue === 'function') {
                    try { this._onRewardContinue(); } catch (e) { console.warn('reward handoff failed', e); }
                } else {
                    // fallback: reveal future sections directly
                    document.querySelectorAll('#scene-3, #scene-4, #scene-5, #scene-6, #scene-7, #scene-8').forEach(el => {
                        if (el) { el.hidden = false; el.classList.add('is-visible'); }
                    });
                    window.scrollTo(0, 0);
                }
            });
        } else {
            if (typeof this._onRewardContinue === 'function') {
                try { this._onRewardContinue(); } catch {}
            }
        }
    }

    /* --------------------------------------------------------
       Single authoritative transition - the ONLY way a level
       advances. The pending transition is tracked so cleanup and
       browser visibility recovery can always release its lock.
       -------------------------------------------------------- */
    _queueLevelTransition(expectedState, nextFn, delay = 750) {
        if (this.transitioning) return;
        if (this.state !== expectedState || this.destroyed) return;
        this.transitioning = true;
        const token = ++this.transitionToken;
        this.pendingTransition = { token, expectedState, nextFn };
        this.later(delay, () => this._finishPendingTransition(token));
    }

    _finishPendingTransition(token) {
        const pending = this.pendingTransition;
        if (!pending || pending.token !== token) return;
        this.pendingTransition = null;
        this.transitioning = false;
        if (this.destroyed || this.state !== pending.expectedState) return;
        pending.nextFn();
    }

    /* --------------------------------------------------------
       Timer helpers
       -------------------------------------------------------- */
    later(ms, fn) {
        const id = setTimeout(fn, ms);
        this.timers.push(id);
        return id;
    }
    _clearLevelTimers() {
        // Clear short-lived level transition timers but keep game alive
        // For now clear all - re-used for each level
        this._clearAllTimers();
    }
    _clearAllTimers() {
        for (const id of this.timers) clearTimeout(id);
        this.timers = [];
        this.pendingTransition = null;
        this.transitionToken += 1;
        this.transitioning = false;
        for (const id of this.rafs) cancelAnimationFrame(id);
        this.rafs = [];
        if (this.l5Raf) { cancelAnimationFrame(this.l5Raf); this.l5Raf = null; }
    }
}
