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
            (TIMELINE_MOMENTS, FIND_OBJECTS, FEEL_QUESTIONS,
             CONNECT_STARS, HEART_CONFIG, SECRET_REWARD, GAME_META).
   ============================================================ */

import { sleep, prefersReducedMotion } from './utils.js';
import {
    TIMELINE_MOMENTS,
    FIND_OBJECTS,
    FEEL_QUESTIONS,
    CONNECT_STARS,
    HEART_CONFIG,
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
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

const ICON_MAP = {
    photo: '🖼️',
    letter: '✉️',
    star: '⭐',
    clock: '🕰️',
    flower: '🌸',
    heart: '💙',
    shell: '🐚',
    feather: '🪶',
};

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

/* 8 preset positions for FIND objects (percent inside env) */
const FIND_POSITIONS = [
    { x: 18, y: 28 },
    { x: 74, y: 22 },
    { x: 42, y: 38 },
    { x: 82, y: 48 },
    { x: 14, y: 62 },
    { x: 58, y: 72 },
    { x: 30, y: 78 },
    { x: 88, y: 78 },
];

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
        this.l1Order = [];            // current order of moment ids
        this.l1Shuffled = [];

        // Level 2 refs
        this.l2Env = null;
        this.l2Counter = null;
        this.l2Feedback = null;
        this.l2TestBtn = null;        // dedicated TEST button
        this.l2Found = new Set();
        this.l2RequiredCount = 0;

        // Level 3 refs
        this.l3Card = null;
        this.l3QuestionEl = null;
        this.l3ChoicesEl = null;
        this.l3Feedback = null;
        this.l3TestBtn = null;        // dedicated TEST button
        this.l3Index = 0;
        this.l3Pick = -1;             // selected choice index for the current question

        // Level 4 refs
        this.l4Sky = null;
        this.l4Svg = null;
        this.l4Feedback = null;
        this.l4TestBtn = null;        // dedicated TEST button
        this.l4NextExpected = 1; // order
        this.l4Connected = [];
        this.l4Lines = [];

        // Level 5 refs
        this.l5Wrap = null;
        this.l5Pulse = null;
        this.l5Core = null;
        this.l5Progress = null;
        this.l5Feedback = null;
        this.l5TestBtn = null;        // dedicated TEST button
        this.l5Hits = 0;
        this.l5Misses = 0;
        this.l5PulseStart = 0;
        this.l5Raf = null;
        this.l5PulseTimer = null;

        // Complete / Reward refs
        this.completeSymbols = null;
        this.completeLine1 = null;
        this.completeLine2 = null;
        this.completeUnlockBtn = null;
        this.envelope = null;
        this.envelopePaper = null;
        this.rewardCard = null;
        this.rewardContinueBtn = null;

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
        this.destroyed = false;
        this._lastPassMsg = null;     // avoid repeating the same TEST PASS message
        this._lastRetryMsg = null;    // avoid repeating the same TEST FAIL message
        this._failToken = 0;          // only the latest TEST FAIL message auto-clears
        this._onRewardContinue = null; // wired by main.js
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

        // L2
        this.l2Env = this.root.querySelector('#sg-l2-env');
        this.l2Counter = this.root.querySelector('#sg-l2-counter');
        this.l2Feedback = this.root.querySelector('#sg-l2-feedback');
        this.l2TestBtn = this.root.querySelector('#sg-l2-action');

        // L3
        this.l3Card = this.root.querySelector('#sg-l3-card');
        this.l3QuestionEl = this.root.querySelector('#sg-l3-question');
        this.l3ChoicesEl = this.root.querySelector('#sg-l3-choices');
        this.l3Feedback = this.root.querySelector('#sg-l3-feedback');
        this.l3TestBtn = this.root.querySelector('#sg-l3-action');

        // L4
        this.l4Sky = this.root.querySelector('#sg-l4-sky');
        this.l4Svg = this.root.querySelector('#sg-l4-svg');
        this.l4Feedback = this.root.querySelector('#sg-l4-feedback');
        this.l4TestBtn = this.root.querySelector('#sg-l4-action');

        // L5
        this.l5Wrap = this.root.querySelector('#sg-l5-wrap');
        this.l5Pulse = this.root.querySelector('#sg-l5-pulse');
        this.l5Core = this.root.querySelector('#sg-l5-core');
        this.l5Progress = this.root.querySelector('#sg-l5-progress');
        this.l5Feedback = this.root.querySelector('#sg-l5-feedback');
        this.l5TestBtn = this.root.querySelector('#sg-l5-action');

        // Complete
        this.completeSymbols = this.root.querySelector('#sg-complete-symbols');
        this.completeLine1 = this.root.querySelector('#sg-complete-line1');
        this.completeLine2 = this.root.querySelector('#sg-complete-line2');
        this.completeUnlockBtn = this.root.querySelector('#sg-complete-unlock');

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

        // Timeline -> game is wired by main.js (showTimelineScene /
        // hideTimelineForGame) so the game does not double-start when
        // the timeline button is pressed. The button still exists in
        // the DOM for accessibility, but its click is handled outside.

        // ONE authoritative progression path per level:
        // solve puzzle -> dedicated TEST button validates exactly once
        // -> PASS advances via _queueLevelTransition / FAIL stays.
        on(this.l1CheckBtn, 'click', () => this._validateLevel1());
        on(this.l2TestBtn, 'click', () => this._validateLevel2());
        on(this.l3TestBtn, 'click', () => this._confirmLevel3());
        on(this.l4TestBtn, 'click', () => this._validateLevel4());
        on(this.l5TestBtn, 'click', () => this._validateLevel5());

        // L5 heart taps (the level's own interaction - never advances by itself)
        const l5Hit = () => this._hitHeart();
        on(this.l5Wrap, 'click', l5Hit);
        on(this.l5Wrap, 'touchstart', (e) => { e.preventDefault(); l5Hit(); }, { passive: false });
        on(this.l5Wrap, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); l5Hit(); }});

        // L2 objects are delegated via _renderLevel2 per object

        on(this.l4Sky, 'click', (e) => {
            // ignore clicks on stars themselves (they stopPropagation)
            if (e.target.closest('.sg-star-btn')) return;
        });

        // Complete -> reward
        on(this.completeUnlockBtn, 'click', () => this._enterReward());

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

        this._setProgress(0);
        this._playIntro();
        // Focus for keyboard
        this.root?.focus?.({ preventScroll: true });
    }

    // Clean teardown (called on destroy / restart)
    destroy() {
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
       Progress
       -------------------------------------------------------- */
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
        const el = this.levels[key];
        if (!el) return;
        el.hidden = false;
        void el.offsetWidth;
        el.classList.add('is-active');
        this._setProgress(progressNum);
        this.state = key;
        // ensure shell scrolls to top for new level
        if (this.shell) this.shell.scrollTop = 0;
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
        this.transitioning = true;
        // Tracked timer so destroy()/Back can safely cancel the entrance
        const wait = this.introEl ? (this.reduced ? 0 : 420) : 0;
        if (this.introEl) this.introEl.classList.remove('is-in');
        this.later(wait, () => {
            if (this.introEl) this.introEl.hidden = true;
            this._showLevel('level1', 1);
            this._renderLevel1();
        });
    }

    _renderLevel1() {
        if (!this.l1List) return;
        this.l1List.innerHTML = '';
        this.l1Feedback.textContent = '';
        this.l1Feedback.className = 'sg-feedback';
        // Dedicated TEST button: visible and available while solving
        this._showTestBtn(this.l1CheckBtn);

        // Shuffle the timeline moments
        this.l1Shuffled = shuffle(TIMELINE_MOMENTS);
        this.l1Order = this.l1Shuffled.map(m => m.id);

        this.l1Shuffled.forEach((m, idx) => {
            const card = document.createElement('div');
            card.className = 'sg-card';
            card.setAttribute('data-id', m.id);
            card.setAttribute('draggable', 'true');
            card.setAttribute('role', 'listitem');
            card.setAttribute('aria-label', m.title);
            card.innerHTML = `
                <span class="sg-card-num">${idx + 1}</span>
                <div class="sg-card-body">
                    <div class="sg-card-title">${m.title}</div>
                    <div class="sg-card-sub">${m.subtitle}</div>
                    <div class="sg-card-hint">${m.detail}</div>
                </div>
                <div class="sg-card-actions" aria-hidden="true">
                    <button type="button" class="sg-card-move sg-card-up" aria-label="Move up">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button type="button" class="sg-card-move sg-card-down" aria-label="Move down">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                </div>
            `;
            // up/down handlers (no duplicate - per card, cleaned on re-render)
            const upBtn = card.querySelector('.sg-card-up');
            const downBtn = card.querySelector('.sg-card-down');
            upBtn?.addEventListener('click', (e) => { e.stopPropagation(); this._moveCard(m.id, -1); });
            downBtn?.addEventListener('click', (e) => { e.stopPropagation(); this._moveCard(m.id, 1); });

            // drag handlers
            card.addEventListener('pointerdown', (e) => this._l1PointerDown(e, m.id));
            // keyboard: allow selecting via Enter? keep simple
            this.l1List.appendChild(card);
        });
        this._refreshL1Numbers();
        this._refreshL1MoveButtons();
    }

    _refreshL1Numbers() {
        if (!this.l1List) return;
        const cards = [...this.l1List.querySelectorAll('.sg-card')];
        cards.forEach((c, i) => {
            const num = c.querySelector('.sg-card-num');
            if (num) num.textContent = String(i + 1);
        });
    }
    _refreshL1MoveButtons() {
        if (!this.l1List) return;
        const cards = [...this.l1List.querySelectorAll('.sg-card')];
        cards.forEach((c, i) => {
            const up = c.querySelector('.sg-card-up');
            const down = c.querySelector('.sg-card-down');
            if (up) up.disabled = i === 0;
            if (down) down.disabled = i === cards.length - 1;
        });
    }
    _moveCard(id, dir) {
        const idx = this.l1Order.indexOf(id);
        if (idx === -1) return;
        const next = idx + dir;
        if (next < 0 || next >= this.l1Order.length) return;
        // swap order
        [this.l1Order[idx], this.l1Order[next]] = [this.l1Order[next], this.l1Order[idx]];
        // swap DOM nodes
        const cards = [...this.l1List.querySelectorAll('.sg-card')];
        const card = cards[idx];
        const target = cards[next];
        if (!card || !target) return;
        if (dir === -1) {
            this.l1List.insertBefore(card, target);
        } else {
            this.l1List.insertBefore(target, card);
        }
        this._refreshL1Numbers();
        this._refreshL1MoveButtons();
        // subtle feedback
        card.animate?.(
            [{ transform: 'scale(0.98)' }, { transform: 'scale(1)' }],
            { duration: 180, easing: 'ease-out' }
        );
    }

    // --- drag via PointerEvents ---
    _l1PointerDown(e, id) {
        // Only primary button / touch, ignore if clicking move buttons
        if (e.target.closest('.sg-card-move')) return;
        if (e.button !== undefined && e.button !== 0) return;
        const card = e.currentTarget;
        if (!card) return;
        // Prevent text selection / scroll
        e.preventDefault();
        const startY = e.clientY;
        let dragging = false;
        let startIdx = this.l1Order.indexOf(id);
        const onMove = (ev) => {
            const dy = ev.clientY - startY;
            if (!dragging && Math.abs(dy) < 8) return;
            if (!dragging) {
                dragging = true;
                card.classList.add('is-dragging');
                card.setPointerCapture?.(ev.pointerId);
            }
            // find card under pointer
            const cards = [...this.l1List.querySelectorAll('.sg-card')];
            const y = ev.clientY;
            let overIdx = -1;
            for (let i = 0; i < cards.length; i++) {
                const rect = cards[i].getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (y < mid) { overIdx = i; break; }
            }
            if (overIdx === -1) overIdx = cards.length - 1;
            // clamp around current
            if (overIdx !== startIdx && overIdx !== -1) {
                // reorder array
                this.l1Order.splice(startIdx, 1);
                // adjust overIdx if removal shifted
                if (overIdx > startIdx) overIdx -= 1;
                // insert: if pointer is below mid, insert after
                const targetRect = cards[overIdx]?.getBoundingClientRect();
                if (targetRect && y > targetRect.top + targetRect.height / 2 && overIdx < cards.length - 1) {
                    overIdx += 1;
                }
                // final clamp
                overIdx = clamp(overIdx, 0, this.l1Order.length);
                this.l1Order.splice(overIdx, 0, id);
                // reorder DOM to match array
                const idToCard = new Map(cards.map(c => [c.getAttribute('data-id'), c]));
                // also include dragging card itself (already in map)
                // Re-append in order
                this.l1Order.forEach(cid => {
                    const c = idToCard.get(cid);
                    if (c) this.l1List.appendChild(c);
                });
                startIdx = overIdx;
                this._refreshL1Numbers();
                this._refreshL1MoveButtons();
            }
        };
        const onUp = (ev) => {
            card.classList.remove('is-dragging');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            try { card.releasePointerCapture?.(ev.pointerId); } catch {}
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }

    /* --------------------------------------------------------
       LEVEL 1 validation - dedicated TEST button.
       Correct order -> TEST PASS -> exactly one queued
       transition to Level 2. Wrong -> TEST FAIL, stay, retry.
       -------------------------------------------------------- */
    _validateLevel1() {
        if (this.transitioning || this.state !== 'level1') return;

        // Validate order matches chronological order
        const correctIds = [...TIMELINE_MOMENTS].sort((a,b)=>a.order-b.order).map(m=>m.id);
        const isCorrect = this.l1Order.length === correctIds.length &&
                          this.l1Order.every((id, i) => id === correctIds[i]);

        // mark each card right/wrong (soft visual feedback)
        const cards = [...this.l1List.querySelectorAll('.sg-card')];
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
            this._showPassFeedback(this.l1Feedback, GAME_META.successMessages.level1);
            this._hideTestBtn(this.l1CheckBtn);
            this.l1List.querySelectorAll('.sg-card').forEach(c => c.style.pointerEvents = 'none');
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

    /* --------------------------------------------------------
       LEVEL 2 - FIND
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
        if (!this.l2Env) return;
        this.l2Env.innerHTML = '';
        this.l2Found.clear();
        this.l2RequiredCount = FIND_OBJECTS.filter(o=>o.required).length;
        if (this.l2Counter) {
            this.l2Counter.innerHTML = `<strong>0</strong> / ${this.l2RequiredCount} found`;
        }
        if (this.l2Feedback) { this.l2Feedback.textContent = ''; this.l2Feedback.className = 'sg-feedback'; }
        // TEST appears only after every required memory has been found
        this._hideTestBtn(this.l2TestBtn);

        FIND_OBJECTS.forEach((obj, idx) => {
            const pos = FIND_POSITIONS[idx % FIND_POSITIONS.length];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sg-find-object';
            btn.setAttribute('aria-label', obj.label);
            btn.setAttribute('data-id', obj.id);
            btn.style.left = pos.x + '%';
            btn.style.top = pos.y + '%';
            btn.style.setProperty('--delay', (idx * 0.18).toFixed(2) + 's');
            btn.innerHTML = `
                <span class="sg-find-icon" aria-hidden="true">${ICON_MAP[obj.icon] || '✦'}</span>
                <span class="sg-find-label" aria-hidden="true">${obj.label}</span>
            `;
            btn.addEventListener('click', () => this._findObject(obj, btn), { once: false });
            // touch handled via click (synthesized) - keep explicit for iOS
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this._findObject(obj, btn); }, { passive: false });
            this.l2Env.appendChild(btn);
        });
    }

    _findObject(obj, btn) {
        if (this.transitioning) return;
        if (this.l2Found.has(obj.id)) return;
        if (btn.classList.contains('is-found') || btn.classList.contains('is-decoy-found')) return;

        this.l2Found.add(obj.id);

        if (obj.required) {
            btn.classList.add('is-found');
            // haptic-like scale
            btn.animate?.([{ transform: 'translate(-50%, -50%) scale(1.15)' }, { transform: 'translate(-50%, -50%) scale(1)' }], { duration: 340, easing: 'ease-out' });
            if (this.l2Feedback) {
                this.l2Feedback.textContent = obj.revealText;
                this.l2Feedback.className = 'sg-feedback is-visible is-success';
                this.later(2200, () => {
                    if (this.state !== 'level2') return;
                    // only clear if no new message replaced it
                    if (this.l2Feedback.textContent === obj.revealText) {
                        this.l2Feedback.className = 'sg-feedback';
                        this.l2Feedback.textContent = '';
                    }
                });
            }
        } else {
            btn.classList.add('is-decoy-found');
            if (this.l2Feedback) {
                this.l2Feedback.textContent = obj.revealText;
                this.l2Feedback.className = 'sg-feedback is-visible';
                this.later(1600, () => {
                    if (this.state !== 'level2') return;
                    if (this.l2Feedback.textContent === obj.revealText) {
                        this.l2Feedback.className = 'sg-feedback';
                        this.l2Feedback.textContent = '';
                    }
                });
            }
        }

        // update counter (only required count)
        const requiredFound = [...this.l2Found].filter(id => {
            const o = FIND_OBJECTS.find(x=>x.id===id);
            return o?.required;
        }).length;
        if (this.l2Counter) {
            this.l2Counter.innerHTML = `<strong>${requiredFound}</strong> / ${this.l2RequiredCount} found`;
        }

        if (requiredFound >= this.l2RequiredCount) {
            // All required memories found - puzzle SOLVED, ready for TEST.
            // Never auto-advance here: only TEST validation can advance.
            if (this.l2Feedback) {
                this.l2Feedback.textContent = GAME_META.successMessages.level2;
                this.l2Feedback.className = 'sg-feedback is-visible is-success';
            }
            this._showTestBtn(this.l2TestBtn, true);
            // disable further object interaction
            this.l2Env.querySelectorAll('.sg-find-object').forEach(btn => btn.disabled = true);
            // soft glow on env
            this.l2Env.animate?.(
                [{ boxShadow: '0 18px 50px rgba(5,10,24,0.45)' }, { boxShadow: '0 18px 50px rgba(5,10,24,0.45), 0 0 40px rgba(94,201,142,0.22)' }, { boxShadow: '0 18px 50px rgba(5,10,24,0.45)' }],
                { duration: 900, easing: 'ease-out' }
            );
        }
    }

    /* --------------------------------------------------------
       LEVEL 2 validation - dedicated TEST button.
       All required memories found -> TEST PASS -> exactly one
       queued transition to Level 3. Otherwise -> TEST FAIL, stay.
       -------------------------------------------------------- */
    _validateLevel2() {
        if (this.transitioning || this.state !== 'level2') return;

        const requiredFound = [...this.l2Found].filter(id => {
            const o = FIND_OBJECTS.find(x=>x.id===id);
            return o?.required;
        }).length;

        if (requiredFound >= this.l2RequiredCount) {
            // PASS
            this._showPassFeedback(this.l2Feedback, GAME_META.successMessages.level2);
            this._hideTestBtn(this.l2TestBtn);
            this._queueLevelTransition('level2', () => this._enterLevel3(), this.reduced ? 500 : 1100);
        } else {
            // FAIL - stay on the level, keep searching
            this._showFailFeedback(this.l2Feedback, this.l2Env);
        }
    }

    /* --------------------------------------------------------
       LEVEL 3 - FEEL
       -------------------------------------------------------- */
    _enterLevel3() {
        const cur = this.levels.level2;
        if (cur) {
            cur.classList.add('is-exiting');
            this.later(this.reduced ? 0 : 420, () => {
                this._showLevel('level3', 3);
                this.l3Index = 0;
                this._renderLevel3();
            });
        } else {
            this._showLevel('level3', 3);
            this.l3Index = 0;
            this._renderLevel3();
        }
    }

    _renderLevel3() {
        const q = FEEL_QUESTIONS[this.l3Index];
        if (!q || !this.l3Card) return;

        if (this.l3Feedback) { this.l3Feedback.textContent = ''; this.l3Feedback.className = 'sg-feedback'; }
        // TEST appears only after an answer has been selected
        this._hideTestBtn(this.l3TestBtn);
        this.l3Pick = -1;

        if (this.l3QuestionEl) this.l3QuestionEl.textContent = q.question;
        if (this.l3ChoicesEl) {
            this.l3ChoicesEl.innerHTML = '';
            q.choices.forEach((choice, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'sg-feel-choice';
                btn.textContent = choice.text;
                btn.setAttribute('aria-label', choice.text);
                btn.addEventListener('click', () => this._pickFeelChoice(idx, btn));
                this.l3ChoicesEl.appendChild(btn);
            });
        }
        // subtle entrance
        this.l3Card.animate?.(
            [{ opacity: '0', transform: 'translateY(10px)' }, { opacity: '1', transform: 'translateY(0)' }],
            { duration: 420, easing: 'ease-out' }
        );
    }

    /* Step 1 of Level 3: SELECT. Selection alone never validates and
       never advances - it only arms the dedicated TEST button. */
    _pickFeelChoice(idx, btn) {
        if (this.transitioning || this.state !== 'level3') return;
        const q = FEEL_QUESTIONS[this.l3Index];
        if (!q || this.l3Pick !== -1) return;

        this.l3Pick = idx;
        // lock the choice until TEST runs
        const all = [...this.l3ChoicesEl.querySelectorAll('.sg-feel-choice')];
        all.forEach(b => { b.disabled = true; b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');

        const choice = q.choices[idx];
        if (this.l3Feedback && choice) {
            this.l3Feedback.textContent = choice.feedback;
            this.l3Feedback.className = 'sg-feedback is-visible';
        }
        this._showTestBtn(this.l3TestBtn, true);
    }

    /* --------------------------------------------------------
       LEVEL 3 validation - dedicated TEST button (Step 2).
       Correct -> TEST PASS -> next question, or on the final
       question exactly one queued transition to Level 4.
       Wrong   -> TEST FAIL -> same question, retry allowed.
       -------------------------------------------------------- */
    _confirmLevel3() {
        if (this.transitioning || this.state !== 'level3') return;
        const q = FEEL_QUESTIONS[this.l3Index];
        if (!q || this.l3Pick === -1) return;

        if (this.l3Pick === q.correctIndex) {
            // PASS for this question
            const isLast = this.l3Index >= FEEL_QUESTIONS.length - 1;
            const extra = isLast ? GAME_META.successMessages.level3 : '';
            this.l3Pick = -1;
            this._showPassFeedback(this.l3Feedback, extra);
            this._hideTestBtn(this.l3TestBtn);

            if (isLast) {
                // final question passed - exactly one transition to Level 4
                this.l3ChoicesEl?.querySelectorAll('.sg-feel-choice').forEach(btn => btn.disabled = true);
                this._queueLevelTransition('level3', () => this._enterLevel4(), this.reduced ? 500 : 1100);
                return;
            }
            // brief cinematic pause, then the next question
            this.later(this.reduced ? 500 : 1500, () => {
                if (this.state !== 'level3' || this.transitioning) return;
                this.l3Index += 1;
                this.l3Card.animate?.(
                    [{ opacity: '1', transform: 'translateY(0)' }, { opacity: '0', transform: 'translateY(-8px)' }],
                    { duration: 300, easing: 'ease-in' }
                );
                this.later(320, () => {
                    if (this.state !== 'level3' || this.transitioning) return;
                    this._renderLevel3();
                });
            });
        } else {
            // FAIL - stay on the same question, allow another attempt
            this._showFailFeedback(this.l3Feedback, this.l3Card);
            this.l3Pick = -1;
            this._hideTestBtn(this.l3TestBtn);
            this.l3ChoicesEl?.querySelectorAll('.sg-feel-choice').forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('is-selected');
            });
        }
    }

    /* --------------------------------------------------------
       LEVEL 4 - CONNECT
       -------------------------------------------------------- */
    _enterLevel4() {
        this._showLevel('level4', 4);
        this._renderLevel4();
    }

    _renderLevel4() {
        if (!this.l4Sky || !this.l4Svg) return;
        this.l4Svg.innerHTML = '';
        this.l4Sky.querySelectorAll('.sg-star-btn').forEach(el => el.remove());
        this.l4Connected = [];
        this.l4Lines = [];
        this.l4NextExpected = 1;
        if (this.l4Feedback) { this.l4Feedback.textContent = ''; this.l4Feedback.className = 'sg-feedback'; }
        // TEST appears only after the heart constellation is complete
        this._hideTestBtn(this.l4TestBtn);

        // Create star buttons
        for (const star of CONNECT_STARS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sg-star-btn';
            btn.setAttribute('data-id', star.id);
            btn.setAttribute('data-order', String(star.order));
            btn.setAttribute('aria-label', star.isCorrect ? `Star ${star.order}` : 'Stardust');
            btn.style.left = star.x + '%';
            btn.style.top = star.y + '%';
            btn.innerHTML = `<span class="sg-star-dot" aria-hidden="true"></span>`;
            if (star.isCorrect && star.order === 1) {
                btn.classList.add('is-next');
            }
            if (!star.isCorrect) {
                btn.style.opacity = '0.55';
                btn.style.width = '28px';
                btn.style.height = '28px';
            }
            const handler = (e) => {
                e.stopPropagation();
                this._tapStar(star, btn);
            };
            btn.addEventListener('click', handler);
            btn.addEventListener('touchend', (e) => { e.preventDefault(); handler(e); }, { passive: false });
            this.l4Sky.appendChild(btn);
        }
    }

    _tapStar(star, btn) {
        if (this.transitioning) return;
        if (this.state !== 'level4') return;

        if (!star.isCorrect) {
            // decoy - soft shake, no penalty
            btn.classList.remove('is-wrong');
            void btn.offsetWidth;
            btn.classList.add('is-wrong');
            this.later(460, () => btn.classList.remove('is-wrong'));
            return;
        }

        // correct star must be tapped in order
        if (star.order !== this.l4NextExpected) {
            btn.classList.remove('is-wrong');
            void btn.offsetWidth;
            btn.classList.add('is-wrong');
            this.later(460, () => btn.classList.remove('is-wrong'));
            // gentle hint
            if (this.l4Feedback) {
                this.l4Feedback.textContent = 'Thoda sa aur paas... sahi sitara dhoondho.';
                this.l4Feedback.className = 'sg-feedback is-visible';
                this.later(1400, () => {
                    if (this.l4Feedback.textContent.includes('sahi sitara')) {
                        this.l4Feedback.className = 'sg-feedback';
                        this.l4Feedback.textContent = '';
                    }
                });
            }
            return;
        }

        // Correct next star
        btn.classList.remove('is-next');
        btn.classList.add('is-connected');
        this.l4Connected.push(star);

        // Draw line from previous to this
        if (this.l4Connected.length > 1) {
            const prev = this.l4Connected[this.l4Connected.length - 2];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'sg-connect-line');
            // use percent as viewBox 0 0 100 100, so x/y map directly
            line.setAttribute('x1', String(prev.x));
            line.setAttribute('y1', String(prev.y));
            line.setAttribute('x2', String(star.x));
            line.setAttribute('y2', String(star.y));
            // if closing the heart, use heart style
            if (this.l4Connected.length === 7) line.classList.add('is-heart');
            this.l4Svg.appendChild(line);
            this.l4Lines.push(line);
        }

        // Advance expected
        this.l4NextExpected += 1;

        // Highlight next star
        if (this.l4NextExpected <= 7) {
            const nextId = CONNECT_STARS.find(s => s.isCorrect && s.order === this.l4NextExpected)?.id;
            if (nextId) {
                const nextBtn = this.l4Sky.querySelector(`[data-id="${nextId}"]`);
                nextBtn?.classList.add('is-next');
            }
        }

        // Progress feedback after half
        if (this.l4Connected.length === 3 && this.l4Feedback) {
            this.l4Feedback.textContent = 'Beautiful... bas thoda aur.';
            this.l4Feedback.className = 'sg-feedback is-visible is-success';
        }

        // Completion: 7 points (including closing duplicate).
        // Puzzle SOLVED, ready for TEST - never auto-advance here.
        if (this.l4Connected.length >= 7) {
            // Ensure heart is fully drawn
            this.l4Sky.querySelectorAll('.sg-star-btn').forEach(b => b.classList.remove('is-next'));
            // glow the constellation
            this.l4Sky.animate?.(
                [{ filter: 'brightness(1)' }, { filter: 'brightness(1.12)' }, { filter: 'brightness(1)' }],
                { duration: 900, easing: 'ease-out' }
            );
            if (this.l4Feedback) {
                this.l4Feedback.textContent = GAME_META.successMessages.level4a;
                this.l4Feedback.className = 'sg-feedback is-visible is-success';
            }
            // disable stars so the solved constellation stays intact
            this.l4Sky?.querySelectorAll('.sg-star-btn').forEach(btn => btn.disabled = true);
            this._showTestBtn(this.l4TestBtn, true);
        }
    }

    /* --------------------------------------------------------
       LEVEL 4 validation - dedicated TEST button.
       Constellation complete -> TEST PASS -> exactly one queued
       transition to Level 5. Otherwise -> TEST FAIL, stay, retry.
       -------------------------------------------------------- */
    _validateLevel4() {
        if (this.transitioning || this.state !== 'level4') return;

        const complete = this.l4Connected.length >= 7;
        if (complete) {
            // PASS
            this._showPassFeedback(this.l4Feedback, GAME_META.successMessages.level4b);
            this._hideTestBtn(this.l4TestBtn);
            this._queueLevelTransition('level4', () => this._enterLevel5(), this.reduced ? 400 : 1100);
        } else {
            // FAIL - stay on the level, keep connecting
            this._showFailFeedback(this.l4Feedback, this.l4Sky);
            // re-enable stars for another attempt (defensive; the TEST
            // button is normally only reachable when complete)
            this.l4Sky?.querySelectorAll('.sg-star-btn:not([data-order="0"])').forEach(btn => btn.disabled = false);
        }
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
       LEVEL 5 - MY HEART
       Pulse timing: ring scales 0.35 -> 1 over pulseDurationMs.
       Sweet spot is last (1 - hitWindow) fraction.
       Hits increment brightness.
       -------------------------------------------------------- */
    _renderLevel5() {
        if (!this.l5Pulse || !this.l5Wrap) return;
        this.l5Hits = 0;
        this.l5Misses = 0;
        if (this.l5Progress) this.l5Progress.innerHTML = `<strong>${this.l5Hits}</strong> / ${HEART_CONFIG.requiredHits}`;
        if (this.l5Feedback) { this.l5Feedback.textContent = 'Jab dil tez dhadke, tab tap karo...'; this.l5Feedback.className = 'sg-feedback is-visible'; }
        // TEST appears only after every required heartbeat has been caught
        this._hideTestBtn(this.l5TestBtn);
        if (this.l5Core) {
            this.l5Core.style.filter = '';
            this.l5Core.style.transform = '';
        }

        // reset pulse animation
        this.l5Pulse.classList.remove('is-beating');
        void this.l5Pulse.offsetWidth;
        this.l5Pulse.style.setProperty('--dur', HEART_CONFIG.pulseDurationMs + 'ms');
        // reduced motion: still beat but slower
        if (!this.reduced) {
            this.l5Pulse.classList.add('is-beating');
        } else {
            // reduced: keep a gentle opacity pulse only
            this.l5Pulse.classList.add('is-beating');
        }

        this.l5PulseStart = Date.now();
        if (this.l5Wrap) {
            this.l5Wrap.setAttribute('tabindex', '0');
            this.l5Wrap.setAttribute('role', 'button');
            this.l5Wrap.setAttribute('aria-label', 'Tap the heart when it glows');
        }
        // focus for keyboard
        this.later(300, () => this.l5Wrap?.focus({ preventScroll: true }));
    }

    _hitHeart() {
        if (this.transitioning) return;
        if (this.state !== 'level5') return;
        // compute pulse fraction
        const now = Date.now();
        const elapsed = (now - this.l5PulseStart) % HEART_CONFIG.pulseDurationMs;
        const fraction = elapsed / HEART_CONFIG.pulseDurationMs; // 0..1

        const inWindow = fraction >= HEART_CONFIG.hitWindow;

        if (inWindow) {
            this.l5Hits += 1;
            if (this.l5Progress) this.l5Progress.innerHTML = `<strong>${this.l5Hits}</strong> / ${HEART_CONFIG.requiredHits}`;
            // hit feedback
            if (this.l5Core) {
                this.l5Core.classList.remove('is-hit');
                void this.l5Core.offsetWidth;
                this.l5Core.classList.add('is-hit');
                // brighten with hits
                const bright = 1 + this.l5Hits * 0.06;
                this.l5Core.style.filter = `brightness(${bright})`;
                this.l5Core.style.boxShadow = `0 0 ${22 + this.l5Hits * 6}px rgba(201,74,107,${0.45 + this.l5Hits * 0.08}), 0 6px 18px rgba(5,10,24,0.35)`;
                this.later(460, () => this.l5Core?.classList.remove('is-hit'));
            }
            if (this.l5Feedback) {
                this.l5Feedback.textContent = this.l5Hits === 1 ? 'Perfect... 💙' : `Bohot khoob — ${this.l5Hits} / ${HEART_CONFIG.requiredHits}`;
                this.l5Feedback.className = 'sg-feedback is-visible is-success';
            }
            // subtle wrap pulse
            this.l5Wrap.animate?.(
                [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }],
                { duration: 300, easing: 'ease-out' }
            );

            if (this.l5Hits >= HEART_CONFIG.requiredHits) {
                // Puzzle SOLVED, ready for TEST - never auto-advance here.
                if (this.l5Feedback) {
                    this.l5Feedback.textContent = GAME_META.successMessages.level5a;
                    this.l5Feedback.className = 'sg-feedback is-visible is-success';
                }
                // bright full heart
                if (this.l5Core) {
                    this.l5Core.style.filter = 'brightness(1.35)';
                    this.l5Core.style.boxShadow = '0 0 44px rgba(232,122,154,0.75), 0 0 70px rgba(126,200,227,0.35)';
                }
                // stop further taps so the solved heart stays locked
                if (this.l5Wrap) this.l5Wrap.style.pointerEvents = 'none';
                this.later(this.reduced ? 200 : 800, () => {
                    if (this.state !== 'level5' || this.transitioning) return;
                    this._showTestBtn(this.l5TestBtn, true);
                });
            }
        } else {
            this.l5Misses += 1;
            if (this.l5Feedback) {
                this.l5Feedback.textContent = 'Thoda aur intezaar... jab glow tez ho tab tap karo.';
                this.l5Feedback.className = 'sg-feedback is-visible';
                this.later(1200, () => {
                    if (this.l5Feedback?.textContent.includes('intezaar')) {
                        this.l5Feedback.className = 'sg-feedback is-visible';
                        this.l5Feedback.textContent = 'Jab dil tez dhadke, tab tap karo...';
                    }
                });
            }
            // soft shake on core
            this.l5Core?.animate?.(
                [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
                { duration: 320, easing: 'ease-out' }
            );
            // forgiving: never hard-fail even if misses exceed max
        }
    }

    /* --------------------------------------------------------
       LEVEL 5 validation - dedicated TEST button.
       Required heartbeats caught -> TEST PASS -> exactly one
       queued transition to the existing game completion screen
       (which then leads to the reward). Otherwise -> TEST FAIL,
       stay on Level 5 and try again.
       -------------------------------------------------------- */
    _validateLevel5() {
        if (this.transitioning || this.state !== 'level5') return;

        if (this.l5Hits >= HEART_CONFIG.requiredHits) {
            // PASS
            this._showPassFeedback(this.l5Feedback, `${GAME_META.successMessages.level5b} ${GAME_META.successMessages.level5c}`);
            this._hideTestBtn(this.l5TestBtn);
            this._queueLevelTransition('level5', () => this._enterComplete(), this.reduced ? 400 : 1100);
        } else {
            // FAIL - stay on the level, keep tapping with the heartbeat
            this._showFailFeedback(this.l5Feedback, this.l5Wrap);
            // re-enable taps for another attempt (defensive; the TEST
            // button is normally only reachable when complete)
            if (this.l5Wrap) this.l5Wrap.style.pointerEvents = '';
        }
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

    /* --------------------------------------------------------
       COMPLETE
       -------------------------------------------------------- */
    _showComplete() {
        this._hideAllLevels();
        this.state = 'complete';
        this._setProgress(5);
        if (this.completeEl) {
            this.completeEl.hidden = false;
            void this.completeEl.offsetWidth;
            this.completeEl.classList.add('is-active');
        }
        if (this.shell) this.shell.scrollTop = 0;

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
            this.later(2600, () => {
                this.completeUnlockBtn.hidden = false;
                void this.completeUnlockBtn.offsetWidth;
                this.completeUnlockBtn.classList.add('is-in');
                this.completeUnlockBtn.focus({ preventScroll: true });
            });
        }
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
        this.state = 'reward';
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
    }

    _openEnvelope() {
        if (this.state !== 'reward' || !this.envelope) return;
        if (this.envelope.classList.contains('is-open')) return;
        this.envelope.classList.add('is-open');
        const hint = this.rewardEl?.querySelector('#sg-reward-hint');
        if (hint) hint.hidden = true;

        this.later(this.reduced ? 0 : 720, () => {
            if (this.rewardCard) {
                this.rewardCard.hidden = false;
                void this.rewardCard.offsetWidth;
                this.rewardCard.classList.add('is-in');
                // scroll card into view gently
                this.later(300, () => this.rewardCard.scrollIntoView({ behavior: this.reduced ? 'auto' : 'smooth', block: 'nearest' }));
            }
            this.later(this.reduced ? 0 : 800, () => {
                if (this.rewardContinueBtn) {
                    this.rewardContinueBtn.hidden = false;
                    void this.rewardContinueBtn.offsetWidth;
                    this.rewardContinueBtn.classList.add('is-in');
                    this.rewardContinueBtn.focus({ preventScroll: true });
                }
            });
        });
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
       advances. Direct setTimeout (not in this.timers) so
       in-level pacing timers can never cancel a committed
       transition, while destroy() still invalidates it safely.
       The transitioning lock guarantees exactly ONE scheduled
       transition - double TEST clicks can never queue twice.
       -------------------------------------------------------- */
    _queueLevelTransition(expectedState, nextFn, delay = 750) {
        if (this.transitioning) return;
        if (this.state !== expectedState || this.destroyed) return;
        this.transitioning = true;
        setTimeout(() => {
            this.transitioning = false;
            if (this.destroyed || this.state !== expectedState) return;
            nextFn();
        }, delay);
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
        for (const id of this.rafs) cancelAnimationFrame(id);
        this.rafs = [];
        if (this.l5Raf) { cancelAnimationFrame(this.l5Raf); this.l5Raf = null; }
    }
}
