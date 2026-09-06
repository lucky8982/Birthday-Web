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
            (GAME2_MEMORY_DATA, MIND_READING_DATA,
             CHEMISTRY_QUESTIONS, JACKPOT_CATEGORIES,
             SECRET_REWARD, GAME_META).
   ============================================================ */

import { sleep, prefersReducedMotion } from './utils.js';
import {
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
const SECRET_GAME_PHASES = new Set(['gameplay', 'reward', 'kiss-reveal', 'complete']);
const GAME5_STAGES = new Set(['intro', 'find', 'hold', 'story', 'choice', 'unlock']);
const KISS_PENALTY_GAMES = Object.freeze(['game2', 'game3', 'game4', 'game5']);

function emptyKissPenalty() {
    return { game2: 0, game3: 0, game4: 0, game5: 0 };
}

function normalizeKissPenalty(value) {
    const normalized = emptyKissPenalty();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
    KISS_PENALTY_GAMES.forEach((game) => {
        if (Number.isFinite(value[game]) && Number.isInteger(value[game]) && value[game] >= 0) {
            normalized[game] = value[game];
        }
    });
    return normalized;
}

function normalizeGame5Substate(stage, stageDone) {
    const stageBounds = {
        intro: [0, 0], find: [0, 1], hold: [1, 2],
        story: [2, 3], choice: [3, 4], unlock: [4, 4],
    };
    const bounds = stageBounds[stage];
    if (!GAME5_STAGES.has(stage) || !bounds || !Number.isInteger(stageDone) ||
        stageDone < bounds[0] || stageDone > bounds[1]) {
        return { game5Stage: null, game5StageDone: 0 };
    }
    return { game5Stage: stage, game5StageDone: stageDone };
}

function normalizeGameProgress(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const normalized = {};
    const game1Order = value.game1?.order;
    const ids = PHOTO_MEMORY_PUZZLE.map(memory => memory.id);
    if (Array.isArray(game1Order) && game1Order.length === ids.length &&
        new Set(game1Order).size === ids.length && game1Order.every(id => ids.includes(id))) {
        normalized.game1 = { order: [...game1Order] };
    }

    const game2 = value.game2;
    if (game2 && Number.isInteger(game2.slot) && game2.slot >= 0 && game2.slot < GAME2_MEMORY_DATA.length &&
        (game2.stage === 'original' || game2.stage === 'recovery') &&
        Number.isInteger(game2.attempts) && game2.attempts >= 0 && game2.attempts <= 1 &&
        Number.isInteger(game2.totalWrongAnswers) && game2.totalWrongAnswers >= 0 && game2.totalWrongAnswers <= 12 &&
        Array.isArray(game2.wrongChoices) && game2.wrongChoices.length === game2.attempts &&
        game2.wrongChoices.every(index => Number.isInteger(index) && index >= 0 && index < (GAME2_MEMORY_DATA[game2.slot]?.[game2.stage]?.options.length || 0))) {
        normalized.game2 = {
            slot: game2.slot, stage: game2.stage, attempts: game2.attempts,
            totalWrongAnswers: game2.totalWrongAnswers, wrongChoices: [...game2.wrongChoices],
        };
    }

    const game3 = value.game3;
    if (game3 && (game3.phase === 'mind' || game3.phase === 'who') &&
        Number.isInteger(game3.index) && game3.index >= 0 &&
        game3.index < (game3.phase === 'mind' ? MIND_READING_DATA.length : WHO_WOULD_DATA.length)) {
        normalized.game3 = { phase: game3.phase, index: game3.index };
    }

    const game4 = value.game4;
    const validGame4Phase = new Set(['chemistry', 'chemistry-reveal', 'jackpot', 'jackpot-ready']);
    if (game4 && validGame4Phase.has(game4.phase)) {
        const results = game4.results && typeof game4.results === 'object' && !Array.isArray(game4.results) ? game4.results : {};
        const resultsValid = Object.entries(results).every(([key, result]) => {
            const category = JACKPOT_CATEGORIES.find(item => item.key === key);
            return category && category.options.includes(result);
        });
        const selectedValid = Number.isInteger(game4.selectedChoice) && game4.selectedChoice >= -1 &&
            game4.selectedChoice < (CHEMISTRY_QUESTIONS[game4.questionIndex]?.choices.length || 0);
        if (Number.isInteger(game4.questionIndex) && game4.questionIndex >= 0 && game4.questionIndex < CHEMISTRY_QUESTIONS.length &&
            selectedValid && resultsValid) {
            normalized.game4 = {
                phase: game4.phase, questionIndex: game4.questionIndex,
                selectedChoice: game4.selectedChoice, results: { ...results },
            };
        }
    }
    return normalized;
}

function defaultSecretGameProgress() {
    return {
        highestCompletedGame: 0, currentGame: null, game5Completed: false,
        currentPhase: 'gameplay', game5Stage: null, game5StageDone: 0,
        gameProgress: {}, kissPenalty: emptyKissPenalty(),
    };
}

function loadSecretGameProgress() {
    try {
        const raw = window.localStorage.getItem(SECRET_GAME_PROGRESS_KEY);
        if (!raw) return defaultSecretGameProgress();
        const data = JSON.parse(raw);
        const highestCompletedGame = data?.highestCompletedGame;
        if (data?.version !== SECRET_GAME_PROGRESS_VERSION ||
            !Number.isInteger(highestCompletedGame) ||
            highestCompletedGame < 0 || highestCompletedGame > 5 ||
            !(data.currentGame == null || (Number.isInteger(data.currentGame) && data.currentGame >= 1 && data.currentGame <= 5)) ||
            typeof data.game5Completed !== 'boolean' ||
            data.game5Completed !== (highestCompletedGame === 5)) {
            return defaultSecretGameProgress();
        }
        const currentPhase = data.currentPhase == null
            ? (data.game5Completed ? 'complete' : 'gameplay')
            : data.currentPhase;
        if (!SECRET_GAME_PHASES.has(currentPhase)) {
            return defaultSecretGameProgress();
        }
        const gameProgress = normalizeGameProgress(data.gameProgress);
        const legacyGame2Kisses = gameProgress.game2?.totalWrongAnswers
            ? gameProgress.game2.totalWrongAnswers * 5
            : 0;
        const kissPenalty = data.kissPenalty == null
            ? { ...emptyKissPenalty(), game2: legacyGame2Kisses }
            : normalizeKissPenalty(data.kissPenalty);
        return {
            highestCompletedGame,
            currentGame: data.currentGame ?? null,
            game5Completed: data.game5Completed,
            currentPhase,
            ...normalizeGame5Substate(data.game5Stage, data.game5StageDone),
            gameProgress,
            kissPenalty,
        };
    } catch {
        return defaultSecretGameProgress();
    }
}

function saveSecretGameProgress(highestCompletedGame, currentGame = null, currentPhase = 'gameplay', game5Stage = null, game5StageDone = 0, gameProgress = {}, kissPenalty = emptyKissPenalty()) {
    try {
        window.localStorage.setItem(SECRET_GAME_PROGRESS_KEY, JSON.stringify({
            version: SECRET_GAME_PROGRESS_VERSION,
            highestCompletedGame,
            currentGame,
            game5Completed: highestCompletedGame === 5,
            currentPhase,
            ...normalizeGame5Substate(game5Stage, game5StageDone),
            gameProgress: normalizeGameProgress(gameProgress),
            kissPenalty: normalizeKissPenalty(kissPenalty),
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
        this.kissRevealEl = null;
        this.kissRevealTotalEl = null;
        this.kissRevealZeroEl = null;
        this.kissRevealContinueBtn = null;
        this.kissRevealToken = 0;
        this.completeEl = null;
        this.rewardEl = null;

        // Level 1 refs
        this.l1List = null;
        this.l1Feedback = null;
        this.l1CheckBtn = null;       // dedicated Game 1 validation button
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
        this.l3ChoiceOrder = null;
        this.l3ChoiceOrderKey = '';

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
        this.persistedProgress = defaultSecretGameProgress();
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

        this.reduced = prefersReducedMotion();
        this.state = 'idle'; // idle | intro | level1..level5 | complete | reward
        this.timers = [];
        this.rafs = [];
        this.boundHandlers = [];
        this.started = false;
        this.transitioning = false; // lock to prevent double progression
        this.pendingTransition = null;
        this.transitionToken = 0;
        this.lifecycleToken = 0;
        this.destroyed = false;
        this._lastPassMsg = null;     // avoid repeating the same TEST PASS message
        this._lastRetryMsg = null;    // avoid repeating the same TEST FAIL message
        this._failToken = 0;          // only the latest TEST FAIL message auto-clears
        this._onRewardContinue = null; // wired by main.js
        this._onRewardShown = null;    // wired by main.js
        this._onRewardPhaseChange = null; // wired by main.js
    }

    /* --------------------------------------------------------
       Lifecycle
       -------------------------------------------------------- */
    init() {
        this.root = document.querySelector('#secret-game');
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
        this.kissRevealEl = this.root.querySelector('#sg-kiss-reveal');
        this.kissRevealTotalEl = this.root.querySelector('#sg-kiss-reveal-total');
        this.kissRevealZeroEl = this.root.querySelector('#sg-kiss-reveal-zero');
        this.kissRevealContinueBtn = this.root.querySelector('#sg-kiss-reveal-continue');
        this.completeEl = this.root.querySelector('#sg-complete');
        this.rewardEl = this.root.querySelector('#sg-reward');

        // L1
        this.l1List = this.root.querySelector('#sg-l1-list');
        this.l1Feedback = this.root.querySelector('#sg-l1-feedback');
        this.l1CheckBtn = this.root.querySelector('#sg-l1-check');

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

        this.reduced = prefersReducedMotion();
        this._hydratePersistedProgress();
        this.destroyed = false;
        this.transitioning = false;
        this._spawnBgStars();
        this._wireOnce();
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

        // ONE authoritative progression path per level:
        // solve puzzle -> dedicated TEST button validates exactly once
        // -> PASS advances via _queueLevelTransition / FAIL stays.
        on(this.l1CheckBtn, 'click', () => this._validateLevel1());
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
        on(this.kissRevealContinueBtn, 'click', () => this._continueFromKissReveal());

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
    // Entry point from main.js after the post-memory message.
    async start() {
        if (this.started) return;
        this.started = true;
        this._clearAllTimers();
        const lifecycle = this.lifecycleToken;
        this.state = 'intro';

        // main.js has already hidden the previous scene.
        if (this.root) {
            this.root.hidden = false;
            // Preserve the existing scene-handoff pacing.
            await sleep(this.reduced ? 0 : 520);
            if (lifecycle !== this.lifecycleToken || this.destroyed || !this.started) return;
            void this.root.offsetWidth;
            this.root.classList.add('is-visible');
            this.root.classList.remove('is-leaving');
        }

        // Reset all levels to hidden
        this._hideAllLevels();
        if (this.introEl) this.introEl.hidden = false;
        this._hideKissReveal();
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
    set onRewardPhaseChange(fn) { this._onRewardPhaseChange = fn; }

    // Used only when Back returns from the final letter. It restores the
    // already-earned reward; no level, score, or game progress is replayed.
    restoreReward({ phase = 'opened' } = {}) {
        if (this.destroyed || !this.root || !this.persistedProgress.game5Completed) return false;
        const opened = phase === 'opened';
        this._clearAllTimers();
        this.started = true;
        this._hideAllLevels();
        this._hideKissReveal();
        this._hideCompleteUI();
        this.rewardReady = opened;
        this.rewardPhase = opened ? 'opened' : 'opening';
        this.state = 'reward';
        this._setGameProgressVisible(false);
        this.root.hidden = false;
        this.root.classList.remove('is-leaving');
        this.root.classList.add('is-visible', 'sg-reward-active');
        if (this.rewardEl) { this.rewardEl.hidden = false; this.rewardEl.classList.add('is-active'); }
        if (this.envelope) this.envelope.classList.toggle('is-open', opened);
        if (this.rewardCard) { this.rewardCard.hidden = !opened; this.rewardCard.classList.toggle('is-in', opened); }
        if (this.rewardContinueBtn) { this.rewardContinueBtn.hidden = !opened; this.rewardContinueBtn.classList.toggle('is-in', opened); }
        const hint = this.rewardEl?.querySelector('#sg-reward-hint');
        if (hint) hint.hidden = opened;
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
        else if (state === 'level5') this._restoreCompletedLevel4();
        else if (state === 'kiss-reveal') this._restoreLevel5Reward();
        else if (state === 'complete') this._showKissReveal(true);
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
        const gameProgress = { ...this.persistedProgress.gameProgress };
        this.persistedProgress = {
            highestCompletedGame,
            currentGame: gameNumber,
            game5Completed: highestCompletedGame === 5,
            currentPhase: 'reward',
            game5Stage: gameNumber === 5 ? null : this.persistedProgress.game5Stage,
            game5StageDone: gameNumber === 5 ? 0 : this.persistedProgress.game5StageDone,
            gameProgress,
            kissPenalty: this.persistedProgress.kissPenalty,
        };
        Object.keys(this.completedLevels).forEach((key, index) => {
            if (index < highestCompletedGame) this.completedLevels[key] = true;
        });
        saveSecretGameProgress(highestCompletedGame, this.persistedProgress.currentGame, this.persistedProgress.currentPhase, this.persistedProgress.game5Stage, this.persistedProgress.game5StageDone, this.persistedProgress.gameProgress, this.persistedProgress.kissPenalty);
    }

    _recordCurrentGame(gameNumber, currentPhase = 'gameplay') {
        this.persistedProgress = { ...this.persistedProgress, currentGame: gameNumber, currentPhase };
        saveSecretGameProgress(this.persistedProgress.highestCompletedGame, gameNumber, currentPhase, this.persistedProgress.game5Stage, this.persistedProgress.game5StageDone, this.persistedProgress.gameProgress, this.persistedProgress.kissPenalty);
    }

    _hasUnfinishedGameCheckpoint(gameNumber) {
        if (this.persistedProgress.highestCompletedGame >= gameNumber) return false;
        if (gameNumber === 5) return !!this.persistedProgress.game5Stage;
        return !!this.persistedProgress.gameProgress[`game${gameNumber}`];
    }

    _recordGameProgress(game, checkpoint) {
        const gameProgress = { ...this.persistedProgress.gameProgress, [game]: checkpoint };
        this.persistedProgress = { ...this.persistedProgress, gameProgress: normalizeGameProgress(gameProgress) };
        saveSecretGameProgress(this.persistedProgress.highestCompletedGame, this.persistedProgress.currentGame, this.persistedProgress.currentPhase, this.persistedProgress.game5Stage, this.persistedProgress.game5StageDone, this.persistedProgress.gameProgress, this.persistedProgress.kissPenalty);
    }

    _recordGame5Stage(stage, stageDone = this.l5StageDone) {
        const substate = normalizeGame5Substate(stage, stageDone);
        const phase = stage === 'unlock' ? 'reward' : 'gameplay';
        this.persistedProgress = {
            ...this.persistedProgress,
            currentGame: 5,
            currentPhase: phase,
            ...substate,
        };
        saveSecretGameProgress(this.persistedProgress.highestCompletedGame, 5, phase, substate.game5Stage, substate.game5StageDone, this.persistedProgress.gameProgress, this.persistedProgress.kissPenalty);
    }

    _addKissPenalty(game) {
        if (!KISS_PENALTY_GAMES.includes(game)) return 0;
        const kissPenalty = normalizeKissPenalty(this.persistedProgress.kissPenalty);
        kissPenalty[game] += 5;
        this.persistedProgress = { ...this.persistedProgress, kissPenalty };
        saveSecretGameProgress(this.persistedProgress.highestCompletedGame, this.persistedProgress.currentGame, this.persistedProgress.currentPhase, this.persistedProgress.game5Stage, this.persistedProgress.game5StageDone, this.persistedProgress.gameProgress, kissPenalty);
        return 5;
    }

    _restorePersistedProgress() {
        const highest = this.persistedProgress.highestCompletedGame;
        const currentGame = this.persistedProgress.currentGame;
        const currentPhase = this.persistedProgress.currentPhase;

        // An explicitly saved result screen is more specific than the
        // completed-game frontier and must win during refresh restoration.
        if (currentPhase === 'reward' && Number.isInteger(currentGame)) {
            this._restoreGameReward(currentGame);
            return true;
        }

        if (currentPhase === 'kiss-reveal' && this.persistedProgress.game5Completed) {
            this._showKissReveal(true);
            return true;
        }

        if (currentPhase === 'complete' && this.persistedProgress.game5Completed) {
            this._showComplete(true);
            return true;
        }

        if (!highest) {
            if (currentGame === 1) {
                this._restoreGame1Gameplay();
                return true;
            }
            return false;
        }

        if (this.persistedProgress.game5Completed) {
            this._showComplete(true);
            return true;
        }

        if (highest === 1) {
            this._restoreGame2Gameplay();
        } else if (highest === 2) {
            this._restoreGame3Gameplay();
        } else if (highest === 3) {
            this._restoreGame4Gameplay();
        } else if (highest === 4) {
            this._restoreGame5Gameplay();
        }
        return true;
    }

    _restoreGameReward(gameNumber) {
        if (gameNumber === 1) this._restoreCompletedLevel1();
        else if (gameNumber === 2) this._restoreCompletedLevel2();
        else if (gameNumber === 3) this._restoreCompletedLevel3();
        else if (gameNumber === 4) this._restoreCompletedLevel4();
        else if (gameNumber === 5) this._restoreLevel5Reward();
    }

    _restoreGame1Gameplay() {
        this._showLevel('level1', 1);
        this._renderLevel1(true, this.persistedProgress.gameProgress.game1?.order);
    }

    _restoreGame2Gameplay() {
        const checkpoint = this.persistedProgress.gameProgress.game2;
        this._showLevel('level2', 2);
        this._renderLevel2(checkpoint);
    }

    _restoreGame3Gameplay() {
        const checkpoint = this.persistedProgress.gameProgress.game3;
        this._showLevel('level3', 3);
        this.l3Phase = checkpoint?.phase || 'mind';
        this.l3MindIndex = this.l3Phase === 'mind' ? (checkpoint?.index || 0) : MIND_READING_DATA.length - 1;
        this.l3WhoIndex = this.l3Phase === 'who' ? (checkpoint?.index || 0) : 0;
        this.l3Pick = -1;
        this.l3Locked = false;
        this._renderLevel3Question();
    }

    _restoreGame4Gameplay() {
        const checkpoint = this.persistedProgress.gameProgress.game4;
        this._showLevel('level4', 4);
        this.l4Restored = false;
        this.l4QuestionIndex = checkpoint?.questionIndex || 0;
        const selectedChoice = checkpoint?.selectedChoice ?? -1;
        this.l4Results = { ...(checkpoint?.results || {}) };
        this.l4JackpotRunning = false;
        this.l4SequenceToken += 1;
        if (checkpoint?.phase === 'jackpot' || checkpoint?.phase === 'jackpot-ready') {
            this.l4Phase = checkpoint.phase;
            this._showJackpotStage();
            this._renderJackpotCards(checkpoint.phase === 'jackpot-ready');
            return;
        }
        this._showChemistryStage();
        this._renderChemistryQuestion();
        if (selectedChoice >= 0) {
            this.l4SelectedChoice = selectedChoice;
            this._restoreChemistryChoice(checkpoint?.phase === 'chemistry-reveal');
        }
    }

    _playAgain() {
        if (this.state !== 'complete' || this.transitioning) return;
        this.transitioning = true;
        this.completeReplayBtn && (this.completeReplayBtn.disabled = true);
        clearSecretGameProgress();
        this.persistedProgress = defaultSecretGameProgress();
        this.completedLevels = { level1: false, level2: false, level3: false, level4: false, level5: false };
        this._clearAllTimers();
        this._cleanupL1Drag();
        this.l1Restored = false;
        this.l4Restored = false;
        this.l3SequenceToken += 1;
        this.l4SequenceToken += 1;
        this._hideAllLevels();
        this._hideKissReveal();
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
        this._hideKissReveal();
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
        this._recordCurrentGame(1, 'reward');
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
    }

    _restoreCompletedLevel2() {
        this._showLevel('level2', 2);
        this._recordCurrentGame(2, 'reward');
        ++this.l2RoundToken;
        this.l2Locked = true;
        this.l2TotalWrongAnswers = this.persistedProgress.gameProgress.game2?.totalWrongAnswers || 0;
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
            this._recordCurrentGame(3);
            this._queueLevelTransition('level2', () => {
                if (this.completedLevels.level3) this._restoreCompletedLevel3();
                else this._enterLevel3();
            }, this.reduced ? 0 : 420);
        }, { once: true });
        wrap.appendChild(button);
    }

    _restoreCompletedLevel3() {
        this._showLevel('level3', 3);
        this._recordCurrentGame(3, 'reward');
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
        this._recordCurrentGame(4, 'reward');
        this.l4Restored = true;
        this.l4Phase = 'complete';
        this.l4Results = { ...(this.persistedProgress.gameProgress.game4?.results || {}) };
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
    _showFailFeedback(el, shakeEl = null, prefix = 'TEST FAIL') {
        const msg = pickMessage(TEST_RETRY_MESSAGES, this._lastRetryMsg);
        this._lastRetryMsg = msg;
        el.textContent = `${prefix} — ${msg}`;
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
            if (el.textContent.startsWith(prefix)) {
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
        const resume = this._hasUnfinishedGameCheckpoint(1);
        const wait = this.introEl ? (this.reduced ? 0 : 420) : 0;
        if (this.introEl) this.introEl.classList.remove('is-in');
        this._queueLevelTransition('intro', () => {
            if (this.introEl) this.introEl.hidden = true;
            if (resume) this._restoreGame1Gameplay();
            else {
                this._showLevel('level1', 1);
                this._renderLevel1();
            }
        }, wait);
    }

    _renderLevel1(restored = false, savedOrder = null) {
        if (!this.l1List) return;
        this.l1Restored = false;
        this._cleanupL1Drag();
        const level = this.levels.level1;
        level?.querySelector('.sg-level-eyebrow')?.replaceChildren('01 / 05 — HAMARI YAADEN');
        level?.querySelector('.sg-level-title')?.replaceChildren('Hamari Yaadein ❤️');
        level?.querySelector('.sg-level-subtitle')?.replaceChildren('Hamari mulaqat ke sequence ke according photos ko sahi order mein jamao ❤️');
        this.l1List.innerHTML = '';
        this.l1Feedback.textContent = '';
        this.l1Feedback.className = 'sg-feedback';
        this._setButtonLabel(this.l1CheckBtn, 'CHECK KARO');
        this._showTestBtn(this.l1CheckBtn);

        // The source data remains untouched. A solved random shuffle is retried.
        const correctIds = this._l1CorrectIds();
        if (savedOrder) {
            const byId = new Map(PHOTO_MEMORY_PUZZLE.map(memory => [memory.id, memory]));
            this.l1Order = [...savedOrder];
            this.l1Shuffled = this.l1Order.map(id => byId.get(id));
        } else {
            do {
                this.l1Shuffled = shuffle(PHOTO_MEMORY_PUZZLE);
                this.l1Order = this.l1Shuffled.map(memory => memory.id);
            } while (this.l1Order.every((id, index) => id === correctIds[index]));
        }

        const fragment = document.createDocumentFragment();
        this.l1Shuffled.forEach((memory, idx) => {
            const card = document.createElement('div');
            card.className = 'sg-memory-photo';
            card.setAttribute('data-id', memory.id);
            card.setAttribute('role', 'listitem');
            card.setAttribute('aria-label', `Photo ${idx + 1}. Drag karke order badlo.`);
            const arrival = L1_ARRIVAL_VECTORS[idx % L1_ARRIVAL_VECTORS.length];
            card.style.setProperty('--memory-entry-x', arrival.x);
            card.style.setProperty('--memory-entry-y', arrival.y);
            card.style.setProperty('--memory-entry-rotate', arrival.rotate);
            card.style.setProperty('--memory-entry-delay', `${760 + idx * 70}ms`);
            card.style.setProperty('--memory-object-position', memory.objectPosition);
            card.innerHTML = `
                <img src="${memory.src}" alt="" draggable="false" decoding="async">
            `;
            card.addEventListener('pointerdown', (event) => this._l1PointerDown(event, memory.id));
            fragment.appendChild(card);
        });
        this.l1List.appendChild(fragment);
        this._recordGameProgress('game1', { order: [...this.l1Order] });
        if (restored) this._scheduleLevel1AutoValidation();
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
        if (drag.active && this.state === 'level1') {
            this._recordGameProgress('game1', { order: [...this.l1Order] });
            this._scheduleLevel1AutoValidation();
        }
        this.l1Drag = null;
    }

    _isLevel1OrderCorrect() {
        const correctIds = this._l1CorrectIds();
        const cards = [...(this.l1List?.querySelectorAll('.sg-memory-photo') || [])];
        const cardIds = cards.map(card => card.getAttribute('data-id'));
        return this.l1Order.length === correctIds.length &&
            new Set(this.l1Order).size === correctIds.length &&
            this.l1Order.every((id, index) => id === correctIds[index]) &&
            cards.length === correctIds.length &&
            new Set(cardIds).size === correctIds.length &&
            cardIds.every((id, index) => id === this.l1Order[index]);
    }

    _scheduleLevel1AutoValidation() {
        this.later(this.reduced ? 0 : 180, () => {
            if (this.transitioning || this.state !== 'level1' || !this._isLevel1OrderCorrect()) return;
            this._validateLevel1();
        });
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
            this._recordCurrentGame(2);
            this._queueLevelTransition('level1', () => {
                if (this.completedLevels.level2) this._restoreCompletedLevel2();
                else this._enterLevel2();
            }, this.reduced ? 0 : 420);
            return;
        }

        const correctIds = this._l1CorrectIds();
        const isCorrect = this._isLevel1OrderCorrect();

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
            this._showFailFeedback(this.l1Feedback, this.l1List, 'Order abhi sahi nahi hai');
        }
    }

    /* --------------------------------------------------------
       LEVEL 2 - OUR MEMORY DETECTOR
       -------------------------------------------------------- */
    _enterLevel2() {
        const resume = this._hasUnfinishedGameCheckpoint(2);
        this._recordCurrentGame(2);
        const cur = this.levels.level1;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => {
                if (resume) this._restoreGame2Gameplay();
                else {
                    this._showLevel('level2', 2);
                    this._renderLevel2();
                }
            });
        } else {
            if (resume) this._restoreGame2Gameplay();
            else {
                this._showLevel('level2', 2);
                this._renderLevel2();
            }
        }
    }

    _renderLevel2(checkpoint = null) {
        if (!this.l2StageEl || !this.l2Card) return;
        this.l2MainSlot = checkpoint?.slot || 0;
        this.l2Stage = checkpoint?.stage || 'original';
        this.l2Attempts = checkpoint?.attempts || 0;
        this.l2WrongChoices = [...(checkpoint?.wrongChoices || [])];
        this.l2SelectedIndex = -1;
        this.l2TotalWrongAnswers = checkpoint?.totalWrongAnswers || 0;
        this.l2Locked = false;
        this.l2RoundToken += 1;
        this._renderLevel2Round(!!checkpoint);
    }

    _getLevel2Memory() { return GAME2_MEMORY_DATA[this.l2MainSlot]?.[this.l2Stage] || null; }

    _renderLevel2Round(preserveAttempt = false) {
        const memory = this._getLevel2Memory();
        if (!memory || !this.l2StageEl || !this.l2Card) return;
        if (!preserveAttempt) {
            this.l2Attempts = 0;
            this.l2WrongChoices = [];
        }
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
        const portraitImage = memory.imageFit === 'contain';
        frame.className = `sg-game2-image-frame is-loading${portraitImage ? ' is-portrait' : ''}`;
        const image = document.createElement('img');
        image.className = `sg-game2-image is-obscured${portraitImage ? ' is-portrait' : ''}`; image.src = memory.image; image.alt = memory.title; image.decoding = 'async';
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
        chances.textContent = this.l2Attempts === 1 ? '1 Chance Left ❤️' : '2 Chances ❤️';
        const status = document.createElement('div');
        status.className = 'sg-game2-status'; status.append(chances);
        const options = document.createElement('div');
        options.className = 'sg-game2-options'; options.setAttribute('role', 'group'); options.setAttribute('aria-label', `Answers for ${memory.title}`);
        memory.options.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'sg-game2-option'; button.textContent = label;
            button.style.setProperty('--option-delay', `${this.reduced ? 0 : index * 70}ms`);
            button.addEventListener('click', () => this._handleLevel2Choice(index, button));
            if (this.l2WrongChoices.includes(index)) { button.disabled = true; button.classList.add('is-wrong'); }
            options.appendChild(button);
        });
        const feedback = document.createElement('p');
        feedback.className = 'sg-game2-feedback'; feedback.setAttribute('aria-live', 'polite'); this.l2Feedback = feedback;
        this.l2StageEl.append(heading, frame, status, options, feedback);
        if (image.complete && image.naturalWidth > 0) settleImage();
        this._recordGameProgress('game2', {
            slot: this.l2MainSlot, stage: this.l2Stage, attempts: this.l2Attempts,
            totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [...this.l2WrongChoices],
        });
    }

    _handleLevel2Choice(index, button) {
        const memory = this._getLevel2Memory();
        if (!memory || this.l2Locked || this.transitioning || this.state !== 'level2' || button.disabled) return;
        this.l2Locked = true; this.l2SelectedIndex = index;
        if (index === memory.correctIndex) { this._resolveLevel2Correct(button, memory); return; }
        this.l2TotalWrongAnswers += 1; this.l2Attempts += 1;
        this._addKissPenalty('game2');
        if (this.l2Attempts === 1) this.l2WrongChoices.push(index);
        button.disabled = true; button.classList.add('is-wrong');
        const chances = this.l2StageEl?.querySelector('.sg-game2-chances');
        if (chances) chances.textContent = this.l2Attempts === 1 ? '1 Chance Left ❤' : '0 Chances';
        this.l2Card?.classList.remove('is-penalty'); void this.l2Card?.offsetWidth; this.l2Card?.classList.add('is-penalty');
        if (this.l2Attempts === 1) {
            this._recordGameProgress('game2', {
                slot: this.l2MainSlot, stage: this.l2Stage, attempts: this.l2Attempts,
                totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [...this.l2WrongChoices],
            });
        }
        if (this.l2Attempts === 1) { this._setLevel2Feedback('Hmm... ek baar aur socho. ❤ +5 kisses 😘', 'is-wrong'); this.l2Locked = false; return; }
        this._setLevel2Feedback('Oops... dono chances chale gaye. ❤ +5 kisses 😘', 'is-penalty');
        const isFinalRecoveryFailure = this.l2Stage === 'recovery' && this.l2MainSlot === GAME2_MEMORY_DATA.length - 1;
        const restartCheckpoint = this.l2Stage === 'original'
            ? { slot: this.l2MainSlot, stage: 'recovery', attempts: 0, totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [] }
            : isFinalRecoveryFailure
                ? { slot: this.l2MainSlot, stage: this.l2Stage, attempts: 1, totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [...this.l2WrongChoices] }
                : { slot: this.l2MainSlot + 1, stage: 'original', attempts: 0, totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [] };
        this._recordGameProgress('game2', restartCheckpoint);
        if (isFinalRecoveryFailure) this._markLevelCompleted(2);
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
        const isFinalMemory = this.l2MainSlot === GAME2_MEMORY_DATA.length - 1;
        this._recordGameProgress('game2', isFinalMemory
            ? {
                slot: this.l2MainSlot, stage: this.l2Stage, attempts: this.l2Attempts,
                totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [...this.l2WrongChoices],
            }
            : {
                slot: this.l2MainSlot + 1, stage: 'original', attempts: 0,
                totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [],
            });
        if (isFinalMemory) this._markLevelCompleted(2);
        const token = this.l2RoundToken;
        this.later(this.reduced ? 650 : 1900, () => {
            if (this.state !== 'level2' || token !== this.l2RoundToken) return;
            this._advanceLevel2Slot();
        });
    }

    _setLevel2Feedback(text, modifier = '') { if (this.l2Feedback) { this.l2Feedback.textContent = text; this.l2Feedback.className = `sg-game2-feedback is-visible ${modifier}`.trim(); } }

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
        this.l2Attempts = 0;
        this.l2WrongChoices = [];
        this._recordGameProgress('game2', {
            slot: this.l2MainSlot, stage: this.l2Stage, attempts: 0,
            totalWrongAnswers: this.l2TotalWrongAnswers, wrongChoices: [],
        });
        this._transitionLevel2Content('original');
    }

    _renderCompletedLevel2() {
        if (!this.l2Card || !this.l2StageEl) return;
        if (this.l2ProgressEl) this.l2ProgressEl.textContent = 'Memory 3 / 3';
        this.l2Card.className = 'sg-game2-card is-complete';
        this.l2StageEl.replaceChildren();
        const wrap = document.createElement('div'); wrap.className = 'sg-game2-complete';
        const title = document.createElement('h4'); title.textContent = 'Memory Detector Complete â¤';
        const copy = document.createElement('p'); copy.textContent = 'Tumne kaafi kuch yaad rakha hai... ab dekhte hain aage aur kitna jaanti ho. ❤';
        wrap.append(title, copy);
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
        const copy = document.createElement('p'); copy.textContent = 'Tumne kaafi kuch yaad rakha hai... ab dekhte hain aage aur kitna jaanti ho. ❤';
        wrap.append(title, copy); this.l2StageEl.append(wrap);
        this.later(this.reduced ? 800 : 2600, () => {
            if (this.state === 'level2') this._queueLevelTransition('level2', () => this._enterLevel3(), 0);
        });
    }

    /* --------------------------------------------------------
       GAME 3 - READ MY MIND / WHO WOULD DO IT?
       -------------------------------------------------------- */
    _enterLevel3() {
        const resume = this._hasUnfinishedGameCheckpoint(3);
        this._recordCurrentGame(3);
        const cur = this.levels.level2;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => resume ? this._restoreGame3Gameplay() : this._startLevel3());
        } else if (resume) this._restoreGame3Gameplay();
        else this._startLevel3();
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
        this._recordGameProgress('game3', { phase: 'mind', index: 0 });
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
        if (this.l3Progress) this.l3Progress.textContent = `${index + 1} / ${data.length} · ${isMind ? 'Batao, main kya choose karta?' : 'Batao kaun?'}`;
        this.l3QuestionEl.textContent = question.question;
        this.l3ChoicesEl.replaceChildren();

        const baseChoices = isMind
            ? question.options.map((text, idx) => ({ id: String(idx), label: text, number: String(idx + 1).padStart(2, '0') }))
            : WHO_CHOICE_META;
        const choiceOrderKey = `${this.l3Phase}:${index}`;
        if (this.l3ChoiceOrderKey !== choiceOrderKey || !Array.isArray(this.l3ChoiceOrder) ||
            this.l3ChoiceOrder.length !== baseChoices.length ||
            this.l3ChoiceOrder.some(id => !baseChoices.some(choice => choice.id === id))) {
            this.l3ChoiceOrderKey = choiceOrderKey;
            this.l3ChoiceOrder = baseChoices.map(choice => choice.id);
        }
        const choices = this.l3ChoiceOrder.map(id => baseChoices.find(choice => choice.id === id));
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
            btn.addEventListener('click', () => this._pickLevel3Choice(isMind ? Number(choice.id) : choice.id, btn));
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

    _shuffleLevel3Choices() {
        const current = this.l3ChoiceOrder;
        if (!Array.isArray(current) || current.length < 2) return;
        let next = shuffle(current);
        let guard = 0;
        while (next.every((choice, index) => choice === current[index]) && guard < 6) {
            next = shuffle(current);
            guard += 1;
        }
        this.l3ChoiceOrder = next;
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
            this._addKissPenalty('game3');
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
            this._setLevel3Feedback(`${retry} +5 kisses 😘`, 'is-error');
            this.l3LastRetryMessage = retry;
            this.l3Card?.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: this.reduced ? 1 : 340, easing: 'ease-out' });
            this._shuffleLevel3Choices();
            this.later(this.reduced ? 0 : 440, () => {
                if (this.state === 'level3' && !this.transitioning) this._renderLevel3Question();
            });
            return;
        }

        selected?.classList.add('is-correct');
        const passPool = isMind ? ['Haan! Bilkul yahi. ❤️', 'Tumne sach me mere dil ki baat pakad li. ✨', 'Exactly… main bhi yahi choose karta. ❤️', 'Tum mujhe kuch zyada hi achhe se jaanti ho. 😌❤️'] : ['Haan… bilkul. 😂❤️', 'Exactly! Ye to bilkul hum hain. ❤️', 'Tum hum dono ko kuch zyada hi achhe se jaanti ho. ✨', 'Haha… ye answer to obvious tha. 😌❤️'];
        const pass = pickMessage(passPool, this.l3LastPassMessage);
        this.l3LastPassMessage = pass;
        this._setLevel3Feedback(pass, 'is-success');
        const isLast = index === (isMind ? MIND_READING_DATA : WHO_WOULD_DATA).length - 1;
        this.later(GAME3_TIMING.successFeedback, () => {
            if (this.state !== 'level3' || this.transitioning) return;
            if (!isLast) {
                if (isMind) this.l3MindIndex += 1; else this.l3WhoIndex += 1;
                this._recordGameProgress('game3', {
                    phase: isMind ? 'mind' : 'who',
                    index: isMind ? this.l3MindIndex : this.l3WhoIndex,
                });
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
        // The cinematic is transient; its stable destination is the first
        // “Ye Karta Kaun?” question and is safe to restore immediately.
        this._recordGameProgress('game3', { phase: 'who', index: 0 });
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
        this._recordCurrentGame(4);
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
        if (this._hasUnfinishedGameCheckpoint(4)) {
            this._restoreGame4Gameplay();
            return;
        }
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
        this._recordGameProgress('game4', {
            phase: 'chemistry', questionIndex: this.l4QuestionIndex,
            selectedChoice: -1, results: { ...this.l4Results },
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
        this._recordGameProgress('game4', {
            phase: 'chemistry', questionIndex: this.l4QuestionIndex,
            selectedChoice: this.l4SelectedChoice, results: { ...this.l4Results },
        });
        this._showTestBtn(this.l4TestBtn);
    }

    _restoreChemistryChoice(revealed) {
        const question = CHEMISTRY_QUESTIONS[this.l4QuestionIndex];
        const selected = question?.choices[this.l4SelectedChoice];
        if (!selected) return;
        this.l4Choices?.querySelectorAll('.sg-game4-choice').forEach((button, index) => {
            const isSelected = index === this.l4SelectedChoice;
            button.classList.toggle('is-selected', isSelected);
            button.classList.toggle('is-dimmed', !isSelected);
            button.disabled = true;
            button.setAttribute('aria-pressed', String(isSelected));
        });
        if (!revealed) {
            this.l4Phase = 'chemistry';
            this._showTestBtn(this.l4TestBtn);
            return;
        }
        this.l4Phase = 'chemistry-reveal';
        this.l4Choices?.querySelector('.is-selected')?.classList.add('is-glowing');
        if (this.l4ChoiceReveal) this.l4ChoiceReveal.textContent = selected.reveal;
        if (this.l4FinalReveal) this.l4FinalReveal.textContent = question.finalLine;
        if (this.l4Reveal) { this.l4Reveal.hidden = false; this.l4Reveal.classList.add('is-visible'); }
        this._setButtonLabel(this.l4NextBtn, this.l4QuestionIndex === CHEMISTRY_QUESTIONS.length - 1 ? 'Continue to Jackpot ✨' : 'NEXT →');
        this._showTestBtn(this.l4NextBtn);
        this._recordGameProgress('game4', {
            phase: 'chemistry-reveal', questionIndex: this.l4QuestionIndex,
            selectedChoice: this.l4SelectedChoice, results: { ...this.l4Results },
        });
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
        this._recordGameProgress('game4', {
            phase: 'chemistry-reveal', questionIndex: this.l4QuestionIndex,
            selectedChoice: this.l4SelectedChoice, results: { ...this.l4Results },
        });
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
        this._recordGameProgress('game4', {
            phase: 'jackpot', questionIndex: this.l4QuestionIndex,
            selectedChoice: -1, results: { ...this.l4Results },
        });
        this.l4Chemistry?.classList.add('is-leaving');
        this.later(this.reduced ? 0 : 420, () => {
            if (this.state !== 'level4' || this.l4Phase !== 'jackpot') return;
            this._showJackpotStage();
            this._renderJackpotCards();
        });
    }

    _renderJackpotCards(restoredReady = false) {
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
        this._setButtonLabel(this.l4JackpotAction, restoredReady ? 'Hamari Love Mix Reveal Karo' : 'Hamari Love Mix Banao');
        this.l4JackpotAction.disabled = false;
        this._showTestBtn(this.l4JackpotAction);
        if (restoredReady) {
            this.l4JackpotGrid?.querySelectorAll('.sg-jackpot-card').forEach(card => card.classList.add('is-locked'));
        }
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
        this._recordGameProgress('game4', {
            phase: 'jackpot-ready', questionIndex: this.l4QuestionIndex,
            selectedChoice: -1, results: { ...this.l4Results },
        });
        this._setButtonLabel(this.l4JackpotAction, 'Hamari Love Mix Reveal Karo');
        if (this.l4JackpotAction) this.l4JackpotAction.disabled = false;
    }

    _showJackpotFinal(restored = false) {
        this.l4Phase = 'complete';
        this._recordCurrentGame(4, 'reward');
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
        this._recordCurrentGame(5);
        this.l4ContinueBtn.disabled = true;
        this.levels.level4?.classList.add('is-exiting');
        this._queueLevelTransition('level4', () => {
            if (this.completedLevels.level5) this._restoreCompletedLevel5();
            else this._enterLevel5();
        }, this.reduced ? 0 : 420);
    }

    _enterLevel5() {
        const resume = this._hasUnfinishedGameCheckpoint(5);
        const cur = this.levels.level4;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => {
                if (resume) this._restoreGame5Gameplay();
                else {
                    this._showLevel('level5', 5);
                    this._renderLevel5();
                }
            });
        } else {
            if (resume) this._restoreGame5Gameplay();
            else {
                this._showLevel('level5', 5);
                this._renderLevel5();
            }
        }
    }

    /* --------------------------------------------------------
       LEVEL 5 - UNLOCK MY HEART
       Each logical stage is checkpointed; pointer/animation progress is not.
       Only the final Continue commits Game 5 to shared completion.
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

    _restoreGame5Gameplay() {
        const { game5Stage, game5StageDone, currentGame, currentPhase } = this.persistedProgress;
        this._showLevel('level5', 5);
        this._renderLevel5();

        if (currentGame !== 5 || currentPhase !== 'gameplay' || !game5Stage) return;

        this.l5StageDone = game5StageDone;
        this._setL5Stage(game5Stage, true);
        // Restore stable UI only; queued reveal effects and pointer-driven
        // partial progress must not run again after a refresh.
        this._clearAllTimers();
        this._applyRestoredL5Stage(game5Stage, game5StageDone);
        this._recordGame5Stage(game5Stage, game5StageDone);
    }

    _applyRestoredL5Stage(stage, stageDone) {
        this._updateL5Steps();
        if (stage === 'intro') {
            this._activeL5Panel()?.querySelectorAll('.sg-l5-intro-line').forEach(line => line.classList.add('is-visible'));
            this._activeL5Panel()?.querySelector('.sg-l5-lock-heart')?.classList.add('is-visible');
            this.l5StartBtn?.classList.add('is-in');
        } else if (stage === 'find' && stageDone >= 1) {
            this.l5FindField?.querySelectorAll('.sg-l5-find-object').forEach(button => {
                button.disabled = true;
                button.classList.toggle('is-found', button.dataset.heart === 'true');
            });
            this._showL5Next();
        } else if (stage === 'hold' && stageDone >= 2) {
            this.l5HoldProgress = 1;
            if (this.l5HoldFill) this.l5HoldFill.style.strokeDashoffset = '0';
            if (this.l5HoldLabel) this.l5HoldLabel.textContent = 'Safe.';
            this.l5HoldHeart?.classList.add('is-safe');
            this._showL5Next();
        } else if (stage === 'story' && stageDone >= 3) {
            this.l5StoryProgressValue = 100;
            if (this.l5StoryProgress) this.l5StoryProgress.style.strokeDashoffset = '0';
            this.l5StoryField?.classList.add('is-complete');
            this.l5StoryField?.querySelectorAll('.sg-l5-story-nodes circle').forEach(node => node.classList.add('is-lit'));
            if (this.l5StoryStatus) this.l5StoryStatus.textContent = 'YOU + ME ♥';
            this._showL5Next();
        } else if (stage === 'choice' && stageDone >= 4) {
            this._activeL5Panel()?.querySelectorAll('.sg-l5-choice-setup p').forEach(line => line.classList.add('is-visible'));
            if (this.l5Choices) {
                this.l5Choices.hidden = false;
                this.l5Choices.classList.add('is-visible');
                this.l5Choices.querySelectorAll('button').forEach(button => { button.disabled = true; });
            }
            this._showL5Next('REVEAL MY HEART');
        }
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
        this._recordGame5Stage(stage);
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
            this._recordGame5Stage('find');
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
            this._addKissPenalty('game5');
            this._randomizeL5Find();
            const messages = ['Yahan nahi 😌', 'Nice try...', 'Dil itna easily nahi milta 😏', 'Thoda aur dhundo... ❤️'];
            const message = messages[this.l5FindMisses % messages.length];
            this._l5Status(`${message} +5 kisses 😘`);
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
            this._recordGame5Stage('hold');
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
        this._recordGame5Stage('story');
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
        this.l5StageDone = 4; this._updateL5Steps(); this._recordGame5Stage('choice');
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
        this._recordCurrentGame(5, 'reward');
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
        this._recordCurrentGame(5, 'kiss-reveal');
        this._queueLevelTransition('level5', () => this._showKissReveal(), this.reduced ? 0 : 500);
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
        this._showKissReveal(true);
    }

    _restoreLevel5Reward() {
        this._showLevel('level5', 5);
        this._renderLevel5();
        this.l5StageDone = 4;
        this._setL5Stage('unlock', true);
        this._recordCurrentGame(5, 'reward');
    }

    /* --------------------------------------------------------
       FINAL KISS REVEAL / COMPLETE
       -------------------------------------------------------- */
    _hideKissReveal() {
        this.kissRevealToken += 1;
        if (this.kissRevealEl) {
            this.kissRevealEl.classList.remove('is-active', 'is-settled');
            this.kissRevealEl.hidden = true;
        }
        if (this.kissRevealContinueBtn) {
            this.kissRevealContinueBtn.classList.remove('is-in');
            this.kissRevealContinueBtn.hidden = true;
            this.kissRevealContinueBtn.disabled = false;
        }
    }

    _showKissReveal(restored = false) {
        this._hideAllLevels();
        this._hideCompleteUI();
        this._hideKissReveal();
        this.state = 'kiss-reveal';
        this._recordCurrentGame(5, 'kiss-reveal');
        this._setProgress(5);
        this._setGameProgressVisible(false);
        const penalty = normalizeKissPenalty(this.persistedProgress.kissPenalty);
        const total = KISS_PENALTY_GAMES.reduce((sum, game) => sum + penalty[game], 0);
        this.kissRevealEl?.querySelectorAll('[data-kiss-game]').forEach((row) => {
            const value = penalty[row.dataset.kissGame] || 0;
            const label = row.querySelector('strong');
            if (label) label.textContent = `${value} kisses`;
            row.classList.remove('is-in');
        });
        if (this.kissRevealZeroEl) this.kissRevealZeroEl.hidden = total !== 0;
        if (this.kissRevealTotalEl) this.kissRevealTotalEl.textContent = '0';
        if (this.kissRevealEl) {
            this.kissRevealEl.hidden = false;
            void this.kissRevealEl.offsetWidth;
            this.kissRevealEl.classList.add('is-active');
        }
        if (this.shell) this.shell.scrollTop = 0;

        const revealDone = () => {
            if (this.kissRevealTotalEl) this.kissRevealTotalEl.textContent = String(total);
            this.kissRevealEl?.classList.add('is-settled');
            if (this.kissRevealContinueBtn) {
                this.kissRevealContinueBtn.hidden = false;
                this.kissRevealContinueBtn.classList.add('is-in');
            }
        };
        if (restored || this.reduced) {
            this.kissRevealEl?.querySelectorAll('[data-kiss-game]').forEach(row => row.classList.add('is-in'));
            revealDone();
            return;
        }

        const token = ++this.kissRevealToken;
        const rows = [...(this.kissRevealEl?.querySelectorAll('[data-kiss-game]') || [])];
        rows.forEach((row, index) => this.later(index * 190, () => {
            if (token === this.kissRevealToken && this.state === 'kiss-reveal') row.classList.add('is-in');
        }));
        const steps = Math.min(18, Math.max(1, total));
        for (let step = 1; step <= steps; step += 1) {
            this.later(860 + step * 42, () => {
                if (token === this.kissRevealToken && this.state === 'kiss-reveal' && this.kissRevealTotalEl) {
                    this.kissRevealTotalEl.textContent = String(Math.round(total * step / steps));
                }
            });
        }
        this.later(860 + steps * 42 + 220, () => {
            if (token === this.kissRevealToken && this.state === 'kiss-reveal') revealDone();
        });
    }

    _continueFromKissReveal() {
        if (this.transitioning || this.state !== 'kiss-reveal') return;
        if (this.kissRevealContinueBtn) this.kissRevealContinueBtn.disabled = true;
        this._showComplete();
    }

    _showComplete(restored = false) {
        this._hideKissReveal();
        this._hideAllLevels();
        this.state = 'complete';
        this._recordCurrentGame(5, 'complete');
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
        this._hideKissReveal();
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
        this._onRewardPhaseChange?.('opened');
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
                } else console.warn('Secret Game reward continuation is unavailable.');
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
        const lifecycle = this.lifecycleToken;
        let id = null;
        id = setTimeout(() => {
            this.timers = this.timers.filter((timerId) => timerId !== id);
            if (lifecycle !== this.lifecycleToken || this.destroyed) return;
            fn();
        }, ms);
        this.timers.push(id);
        return id;
    }
    _clearLevelTimers() {
        // Clear short-lived level transition timers but keep game alive
        // For now clear all - re-used for each level
        this._clearAllTimers();
    }
    _clearAllTimers() {
        this.lifecycleToken += 1;
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
