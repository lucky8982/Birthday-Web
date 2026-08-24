/* ============================================================
   Happy Birthday My Love 💙 - THE SECRET OF US - Game Data
   ------------------------------------------------------------
   File:    js/secret-game-data.js
   Purpose: Single source of truth for the cinematic game's content.
            Edit ONLY this file to change dates, questions, objects,
            constellation points and the final reward. Nothing is
            scattered across multiple files.

   Rewards: SECRET_REWARD is a separate config object - change its
            title / message / CTA text freely without touching logic.
   ============================================================ */

/* ------------------------------------------------------------
   OUR TIMELINE - chronological moments reused from the project's
   story. Level 1 reads this directly instead of duplicating data.
   Keep the `order` strictly 1..N chronological.
   ------------------------------------------------------------ */
export const TIMELINE_MOMENTS = [
    {
        id: 'tm-1',
        order: 1,
        title: 'Pehli Mulakat',
        subtitle: '01 • 12 • 2023',
        hint: 'Raat 8:20 — mazak mazak mein kuch likhne ko diya tha...',
        detail: 'Jahan sab kuch shuru hua — ek chhota sa mazak, jo kahani ban gaya.',
    },
    {
        id: 'tm-2',
        order: 2,
        title: 'Pehli Call',
        subtitle: '04 • 12 • 2023',
        hint: 'Awaaz pehli baar suni, aur dil ne pehchaan liya.',
        detail: 'Tumhari awaaz — ab bhi utni hi pyari lagti hai.',
    },
    {
        id: 'tm-3',
        order: 3,
        title: 'Pehli Lambi Baat',
        subtitle: '10 • 12 • 2023',
        hint: 'Raat bhar baatein, subah tak khatam nahi hui.',
        detail: 'Hum raat se subah tak baatein karte rahe.',
    },
    {
        id: 'tm-4',
        order: 4,
        title: 'Pehla Vaada',
        subtitle: '28 • 12 • 2023',
        hint: 'Ek chhota sa vaada, jo ab tak nibha rahe hain.',
        detail: 'Maine kaha tha — hamesha saath rahunga.',
    },
    {
        id: 'tm-5',
        order: 5,
        title: 'Hum — Aaj Tak',
        subtitle: 'Ab Tak • Har Pal',
        hint: 'Aur dekho, aaj hum yahan hain — ek saath.',
        detail: 'Har museebat ke baad bhi, humne haath nahi chhoda.',
    },
];

/* ------------------------------------------------------------
   LEVEL 2 - FIND
   Hidden romantic objects. `required: true` means it must be
   found. Decoy objects (required: false) exist only for charm
   and do NOT block progression.
   Each found required object reveals `revealText`.
   ------------------------------------------------------------ */
export const FIND_OBJECTS = [
    { id: 'find-photo',     label: 'Photograph',  icon: 'photo',  required: true,  revealText: 'Ek tasveer — jaise waqt tham gaya ho.' },
    { id: 'find-letter',    label: 'Letter',      icon: 'letter', required: true,  revealText: 'Ek khat — jo kabhi likha nahi, par mehsoos hua.' },
    { id: 'find-star',      label: 'Star',        icon: 'star',   required: true,  revealText: 'Ek sitara — jo hamare naam hai.' },
    { id: 'find-clock',     label: 'Clock',       icon: 'clock',  required: true,  revealText: 'Ek ghadi — jo hamare pal gin rahi hai.' },
    { id: 'find-flower',    label: 'Flower',      icon: 'flower', required: true,  revealText: 'Ek phool — jo tumhari muskan jaisa hai.' },
    // decoys - pleasant but not required
    { id: 'find-heart',     label: 'Small Heart', icon: 'heart',  required: false, revealText: 'Ek chhota dil — bas pyara sa decoy.' },
    { id: 'find-shell',     label: 'Shell',       icon: 'shell',  required: false, revealText: 'Ek seepi — samundar ki yaad.' },
    { id: 'find-feather',   label: 'Feather',     icon: 'feather',required: false, revealText: 'Ek pankh — hawa mein udta hua.' },
];

/* ------------------------------------------------------------
   LEVEL 3 - FEEL
   Emotional choices. No harsh wrong answer - each choice gives
   a warm response. `correctIndex` is the most personal answer
   (highlighted softly as the favourite, not as a pass/fail).
   `feedback` is shown regardless; `isFavourite` only tints it.
   ------------------------------------------------------------ */
export const FEEL_QUESTIONS = [
    {
        id: 'feel-1',
        question: 'Jab tum thak jaati ho, tumhe sabse zyada kya chahiye hota hai?',
        choices: [
            { text: 'Bas chup-chap paas baithna, kuch bole bina.', feedback: 'Haan — kabhi kabhi bas saath hona hi kaafi hota hai.' },
            { text: 'Thoda sa hasa do, thoda sa distract kardo.', feedback: 'Samajh gaya — dard ko pyaar se halka karna.' },
            { text: 'Haath pakad kar kaho — main yahin hoon.', feedback: 'Yahi toh main hamesha karta hoon — main yahin hoon. 💙' },
        ],
        correctIndex: 2,
    },
    {
        id: 'feel-2',
        question: 'Hamari sabse khoobsurat aadat kya hai?',
        choices: [
            { text: 'Bina kahe samajh jana.', feedback: 'Woh hi toh hamara magic hai — bina lafzon ke.' },
            { text: 'Har museebat mein haath na chhodna.', feedback: 'Yahi hamari kahani ka sabse khoobsurat hissa hai. 💙' },
            { text: 'Chhoti chhoti baaton mein khush ho jana.', feedback: 'Tumhari muskan hi meri duniya hai.' },
        ],
        correctIndex: 1,
    },
    {
        id: 'feel-3',
        question: 'Agar ek din hum bohot buddhe ho gaye, tum kya dekhna chahogi?',
        choices: [
            { text: 'Wahi purani tasveerein, chai ke saath.', feedback: 'Wahi shaam, wahi hum — bas thode aur jhurriyon ke saath.' },
            { text: 'Ek hi kambal mein, hamari kahani sunte hue.', feedback: 'Ye sapna toh mera bhi hai — hamesha se. 💙' },
            { text: 'Bas tumhara haath, mere haath mein.', feedback: 'Aur kuch chahiye bhi nahi — bas tum.' },
        ],
        correctIndex: 1,
    },
];

/* ------------------------------------------------------------
   LEVEL 4 - CONNECT
   Stars / constellation. Points are in normalized 0..100 space
   (x,y) inside the sky box. `order` is the intended tap order
   to draw the heart shape. Dust points are decoys.
   The heart shape emerges from connecting correct stars.
   ------------------------------------------------------------ */
export const CONNECT_STARS = [
    // 7-point heart constellation (correct order)
    { id: 'star-1', x: 50, y: 18, order: 1, isCorrect: true },
    { id: 'star-2', x: 28, y: 30, order: 2, isCorrect: true },
    { id: 'star-3', x: 18, y: 52, order: 3, isCorrect: true },
    { id: 'star-4', x: 50, y: 78, order: 4, isCorrect: true },
    { id: 'star-5', x: 82, y: 52, order: 5, isCorrect: true },
    { id: 'star-6', x: 72, y: 30, order: 6, isCorrect: true },
    { id: 'star-7', x: 50, y: 18, order: 7, isCorrect: true }, // closes the heart
    // dust / decoy stars (tap does not break, but not needed)
    { id: 'dust-1', x: 12, y: 18, order: 0, isCorrect: false },
    { id: 'dust-2', x: 88, y: 22, order: 0, isCorrect: false },
    { id: 'dust-3', x: 20, y: 75, order: 0, isCorrect: false },
    { id: 'dust-4', x: 85, y: 78, order: 0, isCorrect: false },
    { id: 'dust-5', x: 50, y: 48, order: 0, isCorrect: false },
];

/* ------------------------------------------------------------
   LEVEL 5 - MY HEART
   Pulse timing game configuration.
   `requiredHits` is forgiving (small number).
   `hitWindow` is the success zone as fraction of the pulse
   cycle (0..1). 0.75 means last 25% of the ring is the sweet spot.
   ------------------------------------------------------------ */
export const HEART_CONFIG = {
    requiredHits: 5,
    maxMisses: 12,            // very forgiving - no hard fail
    hitWindow: 0.78,          // sweet spot starts at 78% scale
    pulseDurationMs: 1400,    // one heartbeat
};

/* ------------------------------------------------------------
   REWARD - The secret gift.
   Edit freely. Shown as a mysterious locked envelope/card
   first, then opens to this content. The handoff button
   afterwards leads to Special Message / Final Birthday etc.
   ------------------------------------------------------------ */
export const SECRET_REWARD = {
    eyebrow: 'Tumhare Liye — Sirf Tumhare Liye',
    title: 'My Dear Wife 💙',
    // Paragraphs are rendered as separate <p> - keep them short.
    paragraphs: [
        'Tumne yeh saare secrets dhoondh liye — har yaad, har sitara, har dhadkan.',
        'Par sabse bada secret toh yeh hai...',
        'Mera dil kab ka tumhara ho chuka hai. Is game se bohot pehle se. ❤️',
        'Har level par tumne jo pyaar dikhaya, woh is baat ka saboot hai ki hum hamesha ek hi team the — aur hamesha rahenge.',
    ],
    signFrom: 'Hamesha tumhara,',
    signName: 'Tumhara Pati 💙',
    // The button that appears AFTER the reward is opened.
    // Its label can be edited without touching logic.
    continueLabel: 'Aage Badho — Special Message →',
};

/* ------------------------------------------------------------
   GAME META
   ------------------------------------------------------------ */
export const GAME_META = {
    title: 'THE SECRET OF US',
    subtitle: 'A little secret hidden inside our story...',
    introLines: [
        'Tamne hamari kahani dekhi...',
        'Ab ek chhota sa secret hai...',
    ],
    levelLabels: [
        { id: '01', name: 'REMEMBER', subtitle: 'Yaadon ko sahi jagah lagao' },
        { id: '02', name: 'FIND', subtitle: 'Chhupi hui yaadein dhoondho' },
        { id: '03', name: 'FEEL', subtitle: 'Dil se jawab do' },
        { id: '04', name: 'CONNECT', subtitle: 'Sitaron ko jodo' },
        { id: '05', name: 'MY HEART', subtitle: 'Meri dhadkan pakdo' },
    ],
    successMessages: {
        level1: 'Tumhe hamari kahani yaad hai... ❤️',
        level2: 'You found every little piece of us.',
        level3: 'Tum mujhe kitna jaanti ho...',
        level4a: 'Har moment alag tha...',
        level4b: '...par sab milkar hum bane.',
        level5a: 'YOU FOUND MY HEART',
        level5b: 'Actually...',
        level5c: 'tumne toh ise pehle hi jeet liya tha. ❤️',
    },
    retryMessages: {
        level1: 'Thoda sa aur yaad karo...',
    },
    complete: {
        title: 'THE SECRET OF US',
        subtitle: 'COMPLETE',
        line1: 'Game jeet liya...',
        line2: 'ab tumhara reward hai.',
        unlockLabel: 'UNLOCK REWARD',
    },
};
