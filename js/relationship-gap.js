import { prefersReducedMotion } from './utils.js';

export const RELATIONSHIP_GAP_STORAGE_KEY = 'hbm.relationshipGapAnswers.v1';
export const RELATIONSHIP_GAP_RESUME_KEY = 'hbm.relationshipGapResume.v1';

const RELATIONSHIP_GAP_RESUME_VERSION = 1;
const RESUME_MODES = new Set(['intro', 'question', 'review', 'summary']);

const QUESTIONS = Object.freeze([
    'Tumhare according hamare beech misunderstanding sabse zyada kis wajah se hoti hai?',
    'Jab hum dono upset hote hain, us waqt mujhe kya karna chahiye jo situation ko better bana sake?',
    'Meri kaunsi aadat ya reaction tumhe sabse zyada hurt ya irritate karta hai?',
    'Jab tum upset hoti ho, tum chahti ho main tumhe space du ya tumse baat karta rahu? Aur kyun?',
    'Tumhe kab lagta hai ki main tumhari baat properly nahi samajh raha?',
    'Agar hum dono ke beech misunderstanding ho, tumhare according pehla step kya hona chahiye?',
    'Hamare relationship me communication better karne ke liye hum dono kya change kar sakte hain?',
    'Jab hum fight karte hain, tum sabse zyada kya chahti ho ki main yaad rakhu?',
    'Hamare beech trust aur comfort aur strong karne ke liye hum kya kar sakte hain?',
    'Agar hum same problem baar-baar face karein, jaise abhi kuch dino se kar rahe hain, to tum chahti ho hum usko kis tarah solve karein?',
]);

// Fixed vectors keep each letter entrance noticeable, repeatable, and calm.
const LETTER_ARRIVALS = Object.freeze([
    { x: 0, y: -90, z: -80, scale: .82, rotate: -2 },
    { x: -90, y: -15, z: -60, scale: .84, rotate: -4 },
    { x: 90, y: -10, z: -60, scale: .84, rotate: 4 },
    { x: -65, y: -75, z: -70, scale: .8, rotate: -3 },
    { x: 65, y: -75, z: -70, scale: .8, rotate: 3 },
    { x: 0, y: 5, z: -150, scale: .65, rotate: 0 },
    { x: 55, y: 65, z: -80, scale: .78, rotate: 4 },
]);
const BLAST_VECTORS = Object.freeze([
    { x: -110, y: -100, z: -100, rotate: -14, scale: .65 },
    { x: 110, y: -100, z: -100, rotate: 14, scale: .65 },
    { x: -130, y: -20, z: -80, rotate: -11, scale: .72 },
    { x: 130, y: -15, z: -80, rotate: 11, scale: .72 },
    { x: -90, y: 100, z: -110, rotate: -16, scale: .62 },
    { x: 90, y: 100, z: -110, rotate: 16, scale: .62 },
    { x: 0, y: -25, z: -220, rotate: -8, scale: .55 },
]);
const PUNCTUATION = /^[.,!?;:…'"()[\]{}—–-]$/u;
const MILESTONES = { 3: 'Thank you for being honest.', 6: 'Main tumhari baat dhyaan se sun raha hoon.', 9: 'Bas ek aur... hum almost wahan hain.' };

function loadAnswers() {
    try {
        const data = JSON.parse(window.localStorage.getItem(RELATIONSHIP_GAP_STORAGE_KEY));
        if (!data || data.version !== 1 || !Array.isArray(data.answers)) return {};
        return data.answers.reduce((answers, entry) => {
            if (Number.isInteger(entry?.questionId) && entry.questionId >= 0 && entry.questionId < QUESTIONS.length &&
                entry.locked === true && typeof entry.answer === 'string') answers[entry.questionId] = entry;
            return answers;
        }, {});
    } catch { return {}; }
}

function saveAnswer(entry) {
    const answers = loadAnswers();
    // First confirmed value wins. This makes a double tap or stale UI harmless.
    if (answers[entry.questionId]) return answers;
    answers[entry.questionId] = entry;
    try { window.localStorage.setItem(RELATIONSHIP_GAP_STORAGE_KEY, JSON.stringify({ version: 1, answers: Object.values(answers) })); } catch {}
    return answers;
}

function readResumeState() {
    try {
        const data = JSON.parse(window.localStorage.getItem(RELATIONSHIP_GAP_RESUME_KEY));
        if (!data || data.version !== RELATIONSHIP_GAP_RESUME_VERSION) return null;
        return data;
    } catch { return null; }
}

function loadResumeState(answers) {
    const data = readResumeState();
    if (!data) return null;
    const drafts = {};
    if (data.drafts && typeof data.drafts === 'object' && !Array.isArray(data.drafts)) {
        for (let questionId = 0; questionId < QUESTIONS.length; questionId += 1) {
            const draft = data.drafts[String(questionId)];
            // A permanent answer is authoritative even if an old draft survived.
            if (!answers[questionId] && typeof draft === 'string') drafts[questionId] = draft;
        }
    }
    const currentQuestionId = Number.isInteger(data.currentQuestionId)
        ? data.currentQuestionId
        : data.currentQuestionIndex;
    return {
        active: data.active === true,
        currentQuestionId: Number.isInteger(currentQuestionId) && currentQuestionId >= 0 && currentQuestionId < QUESTIONS.length
            ? currentQuestionId
            : null,
        drafts,
        mode: RESUME_MODES.has(data.mode) ? data.mode : 'question',
        reviewQuestionId: Number.isInteger(data.reviewQuestionId) && data.reviewQuestionId >= 0 && data.reviewQuestionId < QUESTIONS.length
            ? data.reviewQuestionId
            : null,
    };
}

export function hasActiveRelationshipGapResume() {
    return readResumeState()?.active === true;
}

export function deactivateRelationshipGapResume() {
    const state = readResumeState();
    if (!state) return;
    try {
        window.localStorage.setItem(RELATIONSHIP_GAP_RESUME_KEY, JSON.stringify({
            ...state,
            active: false,
            updatedAt: Date.now(),
        }));
    } catch { /* Storage failure must never affect navigation. */ }
}

function graphemesOf(value) {
    try {
        if (typeof Intl?.Segmenter === 'function') {
            return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(part => part.segment);
        }
    } catch {}
    return Array.from(value);
}

export class RelationshipGapGame {
    constructor(root, { onComplete } = {}) {
        this.root = root;
        this.onComplete = onComplete;
        this.reduced = prefersReducedMotion();
        this.answers = loadAnswers();
        this.resumeState = loadResumeState(this.answers);
        this.drafts = { ...(this.resumeState?.drafts || {}) };
        this.questionIndex = this._resolveQuestionIndex(this.resumeState?.currentQuestionId);
        this.resumeActive = false;
        this.resumeSaveTimer = null;
        this.locking = false;
        this.transitioning = false;
        this.timers = new Set();
        this.bound = [];
        this.questionBound = [];
        this.parallax = null;
        this.parallaxPointerId = null;
        this.parallaxBounds = null;
        this.parallaxPending = null;
        this.parallaxResumeTimer = null;
        this.isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        this.motionPermissionState = 'unavailable';
        this.deviceTiltListening = false;
        this.deviceTiltActive = false;
        this.deviceTiltBaseline = null;
        this.deviceTiltSamples = [];
        this.deviceTiltTarget = { rx: 0, ry: 0 };
        this.deviceTiltSmoothed = { rx: 0, ry: 0 };
        this.deviceOrientationHandler = event => this._handleDeviceOrientation(event);
        this.isDestroyed = false;
        this.sceneToken = 0;
        this.visualValue = '';
        this.visualEntries = [];
        this.entrySequence = 0;
        this.isBackBlasting = false;
        this.mode = 'intro'; // intro | question | final | review
    }

    mount() {
        if (!this.root) return;
        this.root.innerHTML = `
            <div class="gap-chamber" aria-live="polite">
                <div class="gap-ambient" aria-hidden="true"></div>
                <i class="gap-orb gap-orb-one" aria-hidden="true"></i><i class="gap-orb gap-orb-two" aria-hidden="true"></i><i class="gap-orb gap-orb-three" aria-hidden="true"></i>
                <div class="gap-chamber-back" aria-hidden="true"></div><div class="gap-chamber-glow" aria-hidden="true"></div><div class="gap-chamber-side gap-chamber-side-left" aria-hidden="true"></div><div class="gap-chamber-side gap-chamber-side-right" aria-hidden="true"></div><div class="gap-chamber-floor" aria-hidden="true"></div>
                <div class="gap-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                <div class="gap-top"><span>05 / 05</span><span>FINAL GAME</span></div>
                <div class="gap-bridge" aria-label="Bridge of Words progress"><span>MAIN</span><div class="gap-bridge-segments"></div><span>TUM</span></div>
                <section class="gap-intro">
                    <p class="gap-kicker">HUMARE BEECH KA GAP</p>
                    <h3>HUMARE BEECH KA GAP</h3>
                    <p>Har relationship me kabhi na kabhi thoda sa gap aa jaata hai...</p>
                    <p>Par important ye hai ki hum us gap ko samajhna chahte hain ya nahi.</p>
                    <p>Is baar answers mujhe nahi, humein chahiye.</p>
                    <button type="button" class="sg-btn gap-start"><span>START ❤️</span></button>
                </section>
                <section class="gap-question" hidden></section>
                <section class="gap-final" hidden>
                    <div class="gap-complete-bridge" aria-hidden="true"></div>
                    <p>Tumne sirf answers nahi diye...</p>
                    <p>Tumne mujhe bataya ki hum dono aur behtar kaise ho sakte hain.</p>
                    <p>Har misunderstanding ke beech...</p>
                    <p>ek raasta hota hai.</p>
                    <h3>Aur mujhe khushi hai ki tum abhi bhi ‘hum’ choose karti ho. ❤️</h3>
                    <p>Thank you for choosing us.</p>
                    <button type="button" class="gap-review">REVIEW LOCKED ANSWERS</button>
                    <button type="button" class="sg-btn gap-continue"><span>CONTINUE ❤️</span></button>
                </section>
            </div>`;
        this.modalHost = this.root.closest('.scene-secret-game') || document.body;
        this.confirm = document.createElement('div');
        this.confirm.className = 'gap-confirm';
        this.confirm.hidden = true;
        this.confirm.innerHTML = `
            <div class="gap-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="gap-confirm-title">
                <p id="gap-confirm-title">Ek baar lock karne ke baad ye answer change nahi hoga.</p>
                <strong>Pakka?</strong>
                <div class="gap-confirm-actions"><button type="button" class="gap-edit">ABHI EDIT KARNA HAI</button><button type="button" class="gap-confirm-lock">HAAN, LOCK KARO</button></div>
            </div>`;
        this.modalHost.appendChild(this.confirm);
        this.intro = this.root.querySelector('.gap-intro');
        this.scene = this.root.querySelector('.gap-question');
        this.final = this.root.querySelector('.gap-final');
        this.chamber = this.root.querySelector('.gap-chamber');
        if (this.isCoarsePointer && !this.reduced) this.chamber?.classList.add('is-mobile-idle');
        this._updateBridge();
        this._on(this.root.querySelector('.gap-start'), 'click', () => {
            this._requestDeviceTiltPermission();
            this._start();
        });
        this._on(this.root.querySelector('.gap-continue'), 'click', () => this._complete());
        this._on(this.root.querySelector('.gap-review'), 'click', () => this._reviewAnswers());
        this._on(this.root.querySelector('.gap-bridge-segments'), 'click', event => this._reviewFromBridge(event));
        this._on(this.chamber, 'pointerdown', event => this._startTouchParallax(event));
        this._on(this.chamber, 'pointermove', event => this._parallax(event));
        this._on(this.chamber, 'pointerup', event => this._endTouchParallax(event));
        this._on(this.chamber, 'pointercancel', event => this._endTouchParallax(event));
        this._on(this.chamber, 'lostpointercapture', event => this._endTouchParallax(event));
        this._on(this.root, 'focusin', event => {
            if (event.target.matches?.('textarea,input,select,[contenteditable="true"]')) this._scheduleParallaxRender();
        });
        this._on(this.root, 'focusout', event => {
            if (event.target.matches?.('textarea,input,select,[contenteditable="true"]')) this._scheduleParallaxRender();
        });
        this._on(this.confirm.querySelector('.gap-edit'), 'click', () => this._dismissConfirmationForEdit());
        this._on(this.confirm.querySelector('.gap-confirm-lock'), 'click', () => this._lock());
        this._on(document, 'visibilitychange', () => {
            if (document.hidden) {
                this._flushResume();
                this._pauseDeviceTilt();
            } else {
                this._resumeDeviceTilt();
            }
        });
        this._on(window, 'pagehide', () => {
            this._flushResume();
            this._pauseDeviceTilt();
        });
        this._on(window, 'beforeunload', () => this._flushResume());
        // A bfcache return keeps this instance alive. Re-save its live state;
        // do not remount or duplicate its listeners/grapheme nodes.
        this._on(window, 'pageshow', () => {
            this._flushResume();
            this._resumeDeviceTilt();
        });
        this._prepareDeviceTilt();
        this.resumeActive = true;
        this._restoreResumeView();
        this._persistResume();
    }

    destroy() {
        this.isDestroyed = true;
        this._detachDeviceTilt();
        this._flushResume();
        if (this.parallax) cancelAnimationFrame(this.parallax);
        this.parallax = null;
        this.parallaxPending = null;
        if (this.parallaxResumeTimer) clearTimeout(this.parallaxResumeTimer);
        this.parallaxResumeTimer = null;
        if (this.resumeSaveTimer) clearTimeout(this.resumeSaveTimer);
        this.resumeSaveTimer = null;
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.bound.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
        this.bound = [];
        this.questionBound.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
        this.questionBound = [];
        this.root?.removeAttribute('inert');
        this.confirm?.remove();
        if (this.root) this.root.innerHTML = '';
    }

    exitWithWordBurst(done) {
        if (this.isBackBlasting) return;
        if (!this.scene || this.scene.hidden) { done?.(); return; }
        this.isBackBlasting = true;
        this.transitioning = true;
        const source = this.scene.querySelector('.animated-answer-layer, .gap-locked-answer');
        const allGlyphs = source ? [...source.querySelectorAll('.gap-char')] : [];
        const visibleGlyphs = allGlyphs.filter(node => !node.classList.contains('is-space') && !node.classList.contains('is-break'));
        if (this.textarea) {
            this.textarea.readOnly = true;
            this.textarea.blur();
        }
        this.caret?.classList.add('is-hidden');

        let completed = false;
        let fallbackTimer = null;
        const finish = () => {
            if (completed) return;
            completed = true;
            if (fallbackTimer) { clearTimeout(fallbackTimer); this.timers.delete(fallbackTimer); }
            this.isBackBlasting = false;
            this.transitioning = false;
            done?.();
        };

        if (!visibleGlyphs.length || this.reduced) {
            this.scene.classList.add('is-back-preparing', 'is-empty-back-exit');
            requestAnimationFrame(() => requestAnimationFrame(() => this.scene?.classList.add('is-back-blasting')));
            fallbackTimer = this._later(this.reduced ? 140 : 420, finish);
            return;
        }

        const sourceRect = source.getBoundingClientRect();
        const positions = visibleGlyphs.map(node => {
            const rect = node.getBoundingClientRect();
            return { left: rect.left - sourceRect.left, top: rect.top - sourceRect.top, width: rect.width, height: rect.height };
        });
        source.style.minHeight = `${Math.max(sourceRect.height, 1)}px`;
        source.classList.add('is-blast-source');
        const step = Math.min(18, Math.max(4, 260 / Math.max(visibleGlyphs.length - 1, 1)));
        visibleGlyphs.forEach((node, index) => {
            node._finishArrival?.();
            const position = positions[index];
            const vector = BLAST_VECTORS[index % BLAST_VECTORS.length];
            node.classList.remove('is-entering', 'is-entry-prep', 'is-deleting');
            node.classList.add('is-blast-ready');
            Object.assign(node.style, {
                left: `${position.left}px`, top: `${position.top}px`,
                width: `${Math.max(position.width, .5)}px`, height: `${Math.max(position.height, 1)}px`,
            });
            node.style.setProperty('--blast-x', `${vector.x}px`);
            node.style.setProperty('--blast-y', `${vector.y}px`);
            node.style.setProperty('--blast-z', `${vector.z}px`);
            node.style.setProperty('--blast-r', `${vector.rotate}deg`);
            node.style.setProperty('--blast-scale', String(vector.scale));
            node.style.setProperty('--blast-delay', `${Math.min(index * step, 260)}ms`);
        });
        this.scene.classList.add('is-back-preparing');
        const lastGlyph = visibleGlyphs[visibleGlyphs.length - 1];
        lastGlyph.addEventListener('animationend', event => {
            if (event.target === lastGlyph && event.animationName === 'gap-existing-char-blast') finish();
        }, { once: true });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (!this.scene || completed) return;
            this.scene.classList.add('is-back-blasting');
            visibleGlyphs.forEach(node => node.classList.add('is-blasting'));
        }));
        fallbackTimer = this._later(930, finish);
    }

    handleBack() {
        if (this.mode !== 'review') return false;
        if (!this.isBackBlasting) this.exitWithWordBurst(() => this.returnToSummary());
        return true;
    }

    _on(el, event, fn) { if (el) { el.addEventListener(event, fn); this.bound.push([el, event, fn]); } }
    _onQuestion(el, event, fn) { if (el) { el.addEventListener(event, fn); this.questionBound.push([el, event, fn]); } }
    _later(ms, fn) { const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, ms); this.timers.add(timer); return timer; }
    _firstOpenQuestion() { for (let i = 0; i < QUESTIONS.length; i++) if (!this.answers[i]) return i; return QUESTIONS.length; }
    _lockedCount() { return Object.keys(this.answers).length; }

    _resolveQuestionIndex(candidate) {
        if (Number.isInteger(candidate) && candidate >= 0 && candidate < QUESTIONS.length && !this.answers[candidate]) return candidate;
        return this._firstOpenQuestion();
    }

    _restoreResumeView() {
        if (this._lockedCount() >= QUESTIONS.length) {
            this.questionIndex = QUESTIONS.length;
            this._showFinal();
            return;
        }
        const savedMode = this.resumeState?.mode || 'intro';
        const reviewQuestionId = this.resumeState?.reviewQuestionId;
        if (savedMode === 'review' && Number.isInteger(reviewQuestionId) && this.answers[reviewQuestionId]) {
            this.mode = 'review';
            this.questionIndex = reviewQuestionId;
            this.intro.hidden = true;
            this.final.hidden = true;
            this.scene.hidden = false;
            this._renderQuestion();
        } else if (savedMode === 'question' || savedMode === 'review' || savedMode === 'summary') {
            this.mode = 'question';
            this.questionIndex = this._resolveQuestionIndex(this.resumeState?.currentQuestionId);
            this.intro.hidden = true;
            this.final.hidden = true;
            this.scene.hidden = false;
            this._renderQuestion();
        } else {
            this.mode = 'intro';
            this._persistResume();
        }
    }

    _rememberCurrentDraft(value) {
        if (this.mode !== 'question' || this.answers[this.questionIndex]) return;
        this.drafts[this.questionIndex] = value;
        if (this.resumeSaveTimer) clearTimeout(this.resumeSaveTimer);
        this.resumeSaveTimer = setTimeout(() => {
            this.resumeSaveTimer = null;
            this._persistResume();
        }, 150);
    }

    _captureTextareaDraft() {
        if (this.mode !== 'question' || !this.textarea?.isConnected || this.answers[this.questionIndex]) return;
        this.drafts[this.questionIndex] = this.textarea.value;
    }

    _persistResume() {
        this._captureTextareaDraft();
        const drafts = {};
        for (let questionId = 0; questionId < QUESTIONS.length; questionId += 1) {
            if (!this.answers[questionId] && typeof this.drafts[questionId] === 'string') drafts[questionId] = this.drafts[questionId];
        }
        this.drafts = drafts;
        const mode = this.mode === 'final' ? 'summary' : RESUME_MODES.has(this.mode) ? this.mode : 'question';
        const currentQuestionId = mode === 'question'
            ? this._resolveQuestionIndex(this.questionIndex)
            : this._resolveQuestionIndex(this.resumeState?.currentQuestionId);
        const reviewQuestionId = mode === 'review' && this.answers[this.questionIndex] ? this.questionIndex : null;
        const state = {
            version: RELATIONSHIP_GAP_RESUME_VERSION,
            active: this.resumeActive,
            currentQuestionId,
            currentQuestionIndex: currentQuestionId,
            drafts,
            mode,
            reviewQuestionId,
            updatedAt: Date.now(),
        };
        this.resumeState = state;
        try { window.localStorage.setItem(RELATIONSHIP_GAP_RESUME_KEY, JSON.stringify(state)); } catch {}
    }

    _flushResume() {
        if (this.resumeSaveTimer) clearTimeout(this.resumeSaveTimer);
        this.resumeSaveTimer = null;
        this._persistResume();
    }

    deactivateResume() {
        this._captureTextareaDraft();
        this.resumeActive = false;
        this._flushResume();
    }

    _start() {
        if (this.transitioning) return;
        this.mode = 'question';
        this.intro.hidden = true;
        this.scene.hidden = false;
        this._persistResume();
        this._renderQuestion();
    }

    _renderQuestion() {
        if (this.questionIndex >= QUESTIONS.length) { this._showFinal(); return; }
        this.questionBound.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
        this.questionBound = [];
        const token = ++this.sceneToken;
        const number = this.questionIndex + 1;
        const saved = this.answers[this.questionIndex];
        if (saved) { this._renderLockedQuestion(saved, number, token); return; }
        this.scene.className = 'gap-question is-entering';
        this.scene.innerHTML = `
            <div class="gap-question-head"><span>${String(number).padStart(2, '0')} / 10</span><span>${this._lockedCount()} locked</span></div>
            <article class="gap-glass-card"><p>${QUESTIONS[this.questionIndex]}</p></article>
            <div class="gap-input-wrap">
                <label for="gap-answer">Apni baat likho</label>
                <div class="gap-answer-shell">
                    <div class="gap-word-stage" aria-label="Your answer"><p class="animated-answer-layer"><span class="gap-cinematic-text"><span class="gap-cinematic-caret" aria-hidden="true"></span></span><span class="gap-visual-placeholder">Yahan dil ki baat likho...</span></p></div>
                    <textarea id="gap-answer" class="gap-real-input" rows="5" aria-label="Apni baat likho" aria-describedby="gap-warning"></textarea>
                </div>
            </div>
            <p id="gap-warning" class="gap-warning">Dil se likho... ek baar lock hone ke baad ye answer change nahi hoga.</p>
            <p class="gap-validation" role="status"></p>
            <button type="button" class="sg-btn gap-lock"><span>LOCK MY ANSWER</span></button>`;
        this.stage = this.scene.querySelector('.gap-word-stage');
        this.textLayer = this.scene.querySelector('.gap-cinematic-text');
        this.caret = this.scene.querySelector('.gap-cinematic-caret');
        this.answerShell = this.scene.querySelector('.gap-answer-shell');
        this.visualPlaceholder = this.scene.querySelector('.gap-visual-placeholder');
        this.textarea = this.scene.querySelector('textarea');
        this.validation = this.scene.querySelector('.gap-validation');
        this.visualValue = '';
        this.visualEntries = [];
        this.entrySequence = 0;
        this.activeArrivals = 0;
        this.isBackBlasting = false;
        this._onQuestion(this.textarea, 'input', event => this._syncGraphemes(event));
        this._onQuestion(this.textarea, 'scroll', () => { this.stage.scrollTop = this.textarea.scrollTop; });
        this._onQuestion(this.scene.querySelector('.gap-lock'), 'click', () => this._askLock());
        const restoredDraft = typeof this.drafts[this.questionIndex] === 'string' ? this.drafts[this.questionIndex] : '';
        this.textarea.value = restoredDraft;
        if (restoredDraft) this._reconcileVisualValue(restoredDraft);
        this.visualValue = restoredDraft;
        this.visualPlaceholder.hidden = !!restoredDraft;
        this.textarea.setSelectionRange(restoredDraft.length, restoredDraft.length);
        this._persistResume();
        this._later(this.reduced ? 0 : 32, () => { if (token === this.sceneToken) this.scene.classList.remove('is-entering'); });
        this.textarea.focus({ preventScroll: true });
    }

    _syncGraphemes(event) {
        if (this.isBackBlasting || !this.textarea) return;
        const nextValue = this.textarea.value;
        const previous = graphemesOf(this.visualValue);
        const next = graphemesOf(nextValue);
        const selectionAtEnd = this.textarea.selectionStart === nextValue.length && this.textarea.selectionEnd === nextValue.length;
        const isSimpleAppend = event?.inputType === 'insertText' && !event.isComposing && selectionAtEnd &&
            next.length > previous.length && previous.every((glyph, index) => glyph === next[index]);
        const isSimpleBackspace = event?.inputType === 'deleteContentBackward' && selectionAtEnd &&
            previous.length === next.length + 1 && next.every((glyph, index) => glyph === previous[index]);

        if (isSimpleAppend) next.slice(previous.length).forEach(glyph => this._appendVisualGrapheme(glyph, true));
        else if (isSimpleBackspace) this._removeLastVisualGrapheme();
        else if (nextValue !== this.visualValue) this._reconcileVisualValue(nextValue);

        this.visualValue = nextValue;
        this.visualPlaceholder.hidden = !!nextValue;
        this._rememberCurrentDraft(nextValue);
    }

    _appendVisualGrapheme(glyph, animate = false) {
        const node = document.createElement('span');
        const isBreak = glyph === '\n';
        const isSpace = !isBreak && /^\s$/u.test(glyph);
        const isPunctuation = PUNCTUATION.test(glyph);
        node.className = `gap-char${isSpace ? ' is-space' : ''}${isBreak ? ' is-break' : ''}${isPunctuation ? ' is-punctuation' : ''}`;
        node.textContent = glyph;
        this.textLayer.insertBefore(node, this.caret);
        this.visualEntries.push({ glyph, node });
        if (animate && !this.reduced && !isSpace && !isBreak) this._animateIncomingGrapheme(node, isPunctuation);
        return node;
    }

    _animateIncomingGrapheme(node, isPunctuation) {
        const motion = LETTER_ARRIVALS[this.entrySequence % LETTER_ARRIVALS.length];
        this.entrySequence += 1;
        const distance = isPunctuation ? .46 : 1;
        const duration = isPunctuation ? 420 : 560;
        const setMotion = target => {
            target.style.setProperty('--entry-x', `${motion.x * distance}px`);
            target.style.setProperty('--entry-y', `${motion.y * distance}px`);
            target.style.setProperty('--entry-z', `${motion.z * (isPunctuation ? .55 : 1)}px`);
            target.style.setProperty('--entry-scale', String(isPunctuation ? .88 : motion.scale));
            target.style.setProperty('--entry-rotate', `${motion.rotate * distance}deg`);
            target.style.setProperty('--entry-duration', `${duration}ms`);
        };
        setMotion(node);
        if (this.activeArrivals < 8) node.classList.add('has-trail');
        node.classList.add('is-entry-prep');
        this.activeArrivals += 1;
        this.answerShell?.classList.add('has-arriving-char');
        if (this.caret) {
            this.caret.classList.remove('is-following-arrival');
            setMotion(this.caret);
            this.caret.classList.add('is-entry-prep');
        }
        requestAnimationFrame(() => {
            if (!node.isConnected || this.isBackBlasting) return;
            node.classList.remove('is-entry-prep');
            node.classList.add('is-entering');
            if (this.caret) {
                this.caret.classList.remove('is-entry-prep');
                // Reflow makes rapid typing restart the caret from the newest letter's vector.
                void this.caret.offsetWidth;
                this.caret.classList.add('is-following-arrival');
            }
        });
        let settled = false;
        let fallbackTimer = null;
        const settle = event => {
            if (event && (event.target !== node || event.animationName !== 'gap-char-arrive')) return;
            if (settled) return;
            settled = true;
            node.removeEventListener('animationend', settle);
            if (fallbackTimer) { clearTimeout(fallbackTimer); this.timers.delete(fallbackTimer); }
            node.classList.remove('is-entering', 'is-entry-prep', 'has-trail');
            this.activeArrivals = Math.max(0, this.activeArrivals - 1);
            if (!this.activeArrivals) {
                this.answerShell?.classList.remove('has-arriving-char');
                this.caret?.classList.remove('is-following-arrival', 'is-entry-prep');
            }
        };
        node._finishArrival = settle;
        node.addEventListener('animationend', settle);
        fallbackTimer = this._later(duration + 140, settle);
    }

    _removeLastVisualGrapheme() {
        const entry = this.visualEntries.pop();
        if (!entry) return;
        const { node, glyph } = entry;
        node._finishArrival?.();
        if (/^\s$/u.test(glyph) || this.reduced) { node.remove(); return; }
        this.textLayer.insertBefore(this.caret, node);
        node.classList.remove('is-entering', 'is-entry-prep');
        node.classList.add('is-deleting');
        node.addEventListener('animationend', event => {
            if (event.target === node && event.animationName === 'gap-char-delete') node.remove();
        }, { once: true });
        this._later(190, () => node.remove());
    }

    _reconcileVisualValue(value) {
        this.visualEntries.forEach(entry => entry.node._finishArrival?.());
        this.textLayer.replaceChildren(this.caret);
        this.visualEntries = [];
        graphemesOf(value).forEach(glyph => this._appendVisualGrapheme(glyph, false));
        this.textLayer.classList.remove('is-reconciling');
        void this.textLayer.offsetWidth;
        if (!this.reduced) this.textLayer.classList.add('is-reconciling');
    }

    _askLock() {
        if (this.locking) return;
        if (!this.textarea.value.trim()) { this.validation.textContent = 'Pehle dil ki baat likho...'; this.validation.classList.add('is-visible'); return; }
        this._syncGraphemes();
        this.validation.textContent = '';
        this.confirm.classList.remove('is-closing');
        this.confirm.hidden = false;
        this.root.setAttribute('inert', '');
        this.scene.classList.add('is-confirming');
        this.confirm.querySelector('.gap-confirm-lock').focus({ preventScroll: true });
    }

    _dismissConfirmationForEdit() {
        if (!this.confirm || this.confirm.hidden || this.confirm.classList.contains('is-closing')) return;
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            this.confirm.hidden = true;
            this.confirm.classList.remove('is-closing');
            this.root.removeAttribute('inert');
            this.scene.classList.remove('is-confirming');
            this.textarea?.focus({ preventScroll: true });
        };
        if (this.reduced) { finish(); return; }
        const onEnd = event => {
            if (event.target !== this.confirm || event.animationName !== 'gap-confirm-overlay-out') return;
            this.confirm.removeEventListener('animationend', onEnd);
            finish();
        };
        this.confirm.addEventListener('animationend', onEnd);
        this.confirm.classList.add('is-closing');
        this._later(240, () => {
            this.confirm?.removeEventListener('animationend', onEnd);
            finish();
        });
    }

    _lock() {
        if (this.locking || !this.textarea.value.trim()) return;
        this.locking = true;
        this.confirm.hidden = true;
        this.confirm.classList.remove('is-closing');
        this.root.removeAttribute('inert');
        const lockedQuestionId = this.questionIndex;
        const entry = { questionId: lockedQuestionId, answer: this.textarea.value.trim(), locked: true, submittedAt: new Date().toISOString() };
        this.answers = saveAnswer(entry);
        delete this.drafts[lockedQuestionId];
        this._renderLockedQuestion(this.answers[lockedQuestionId], lockedQuestionId + 1, ++this.sceneToken, true);
        this._updateBridge();
        const count = this._lockedCount();
        const message = MILESTONES[count];
        if (message) this._showMilestone(message);
        this.questionIndex = this._firstOpenQuestion();
        this._persistResume();
        this._later(this.reduced ? 80 : 860, () => {
            this.locking = false;
            if (this.questionIndex >= QUESTIONS.length) this._showFinal();
            else this._renderQuestion();
        });
    }

    _renderLockedQuestion(entry, number, token, justLocked = false) {
        this.textarea = null;
        this.questionBound.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
        this.questionBound = [];
        this.scene.className = `gap-question gap-locked-question ${justLocked ? 'is-locking' : 'is-entering'}`;
        this.scene.innerHTML = `
            <div class="gap-question-head"><span>${String(number).padStart(2, '0')} / 10</span><span>LOCKED</span></div>
            <article class="gap-glass-card"><p>${QUESTIONS[entry.questionId]}</p></article>
            <article class="gap-locked-card" aria-label="Locked answer">
                <div class="gap-locked-card-head"><span aria-hidden="true">🔒</span><div><strong>Locked Answer</strong><small>Ye answer ab change nahi hoga.</small></div></div>
                <p class="gap-locked-answer"></p>
                <span class="gap-locked-date">Saved permanently</span>
            </article>
            <nav class="gap-review-controls" aria-label="Locked answer navigation" hidden><button type="button" class="gap-review-prev">← PREVIOUS</button><button type="button" class="gap-review-summary">← SUMMARY</button><button type="button" class="gap-review-next">NEXT →</button></nav>
            <button type="button" class="gap-return-current" hidden>RETURN TO CURRENT QUESTION</button>`;
        const answer = this.scene.querySelector('.gap-locked-answer');
        this._appendAnswerTokens(answer, entry.answer);
        const returnButton = this.scene.querySelector('.gap-return-current');
        if (this._firstOpenQuestion() < QUESTIONS.length && entry.questionId !== this._firstOpenQuestion()) {
            returnButton.hidden = false;
            this._onQuestion(returnButton, 'click', () => { this.questionIndex = this._firstOpenQuestion(); this._renderQuestion(); });
        }
        if (this.mode === 'review') this._wireReviewControls(entry.questionId);
        this._later(this.reduced ? 0 : 32, () => { if (token === this.sceneToken) this.scene.classList.remove('is-entering'); });
    }

    _appendAnswerTokens(target, answer) {
        // Locked answers use the same grapheme nodes so review Back can blast
        // the exact text the user sees without rebuilding a second overlay.
        graphemesOf(answer).forEach(glyph => {
            const char = document.createElement('span');
            char.className = `gap-char${glyph === '\n' ? ' is-break' : /^\s$/u.test(glyph) ? ' is-space' : ''}`;
            char.textContent = glyph;
            target.append(char);
        });
    }

    _updateBridge() {
        const count = this._lockedCount();
        const holder = this.root?.querySelector('.gap-bridge-segments');
        if (!holder) return;
        holder.replaceChildren();
        for (let index = 0; index < QUESTIONS.length; index += 1) {
            const segment = document.createElement('button');
            const locked = !!this.answers[index];
            segment.type = 'button'; segment.className = `gap-bridge-segment ${locked ? 'is-lit' : ''}`;
            segment.dataset.question = String(index); segment.disabled = !locked;
            segment.setAttribute('aria-label', locked ? `Review locked answer ${index + 1}` : `Answer ${index + 1} not locked yet`);
            holder.append(segment);
        }
    }

    _reviewFromBridge(event) {
        const segment = event.target.closest('.gap-bridge-segment');
        if (!segment || segment.disabled) return;
        if (this.mode === 'final') this.mode = 'review';
        this.questionIndex = Number(segment.dataset.question);
        this.intro.hidden = true; this.final.hidden = true; this.scene.hidden = false;
        this._persistResume();
        this._renderQuestion();
    }

    _reviewAnswers() {
        this.mode = 'review';
        this.questionIndex = Object.keys(this.answers).map(Number).sort((a, b) => a - b)[0] ?? 0;
        this.final.hidden = true; this.scene.hidden = false;
        this._persistResume();
        this._renderQuestion();
    }

    _wireReviewControls(questionId) {
        const nav = this.scene.querySelector('.gap-review-controls');
        const locked = Object.keys(this.answers).map(Number).sort((a, b) => a - b);
        const position = locked.indexOf(questionId);
        const previous = nav.querySelector('.gap-review-prev');
        const next = nav.querySelector('.gap-review-next');
        nav.hidden = false;
        previous.disabled = position <= 0;
        next.disabled = position >= locked.length - 1;
        this._onQuestion(previous, 'click', () => { this.questionIndex = locked[position - 1]; this._persistResume(); this._renderQuestion(); });
        this._onQuestion(next, 'click', () => { this.questionIndex = locked[position + 1]; this._persistResume(); this._renderQuestion(); });
        this._onQuestion(nav.querySelector('.gap-review-summary'), 'click', () => this.returnToSummary());
    }

    returnToSummary() {
        if (this.mode !== 'review') return;
        this.mode = 'final';
        this.scene.hidden = true;
        this.final.hidden = false;
        this.final.classList.add('is-visible');
        this._updateBridge();
        this._persistResume();
    }

    _showMilestone(message) {
        const note = document.createElement('p'); note.className = 'gap-milestone'; note.textContent = message; this.scene.appendChild(note);
        this._later(this.reduced ? 10 : 1250, () => note.remove());
    }

    _showFinal() {
        this.mode = 'final';
        this.intro.hidden = true; this.scene.hidden = true; this.final.hidden = false; this.final.classList.add('is-visible'); this._updateBridge();
        this._persistResume();
    }

    _complete() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.deactivateResume();
        this.root.querySelector('.gap-continue').disabled = true;
        this.onComplete?.();
    }

    _parallax(event) {
        if (this.reduced) return;
        if (this.isCoarsePointer) {
            if (this.parallaxPointerId === event.pointerId) this._queueTouchParallax(event);
            return;
        }
        if (!window.matchMedia('(pointer:fine)').matches) return;
        const chamber = event.currentTarget, rect = chamber.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - .5) * 4;
        const y = ((event.clientY - rect.top) / rect.height - .5) * -3;
        chamber.style.setProperty('--gap-rx', `${y}deg`); chamber.style.setProperty('--gap-ry', `${x}deg`);
    }

    _startTouchParallax(event) {
        if (this.reduced || !this.isCoarsePointer || event.isPrimary === false) return;
        if (this.textarea && document.activeElement === this.textarea) return;
        if (event.target.closest('textarea,input,select,button,a,[contenteditable="true"]')) return;
        this._requestDeviceTiltPermission();
        this.parallaxPointerId = event.pointerId;
        this.parallaxBounds = event.currentTarget.getBoundingClientRect();
        if (this.parallaxResumeTimer) {
            clearTimeout(this.parallaxResumeTimer);
            this.timers.delete(this.parallaxResumeTimer);
            this.parallaxResumeTimer = null;
        }
        this.chamber.classList.remove('is-mobile-idle', 'is-touch-settling', 'is-device-tilt');
        this.chamber.classList.add('is-touch-parallax');
        try { this.chamber.setPointerCapture(event.pointerId); } catch {}
        this._queueTouchParallax(event);
    }

    _queueTouchParallax(event) {
        const rect = this.parallaxBounds;
        if (!rect?.width || !rect?.height) return;
        const clamp = value => Math.max(-1, Math.min(1, value));
        const normalizedX = clamp(((event.clientX - rect.left) / rect.width - .5) * 2);
        const normalizedY = clamp(((event.clientY - rect.top) / rect.height - .5) * 2);
        this.parallaxPending = this._createParallaxOutput(
            normalizedY * -2.5,
            normalizedX * 3,
            normalizedX,
            normalizedY,
            Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100)),
            Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100)),
        );
        this._scheduleParallaxRender();
    }

    _endTouchParallax(event) {
        if (!this.isCoarsePointer || this.parallaxPointerId !== event.pointerId) return;
        this.parallaxPointerId = null;
        this.parallaxBounds = null;
        this.parallaxPending = null;
        if (this.parallax) cancelAnimationFrame(this.parallax);
        this.parallax = null;
        if (!this.chamber) return;
        this.chamber.classList.remove('is-touch-parallax');
        if (this.deviceTiltActive && !document.hidden) {
            this.chamber.classList.remove('is-touch-settling', 'is-mobile-idle');
            this.chamber.classList.add('is-device-tilt');
            this._scheduleParallaxRender();
            return;
        }
        this.chamber.classList.add('is-touch-settling');
        this.chamber.style.setProperty('--gap-rx', '0deg');
        this.chamber.style.setProperty('--gap-ry', '0deg');
        this.chamber.style.setProperty('--gap-pan-x', '0px');
        this.chamber.style.setProperty('--gap-pan-y', '0px');
        this.chamber.style.setProperty('--gap-back-x', '0px');
        this.chamber.style.setProperty('--gap-back-y', '0px');
        this.chamber.style.setProperty('--gap-frame-x', '0px');
        this.chamber.style.setProperty('--gap-frame-y', '0px');
        this.chamber.style.setProperty('--gap-near-x', '0px');
        this.chamber.style.setProperty('--gap-near-y', '0px');
        this.chamber.style.setProperty('--gap-control-x', '0px');
        this.chamber.style.setProperty('--gap-control-y', '0px');
        this.chamber.style.setProperty('--rg-light-x', '50%');
        this.chamber.style.setProperty('--rg-light-y', '42%');
        this.parallaxResumeTimer = this._later(760, () => {
            this.parallaxResumeTimer = null;
            if (!this.chamber || this.reduced || this.parallaxPointerId !== null) return;
            this.chamber.classList.remove('is-touch-settling');
            this.chamber.classList.add('is-mobile-idle');
        });
    }

    _createParallaxOutput(rx, ry, normalizedX, normalizedY, lightX, lightY) {
        return {
            rx,
            ry,
            panX: normalizedX * 2.2,
            panY: normalizedY * 1.7,
            backX: normalizedX * .7,
            backY: normalizedY * .55,
            frameX: normalizedX * 1.2,
            frameY: normalizedY * .9,
            nearX: normalizedX * 3.1,
            nearY: normalizedY * 2.25,
            controlX: normalizedX * -.65,
            controlY: normalizedY * -.5,
            lightX,
            lightY,
        };
    }

    _scheduleParallaxRender() {
        if (this.parallax || this.reduced || !this.chamber) return;
        this.parallax = requestAnimationFrame(() => this._renderParallaxFrame());
    }

    _renderParallaxFrame() {
        this.parallax = null;
        if (!this.chamber || this.reduced || document.hidden) return;
        if (this.parallaxPointerId !== null) {
            const touchOutput = this.parallaxPending;
            this.parallaxPending = null;
            if (touchOutput) this._renderParallaxOutput(touchOutput);
            return;
        }
        if (!this.deviceTiltActive) return;

        const smoothing = .11;
        const deltaX = this.deviceTiltTarget.rx - this.deviceTiltSmoothed.rx;
        const deltaY = this.deviceTiltTarget.ry - this.deviceTiltSmoothed.ry;
        this.deviceTiltSmoothed.rx += deltaX * smoothing;
        this.deviceTiltSmoothed.ry += deltaY * smoothing;
        const activeElement = document.activeElement;
        const inputFocused = !!activeElement && this.root?.contains(activeElement) &&
            activeElement.matches?.('textarea,input,select,[contenteditable="true"]');
        const strength = inputFocused ? .32 : 1;
        const rx = this.deviceTiltSmoothed.rx * strength;
        const ry = this.deviceTiltSmoothed.ry * strength;
        const normalizedX = ry / 2.8;
        const normalizedY = -rx / 2.2;
        this._renderParallaxOutput(this._createParallaxOutput(
            rx,
            ry,
            normalizedX,
            normalizedY,
            50 - normalizedX * 12,
            42 - normalizedY * 9,
        ));
        if (Math.abs(deltaX) > .015 || Math.abs(deltaY) > .015) this._scheduleParallaxRender();
    }

    _renderParallaxOutput(next) {
        if (!next || !this.chamber) return;
        this.chamber.style.setProperty('--gap-rx', next.rx.toFixed(2) + 'deg');
        this.chamber.style.setProperty('--gap-ry', next.ry.toFixed(2) + 'deg');
        this.chamber.style.setProperty('--gap-pan-x', next.panX.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-pan-y', next.panY.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-back-x', next.backX.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-back-y', next.backY.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-frame-x', next.frameX.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-frame-y', next.frameY.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-near-x', next.nearX.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-near-y', next.nearY.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-control-x', next.controlX.toFixed(2) + 'px');
        this.chamber.style.setProperty('--gap-control-y', next.controlY.toFixed(2) + 'px');
        this.chamber.style.setProperty('--rg-light-x', next.lightX.toFixed(1) + '%');
        this.chamber.style.setProperty('--rg-light-y', next.lightY.toFixed(1) + '%');
    }

    _prepareDeviceTilt() {
        if (this.reduced || !this.isCoarsePointer || !window.DeviceOrientationEvent) return;
        if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
            this.motionPermissionState = 'unrequested';
            return;
        }
        this.motionPermissionState = 'granted';
        this._attachDeviceTilt();
    }

    _requestDeviceTiltPermission() {
        if (this.reduced || !this.isCoarsePointer || this.motionPermissionState !== 'unrequested') return;
        const requestPermission = window.DeviceOrientationEvent?.requestPermission;
        if (typeof requestPermission !== 'function') return;
        this.motionPermissionState = 'requesting';
        let permission;
        try {
            permission = requestPermission.call(window.DeviceOrientationEvent);
        } catch {
            this.motionPermissionState = 'denied';
            return;
        }
        Promise.resolve(permission).then(result => {
            if (this.isDestroyed) return;
            if (result === 'granted') {
                this.motionPermissionState = 'granted';
                this._attachDeviceTilt();
            } else {
                this.motionPermissionState = 'denied';
                this._useIdleFallback();
            }
        }).catch(() => {
            if (this.isDestroyed) return;
            this.motionPermissionState = 'denied';
            this._useIdleFallback();
        });
    }

    _attachDeviceTilt() {
        if (this.deviceTiltListening || this.isDestroyed || document.hidden ||
            this.reduced || !this.isCoarsePointer || this.motionPermissionState !== 'granted') return;
        this.deviceTiltBaseline = null;
        this.deviceTiltSamples = [];
        window.addEventListener('deviceorientation', this.deviceOrientationHandler, { passive: true });
        this.deviceTiltListening = true;
    }

    _detachDeviceTilt() {
        if (!this.deviceTiltListening) return;
        window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
        this.deviceTiltListening = false;
    }

    _handleDeviceOrientation(event) {
        if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma) || document.hidden) return;
        if (!this.deviceTiltBaseline) {
            this.deviceTiltSamples.push({ beta: event.beta, gamma: event.gamma });
            if (this.deviceTiltSamples.length < 5) return;
            const recent = this.deviceTiltSamples.slice(-5);
            const betaValues = recent.map(sample => sample.beta);
            const gammaValues = recent.map(sample => sample.gamma);
            const betaSpread = Math.max(...betaValues) - Math.min(...betaValues);
            const gammaSpread = Math.max(...gammaValues) - Math.min(...gammaValues);
            if (betaSpread > 4 || gammaSpread > 4) {
                this.deviceTiltSamples.shift();
                return;
            }
            this.deviceTiltBaseline = {
                beta: betaValues.reduce((sum, value) => sum + value, 0) / betaValues.length,
                gamma: gammaValues.reduce((sum, value) => sum + value, 0) / gammaValues.length,
            };
            this.deviceTiltSamples = [];
            return;
        }

        const angleDelta = (value, baseline) => {
            let delta = value - baseline;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            return delta;
        };
        const betaDelta = angleDelta(event.beta, this.deviceTiltBaseline.beta);
        const gammaDelta = angleDelta(event.gamma, this.deviceTiltBaseline.gamma);
        const screenAngle = Number(window.screen?.orientation?.angle ?? window.orientation ?? 0);
        let pitch = betaDelta;
        let roll = gammaDelta;
        if (screenAngle === 90 || screenAngle === -270) {
            pitch = gammaDelta;
            roll = -betaDelta;
        } else if (screenAngle === -90 || screenAngle === 270) {
            pitch = -gammaDelta;
            roll = betaDelta;
        }
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        this.deviceTiltTarget.rx = clamp((-pitch / 18) * 2.2, -2.2, 2.2);
        this.deviceTiltTarget.ry = clamp((roll / 18) * 2.8, -2.8, 2.8);
        if (!this.deviceTiltActive) this._activateDeviceTilt();
        if (this.parallaxPointerId === null) this._scheduleParallaxRender();
    }

    _activateDeviceTilt() {
        this.deviceTiltActive = true;
        if (this.parallaxResumeTimer) {
            clearTimeout(this.parallaxResumeTimer);
            this.timers.delete(this.parallaxResumeTimer);
            this.parallaxResumeTimer = null;
        }
        if (this.parallaxPointerId !== null || !this.chamber) return;
        this.chamber.classList.remove('is-mobile-idle', 'is-touch-settling');
        this.chamber.classList.add('is-device-tilt');
    }

    _pauseDeviceTilt() {
        this._detachDeviceTilt();
        this.deviceTiltActive = false;
        this.deviceTiltBaseline = null;
        this.deviceTiltSamples = [];
        this.deviceTiltTarget = { rx: 0, ry: 0 };
        this.deviceTiltSmoothed = { rx: 0, ry: 0 };
        this.parallaxPointerId = null;
        this.parallaxBounds = null;
        this.parallaxPending = null;
        if (this.parallax) cancelAnimationFrame(this.parallax);
        this.parallax = null;
        this.chamber?.classList.remove('is-touch-parallax');
        this._useIdleFallback();
    }

    _resumeDeviceTilt() {
        if (this.motionPermissionState === 'granted') this._attachDeviceTilt();
    }

    _useIdleFallback() {
        if (!this.chamber || this.reduced || this.parallaxPointerId !== null) return;
        this.deviceTiltActive = false;
        this.chamber.classList.remove('is-device-tilt', 'is-touch-settling');
        this.chamber.classList.add('is-mobile-idle');
        this._renderParallaxOutput(this._createParallaxOutput(0, 0, 0, 0, 50, 42));
    }
}
