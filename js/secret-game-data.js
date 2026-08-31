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
/* ------------------------------------------------------------
   LEVEL 1 - PHOTO MEMORY ORDER PUZZLE
   Temporary placeholder photos. Replace this single array when
   the real images and chronology are ready; `order` is the one
   authoritative correct sequence.
   ------------------------------------------------------------ */
export const PHOTO_MEMORY_PUZZLE = [
    { id: 'memory-01', src: 'assets/game1-dummy/dummy-01.svg', order: 1 },
    { id: 'memory-02', src: 'assets/game1-dummy/dummy-02.svg', order: 2 },
    { id: 'memory-03', src: 'assets/game1-dummy/dummy-03.svg', order: 3 },
    { id: 'memory-04', src: 'assets/game1-dummy/dummy-04.svg', order: 4 },
    { id: 'memory-05', src: 'assets/game1-dummy/dummy-05.svg', order: 5 },
    { id: 'memory-06', src: 'assets/game1-dummy/dummy-06.svg', order: 6 },
    { id: 'memory-07', src: 'assets/game1-dummy/dummy-07.svg', order: 7 },
    { id: 'memory-08', src: 'assets/game1-dummy/dummy-08.svg', order: 8 },
    { id: 'memory-09', src: 'assets/game1-dummy/dummy-09.svg', order: 9 },
    { id: 'memory-10', src: 'assets/game1-dummy/dummy-10.svg', order: 10 },
    { id: 'memory-11', src: 'assets/game1-dummy/dummy-11.svg', order: 11 },
    { id: 'memory-12', src: 'assets/game1-dummy/dummy-12.svg', order: 12 },
    { id: 'memory-13', src: 'assets/game1-dummy/dummy-13.svg', order: 13 },
    { id: 'memory-14', src: 'assets/game1-dummy/dummy-14.svg', order: 14 },
    { id: 'memory-15', src: 'assets/game1-dummy/dummy-15.svg', order: 15 },
    { id: 'memory-16', src: 'assets/game1-dummy/dummy-16.svg', order: 16 },
    { id: 'memory-17', src: 'assets/game1-dummy/dummy-17.svg', order: 17 },
    { id: 'memory-18', src: 'assets/game1-dummy/dummy-18.svg', order: 18 },
    { id: 'memory-19', src: 'assets/game1-dummy/dummy-19.svg', order: 19 },
    { id: 'memory-20', src: 'assets/game1-dummy/dummy-20.svg', order: 20 },
];

/* Level 2: exactly three visible slots with a single recovery round each. */
export const GAME2_MEMORY_DATA = [
    {
        slot: 0,
        original: {
            id: 'g2-m1-original', slot: 0, stage: 'original', image: 'assets/images/memories/dummy-photo-01.jpg',
            title: 'Where it all began', question: 'Hamari pehli mulakat kis chhote se mazak se shuru hui thi?',
            options: ['Ek random message se', 'Ek photo challenge se', 'Ek song recommendation se', 'Ek coffee plan se', 'Ek birthday wish se'], correctIndex: 0,
            revealText: 'Wahi ek random sa message... aur phir tum meri favourite story ban gayi. ❤',
        },
        recovery: {
            id: 'g2-m1-recovery', slot: 0, stage: 'recovery', image: 'assets/images/memories/dummy-photo-02.jpg',
            title: 'The first hello', question: 'Pehli baar baat karke tumhari kaunsi baat dil ko sabse pehle achhi lagi thi?',
            options: ['Tumhari honesty', 'Tumhari hasi', 'Tumhara patience', 'Tumhari sharmili si baat', 'Tumhara confidence'], correctIndex: 1,
            revealText: 'Tumhari hasi mein hi toh pehle din se mera ghar sa lagta hai. ❤',
        },
    },
    {
        slot: 1,
        original: {
            id: 'g2-m2-original', slot: 1, stage: 'original', image: 'assets/images/memories/dummy-photo-05.JPG',
            title: 'Our long conversations', question: 'Hamari woh pehli lambi baat kis waqt tak chalti rahi thi?',
            options: ['Bas dinner tak', 'Raat se subah tak', 'Lunch break tak', 'Ek movie ke baad', 'Sirf aadha ghanta'], correctIndex: 1,
            revealText: 'Raat kab subah ban gayi, pata hi nahi chala — tumse baat jo ho rahi thi. ✨',
        },
        recovery: {
            id: 'g2-m2-recovery', slot: 1, stage: 'recovery', image: 'assets/images/memories/dummy-photo-06.JPG',
            title: 'The comfort of us', question: 'Jab baatein khatam hone ka naam nahi leti, hum usually kis baat par muskura dete hain?',
            options: ['Purane jokes par', 'Future ke sapnon par', 'Random silly baaton par', 'Food plans par', 'Ek doosre ki awaaz par'], correctIndex: 4,
            revealText: 'Tumhari awaaz... mere har lambe din ka sabse soft ending note hai. ❤',
        },
    },
    {
        slot: 2,
        original: {
            id: 'g2-m3-original', slot: 2, stage: 'original', image: 'assets/images/memories/dummy-photo-09.JPG',
            title: 'The promise we keep', question: 'Hamare beech ka sabse khoobsurat vaada kya raha hai?',
            options: ['Har baat par agree karna', 'Har din surprise dena', 'Mushkil mein haath na chhodna', 'Har call lambi karna', 'Har photo save karna'], correctIndex: 2,
            revealText: 'Har museebat ke baad bhi, humne haath nahi chhoda. Bas yahi toh hum hain. ❤',
        },
        recovery: {
            id: 'g2-m3-recovery', slot: 2, stage: 'recovery', image: 'assets/images/memories/dummy-photo-10.JPG',
            title: 'Still choosing us', question: 'Aaj bhi, sab kuch ke beech, hum ek doosre ko kya choose karte hain?',
            options: ['Perfect answers', 'Easy days', 'Ek doosre ka saath', 'Badi celebrations', 'Silent goodbyes'], correctIndex: 2,
            revealText: 'Har baar, har din — tum aur main. Ek doosre ka saath. ✨',
        },
    },
];

/* ------------------------------------------------------------
   GAME 3 - READ MY MIND / WHO WOULD DO IT?
   The two parts deliberately live together so Game 3 stays a
   self-contained cinematic compatibility experience.
   ------------------------------------------------------------ */
export const MIND_READING_DATA = [
    {
        question: 'Agar achanak hume ek poori free night mil jaaye, to tumhe kya lagta hai main secretly kya choose karunga?',
        options: [
            'Bas hum dono, soft music aur ek peaceful si raat',
            'Bina destination ke ek random long drive',
            'City lights ke beech ek fancy dinner',
            'Bas paas baithkar der raat tak baatein karna',
        ],
        correctIndex: 0,
    },
    {
        question: 'Agar hum ek din ke liye sabse door gayab ho sakein, to tumhe kya lagta hai mera dil tumhe kahan le jaana chahega?',
        options: [
            'Ek shaant beach — bas waves, hawa aur tum',
            'Mountains me ek peaceful si jagah, duniya se door',
            'Kisi purani city ki galiyon me bina kisi plan ke ghoomna',
            'Ek cozy sa room, bahar baarish aur andar bas hum',
        ],
        correctIndex: 3,
    },
    {
        question: 'Abhi iss waqt kaunsi choti si cheez mujhe sabse zyada khush kar degi?',
        options: [
            'Bina kuch kahe tumhara haath mere haath me aa jaana',
            'Bina kisi reason ke ek lamba sa hug',
            'Mere kisi stupid joke par tumhara fir se hasna',
            'Jab mujhe bilkul expect na ho tab tumhara quietly “I love you” kehna',
        ],
        correctIndex: 1,
    },
];

export const WHO_WOULD_DATA = [
    { question: 'Hum dono me se kaun sirf miss karne ki wajah se achanak midnight date plan kar sakta hai?', correctChoice: 'you' },
    { question: 'Kaun secretly surprise plan karega aur fir aise act karega jaise use kuch yaad hi nahi?', correctChoice: 'me' },
    { question: 'Sirf ek hug lene ke liye faltu si argument start kaun karega? 😌', correctChoice: 'both' },
];

export const WHO_CHOICE_META = [
    { id: 'me', label: 'MAIN', note: 'Probably main…' },
    { id: 'you', label: 'TUM', note: 'Definitely tum…' },
    { id: 'both', label: 'HUM DONO ❤️', note: 'Obviously hum dono ❤️' },
];

/* ------------------------------------------------------------
   LEVEL 4 - OUR CHEMISTRY × DATE NIGHT JACKPOT
   This data is kept separate from the interaction state so the
   romantic choices and the generated date night stay maintainable.
   ------------------------------------------------------------ */
export const CHEMISTRY_QUESTIONS = [
    {
        question: 'Our perfect night together would be…',
        choices: [
            { label: 'Late night drive — just us and the city lights 🌙', reveal: 'You chose the quiet road — where every light feels like us.' },
            { label: 'Cozy dinner — soft light, long talks 🕯️', reveal: 'You chose the warm glow — where time slows just for us.' },
            { label: 'A little bit of both — surprise me ✨', reveal: 'You chose a little mystery — that’s our favorite chemistry.' },
        ],
        finalLine: 'Somehow… you always know what feels like us. ❤️',
    },
    {
        question: 'If we had a free evening with no plans…',
        choices: [
            { label: 'Stay in — blankets, whispers, no rush', reveal: 'Staying in — where the world can wait.' },
            { label: 'Go somewhere beautiful we’ve never been', reveal: 'Going somewhere new — because anywhere is home with you.' },
            { label: 'Do something completely spontaneous', reveal: 'Spontaneous — because our best moments were never planned.' },
        ],
        finalLine: 'That’s our chemistry — calm and spontaneous at once. 🌙',
    },
    {
        question: 'When I need you most, what would I want?',
        choices: [
            { label: 'A hug that says everything 🤍', reveal: 'A hug — soft, long, without words.' },
            { label: 'Your words — calm and close', reveal: 'Your words — the ones only you know how to say.' },
            { label: 'Just being beside me — quietly', reveal: 'Just beside me — present, warm, enough.' },
        ],
        finalLine: 'You knew. That’s why it’s us. 💙',
    },
];

export const JACKPOT_CATEGORIES = [
    { key: 'date', label: 'DATE', options: ['Midnight Drive 🌙', 'Rooftop Evening ✨', 'Beach Walk at Dusk 🌊', 'Cozy Night In 🕯️', 'Old-City Wander 🏙️', 'Rain-Day Hideaway ☔'] },
    { key: 'food', label: 'FOOD', options: ['Dessert Together 🍓', 'Pizza & Conversations 🍕', 'Favorite Dinner 🍝', 'Late Night Coffee ☕', 'Street-Food Adventure 🥟', 'Homemade Treats 🍰'] },
    { key: 'mood', label: 'MOOD', options: ['Just Us Tonight 🤍', 'No Phones, Just Love 📵', 'Laugh Until Midnight 😂', 'Slow & Quiet 🌙', 'Soft Music Only 🎶', 'A Little Mischief 😏'] },
    { key: 'activity', label: 'ACTIVITY', options: ['Watch Our Favorite Movie 🎬', 'Stargaze Together ⭐', 'Take Random Photos 📸', 'Dance in the Living Room 💃', 'Talk Until 2 AM 🌙', 'Plan a Tiny Surprise 🎁'] },
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
        { id: '03', name: 'MERE DIL KI BAAT', subtitle: 'Dekhte hain tum mujhe kitna achhe se samajhti ho...' },
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
