import { prefersReducedMotion } from './utils.js';

export const RELATIONSHIP_GAP_STORAGE_KEY = 'hbm.relationshipGapAnswers.v1';

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
        this.questionIndex = 0;
        this.locking = false;
        this.transitioning = false;
        this.timers = new Set();
        this.bound = [];
        this.questionBound = [];
        this.parallax = null;
        this.sceneToken = 0;
        this.visualValue = '';
        this.visualEntries = [];
        this.entrySequence = 0;
        this.isBackBlasting = false;
        this.mode = 'intro'; // intro | question | final | review
    }

    mount() {
        if (!this.root) return;
        this.questionIndex = this._firstOpenQuestion();
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
        this.intro = this.root.querySelector('.gap-intro');
        this.scene = this.root.querySelector('.gap-question');
        this.final = this.root.querySelector('.gap-final');
        this._updateBridge();
        this._on(this.root.querySelector('.gap-start'), 'click', () => this._start());
        this._on(this.root.querySelector('.gap-continue'), 'click', () => this._complete());
        this._on(this.root.querySelector('.gap-review'), 'click', () => this._reviewAnswers());
        this._on(this.root.querySelector('.gap-bridge-segments'), 'click', event => this._reviewFromBridge(event));
        this._on(this.root.querySelector('.gap-chamber'), 'pointermove', event => this._parallax(event));
        if (this.questionIndex >= QUESTIONS.length) this._showFinal();
    }

    destroy() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.bound.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
        this.bound = [];
        this.questionBound.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
        this.questionBound = [];
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

    _start() {
        if (this.transitioning) return;
        this.mode = 'question';
        this.intro.hidden = true;
        this.scene.hidden = false;
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
            <button type="button" class="sg-btn gap-lock"><span>LOCK MY ANSWER</span></button>
            <div class="gap-confirm" hidden><p>Ek baar lock karne ke baad ye answer change nahi hoga.</p><strong>Pakka?</strong><div><button type="button" class="gap-edit">ABHI EDIT KARNA HAI</button><button type="button" class="gap-confirm-lock">HAAN, LOCK KARO</button></div></div>`;
        this.stage = this.scene.querySelector('.gap-word-stage');
        this.textLayer = this.scene.querySelector('.gap-cinematic-text');
        this.caret = this.scene.querySelector('.gap-cinematic-caret');
        this.answerShell = this.scene.querySelector('.gap-answer-shell');
        this.visualPlaceholder = this.scene.querySelector('.gap-visual-placeholder');
        this.textarea = this.scene.querySelector('textarea');
        this.validation = this.scene.querySelector('.gap-validation');
        this.confirm = this.scene.querySelector('.gap-confirm');
        this.visualValue = '';
        this.visualEntries = [];
        this.entrySequence = 0;
        this.activeArrivals = 0;
        this.isBackBlasting = false;
        this._onQuestion(this.textarea, 'input', event => this._syncGraphemes(event));
        this._onQuestion(this.textarea, 'scroll', () => { this.stage.scrollTop = this.textarea.scrollTop; });
        this._onQuestion(this.scene.querySelector('.gap-lock'), 'click', () => this._askLock());
        this._onQuestion(this.scene.querySelector('.gap-edit'), 'click', () => { this.confirm.hidden = true; this.scene.classList.remove('is-confirming'); this.textarea.focus({ preventScroll: true }); });
        this._onQuestion(this.scene.querySelector('.gap-confirm-lock'), 'click', () => this._lock());
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
        this.confirm.hidden = false;
        this.scene.classList.add('is-confirming');
        this.confirm.querySelector('.gap-confirm-lock').focus({ preventScroll: true });
    }

    _lock() {
        if (this.locking || !this.textarea.value.trim()) return;
        this.locking = true;
        const entry = { questionId: this.questionIndex, answer: this.textarea.value.trim(), locked: true, submittedAt: new Date().toISOString() };
        this.answers = saveAnswer(entry);
        this._renderLockedQuestion(this.answers[this.questionIndex], this.questionIndex + 1, ++this.sceneToken, true);
        this._updateBridge();
        const count = this._lockedCount();
        const message = MILESTONES[count];
        if (message) this._showMilestone(message);
        this._later(this.reduced ? 80 : 860, () => {
            this.questionIndex = this._firstOpenQuestion();
            this.locking = false;
            if (this.questionIndex >= QUESTIONS.length) this._showFinal();
            else this._renderQuestion();
        });
    }

    _renderLockedQuestion(entry, number, token, justLocked = false) {
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
        this._renderQuestion();
    }

    _reviewAnswers() {
        this.mode = 'review';
        this.questionIndex = Object.keys(this.answers).map(Number).sort((a, b) => a - b)[0] ?? 0;
        this.final.hidden = true; this.scene.hidden = false;
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
        this._onQuestion(previous, 'click', () => { this.questionIndex = locked[position - 1]; this._renderQuestion(); });
        this._onQuestion(next, 'click', () => { this.questionIndex = locked[position + 1]; this._renderQuestion(); });
        this._onQuestion(nav.querySelector('.gap-review-summary'), 'click', () => this.returnToSummary());
    }

    returnToSummary() {
        if (this.mode !== 'review') return;
        this.mode = 'final';
        this.scene.hidden = true;
        this.final.hidden = false;
        this.final.classList.add('is-visible');
        this._updateBridge();
    }

    _showMilestone(message) {
        const note = document.createElement('p'); note.className = 'gap-milestone'; note.textContent = message; this.scene.appendChild(note);
        this._later(this.reduced ? 10 : 1250, () => note.remove());
    }

    _showFinal() {
        this.mode = 'final';
        this.intro.hidden = true; this.scene.hidden = true; this.final.hidden = false; this.final.classList.add('is-visible'); this._updateBridge();
    }

    _complete() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.root.querySelector('.gap-continue').disabled = true;
        this.onComplete?.();
    }

    _parallax(event) {
        if (this.reduced || !window.matchMedia('(pointer:fine)').matches) return;
        const chamber = event.currentTarget, rect = chamber.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - .5) * 4;
        const y = ((event.clientY - rect.top) / rect.height - .5) * -3;
        chamber.style.setProperty('--gap-rx', `${y}deg`); chamber.style.setProperty('--gap-ry', `${x}deg`);
    }
}
