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
   Filename number is the authoritative chronology. Distinct ids ensure
   old dummy-card checkpoints restore as a fresh shuffled board.
   ------------------------------------------------------------ */
export const PHOTO_MEMORY_PUZZLE = [
    { id: 'game1-01', src: 'assets/images/game-1/game1-01.jpg', order: 1, objectPosition: '50% 50%' },
    { id: 'game1-02', src: 'assets/images/game-1/game1-02.jpg', order: 2, objectPosition: '50% 50%' },
    { id: 'game1-03', src: 'assets/images/game-1/game1-03.jpg', order: 3, objectPosition: '50% 50%' },
    { id: 'game1-04', src: 'assets/images/game-1/game1-04.jpg', order: 4, objectPosition: '50% 50%' },
    { id: 'game1-05', src: 'assets/images/game-1/game1-05.jpg', order: 5, objectPosition: '50% 50%' },
    { id: 'game1-06', src: 'assets/images/game-1/game1-06.jpg', order: 6, objectPosition: '50% 50%' },
    { id: 'game1-07', src: 'assets/images/game-1/game1-07.jpg', order: 7, objectPosition: '50% 50%' },
    { id: 'game1-08', src: 'assets/images/game-1/game1-08.jpg', order: 8, objectPosition: '50% 50%' },
    { id: 'game1-09', src: 'assets/images/game-1/game1-09.jpg', order: 9, objectPosition: '50% 50%' },
    { id: 'game1-10', src: 'assets/images/game-1/game1-10.jpg', order: 10, objectPosition: '50% 50%' },
    { id: 'game1-11', src: 'assets/images/game-1/game1-11.jpg', order: 11, objectPosition: '50% 50%' },
    { id: 'game1-12', src: 'assets/images/game-1/game1-12.jpg', order: 12, objectPosition: '50% 50%' },
    { id: 'game1-13', src: 'assets/images/game-1/game1-13.jpg', order: 13, objectPosition: '50% 50%' },
    { id: 'game1-14', src: 'assets/images/game-1/game1-14.jpg', order: 14, objectPosition: '50% 50%' },
    { id: 'game1-15', src: 'assets/images/game-1/game1-15.jpg', order: 15, objectPosition: '50% 50%' },
    { id: 'game1-16', src: 'assets/images/game-1/game1-16.jpg', order: 16, objectPosition: '50% 50%' },
    { id: 'game1-17', src: 'assets/images/game-1/game1-17.jpg', order: 17, objectPosition: '50% 50%' },
    { id: 'game1-18', src: 'assets/images/game-1/game1-18.jpg', order: 18, objectPosition: '50% 50%' },
    { id: 'game1-19', src: 'assets/images/game-1/game1-19.jpg', order: 19, objectPosition: '50% 50%' },
    { id: 'game1-20', src: 'assets/images/game-1/game1-20.jpg', order: 20, objectPosition: '50% 50%' },
];

/* Level 2: exactly three visible slots with a single recovery round each. */
export const GAME2_MEMORY_DATA = [
    {
        slot: 0,
        original: {
            id: 'g2-m1-original', slot: 0, stage: 'original', image: '/assets/images/game-2/enhanced/game2-memory1-main-enhanced.jpg', imageFit: 'contain',
            title: '15/07/2026', question: '15/07/2026 ko meri wife ko gussa kyun aaya tha?',
            options: ['Kyunki maine uski baat dhyaan se nahi suni thi', 'Kyunki main usse chhed raha tha', 'Kyunki maine late reply kiya tha', 'Kyunki main biwi ko zabardasti khila raha tha.', 'Kyunki main uska mood samajh nahi paaya tha'], correctIndex: 3,
            revealText: 'Bas thoda sa khila raha tha... aur biwi ka gussa bhi kitna pyaara lag raha tha. ❤',
        },
        recovery: {
            id: 'g2-m1-recovery', slot: 0, stage: 'recovery', image: '/assets/images/game-2/enhanced/game2-memory1-recovery-enhanced.png', imageFit: 'contain',
            title: 'Thoda Aur Socho...', question: '15/07/2026 ko mujhe maar kyun rahi thi?',
            options: ['Kyunki maine uska phone nahi uthaya tha', 'Kyunki main apni biwi ke paas baith nahi raha tha.', 'Kyunki main sirf hass raha tha', 'Kyunki maine usse ignore kiya tha', 'Kyunki main usko mana nahi raha tha'], correctIndex: 1,
            revealText: 'Bas paas baithna tha... aur biwi ne apna haq bilkul pyaar se jata diya. ❤',
        },
    },
    {
        slot: 1,
        original: {
            id: 'g2-m2-original', slot: 1, stage: 'original', image: '/assets/images/game-2/enhanced/game2-memory2-main-enhanced.png', imageFit: 'contain',
            title: '25/02/2025', question: '25/02/2025 ko tum kis mood mein thi aur aisa kyun kar rahi thi?',
            options: ['Kyunki tum sharma rahi thi', 'Kyunki tum mujhe tang kar rahi thi', 'Kyunki main kiss nahi kar raha tha.', 'Kyunki tum romantic mood mein thi', 'Kyunki tum bas mera reaction dekhna chahti thi'], correctIndex: 2,
            revealText: 'Bas ek kiss ki kami thi... aur phir mood ko reason mil gaya. ❤',
        },
        recovery: {
            id: 'g2-m2-recovery', slot: 1, stage: 'recovery', image: '/assets/images/game-2/enhanced/game2-memory2-recovery-preserved.webp', imageFit: 'contain',
            title: 'Ab Sach Sach Batao...', question: '25/02/2025 ko kiss ke baad kaisa lag raha tha?',
            options: ['Dil bahut shaant ho gaya tha', 'Aur bhi zyada sharam aa rahi thi', 'Bas smile ruk hi nahi rahi thi', 'Aisa lag raha tha waqt wahi ruk jaaye', 'Biwi ke mann mein laddu phoot rahe the.'], correctIndex: 4,
            revealText: 'Kiss ke baad biwi ke mann mein laddu phoot rahe the... aur meri smile bhi ruk nahi rahi thi. ❤',
        },
    },
    {
        slot: 2,
        original: {
            id: 'g2-m3-original', slot: 2, stage: 'original', image: '/assets/images/game-2/enhanced/game2-memory3-main-enhanced.png',
            title: '03/09/2026', question: '03/09/2026 ko meri biwi itne nakhre kyun kar rahi thi?',
            options: ['Kiss na dena pade isiliye.', 'Kyunki mood thoda shararti tha', 'Kyunki mujhe aur tadpana tha', 'Kyunki bas nakhre dikhane ka mann tha', 'Kyunki seedha maan jaana boring hota'], correctIndex: 0,
            revealText: 'Nakhre bhi pyaare... par kiss se bachne ki chaal pakdi gayi. 😏',
        },
        recovery: {
            id: 'g2-m3-recovery', slot: 2, stage: 'recovery', image: '/assets/images/game-2/enhanced/game2-memory3-recovery-enhanced.png',
            title: 'Last Chance 😏', question: '03/09/2026 ko meri biwi photo kyun nahi khinchwa rahi thi?',
            options: ['Kyunki pehle aur ready hona tha', 'Kyunki mood pose dene ka nahi tha', 'Kyunki bas mujhe pareshan karna tha', 'Us din zyada khubsurat dikh rahi thi isiliye.', 'Kyunki natural rehna zyada pasand tha'], correctIndex: 3,
            revealText: 'Photo se bachne ka reason bhi kitna pyaara tha... biwi waise hi bahut khubsurat lag rahi thi. ❤',
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
        question: 'Jab mera mood kharab hota hai, mujhe sabse zyada kya chahiye hota hai?',
        options: [
            'Thoda akela time',
            'Tumhara pyar aur saath',
            'Sirf silence',
            'Bas mood apne aap theek hone dena',
            'Tumhari ek pyari si smile',
        ],
        correctIndex: 1,
    },
    {
        question: 'Main tumhari kaunsi cheez ko sabse zyada protect karna chahta hoon?',
        options: [
            'Tumhari smile ko',
            'Tumhare dreams ko',
            'Tumhari peace ko',
            'Tumhare gusse ko',
            'Tumhari masoomiyat ko',
        ],
        correctIndex: 3,
    },
    {
        question: 'Tumhari kaunsi ek cheez mujhe har baar automatically smile kara deti hai?',
        options: [
            'Tumhari awaaz',
            'Tumhara gussa',
            'Tumhare face ke unique expressions',
            'Tumhari hasi',
            'Tumhare nakhre',
        ],
        correctIndex: 2,
    },
    {
        question: 'Mujhe tumhare saath sabse zyada sukoon kab milta hai?',
        options: [
            'Jab tum mere kareeb rehti ho',
            'Jab hum bahar ghoom rahe hote hain',
            'Jab hum phone par baat karte hain',
            'Jab hum dono chup-chaap baithe hote hain',
            'Jab tum mera haath pakad kar baithi hoti ho',
        ],
        correctIndex: 0,
    },
    {
        question: 'Mere liye tum sirf meri wife nahi ho… sabse zyada kya ho?',
        options: [
            'Meri life',
            'Mera trust',
            'Sab kuch',
            'Meri power',
            'Mera confidence',
        ],
        correctIndex: 2,
    },
];

export const WHO_WOULD_DATA = [
    { question: 'Chhoti baat par drama aur nakhre kaun karta hai?', correctChoice: 'me' },
    { question: 'Photos - videos bhejne ya khinchwane ke time nakhre kaun karta hai?', correctChoice: 'me' },
    { question: 'Hum dono mein kisi bhi baat ko lekar sabse zyada taane kaun maarta hai?', correctChoice: 'me' },
    { question: 'Romantic baatein kaun karta hai?', correctChoice: 'you' },
    { question: 'Hamare beech ladai ya bahas ho jaaye to situation samajh kar jhukta kaun hai?', correctChoice: 'both' },
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
        question: 'Tumhare according hamari chemistry ki sabse special baat kya hai?',
        choices: [
            { label: 'Ladai ke baad bhi ek dusre ke paas aa jaana', reveal: 'Chahe kitni bhi bahas ho... end mein dil fir ek dusre ke paas hi aa jaata hai. ❤️' },
            { label: 'Ek dusre ke nakhre handle kar lena', reveal: 'Tumhare nakhre aur mera patience... shayad isi ka naam hamari chemistry hai. 😌❤️' },
            { label: 'Har situation mein ek dusre ka saath dena', reveal: 'Situation koi bhi ho, hum dono ek team hain... aur wahi meri favourite baat hai. ❤️' },
        ],
        finalLine: 'Shayad hamari chemistry special isliye nahi kyunki hum same hain... balki isliye kyunki hum har baar ek dusre ko choose karte hain. ❤️',
    },
    {
        question: 'Agar hum dono ka mood thoda off ho, tumhe mere saath kya sabse zyada accha lagega?',
        choices: [
            { label: 'Bas ek long hug aur chup-chaap paas rehna', reveal: 'Kabhi kabhi solution words nahi hote... bas tumhara mere paas hona hi kaafi hota hai. ❤️' },
            { label: 'Dil khol kar sab baatein karna', reveal: 'Tumse dil ki baat ho jaaye to aadha mood waise hi theek ho jaata hai. ✨' },
            { label: 'Kahin bahar nikal kar mood change karna', reveal: 'Kabhi kabhi bas jagah badalni hoti hai... saath tum ho to mood khud badal jaata hai. ❤️' },
        ],
        finalLine: 'Mood off ho sakta hai... par tumhare saath hona kabhi off nahi lagta. ❤️',
    },
    {
        question: 'Hamari perfect romantic night mein sabse important kya hona chahiye?',
        choices: [
            { label: 'Bas hum dono, bina phone ke', reveal: 'Duniya thodi der wait kar sakti hai... tumhare saath ka waqt nahi. ❤️' },
            { label: 'Late-night baatein aur thoda romance', reveal: 'Raat, tumhari baatein aur thoda sa romance... mere liye perfect combination. ❤️' },
            { label: 'Masti, teasing aur bohot saari hasi', reveal: 'Humara romance bina thodi masti aur hasi ke complete hi kahan hota hai. 😌❤️' },
        ],
        finalLine: 'Perfect night jagah ya plan se nahi banti... mere liye tumhare saath se banti hai. ❤️',
    },
];

export const JACKPOT_CATEGORIES = [
    { key: 'date', label: 'HAMARI MEMORY', options: ['Pahli bike ride', 'Hamari pahli mulakat', 'Pahli mulakat, pahla touch', 'Pahli ice cream saath me', 'Pahli photos saath me', 'Hamari pahli bahas'] },
    { key: 'food', label: 'MERA REACTION', options: ['Tumhe pyar se manana', 'Ek tight hug dena', 'Kiss karke gussa thanda karna', 'Tumhari baat chup-chaap sunna', 'Tumhe lekar bahar nikal jaana', 'Tumhare nakhre dekh kar bas smile karna'] },
    { key: 'mood', label: 'BIWI KA MOOD', options: ['Hamesha gusse me rehna', 'Romantic baaton par gussa hona', 'Khana khane ko bolo to gussa ho jaana', 'Mujhse sab kuch na batana', 'Mujhse pyar se baat na karna', 'Mujhse ladai karna'] },
    { key: 'activity', label: 'BIWI KI AADAT', options: ['Hamesha sote rehna', 'Hamesha bahar ka khana', 'Naye kapde pehenna aur makeup karna', 'Main jo bolun hamesha uska ulta karna', 'Baat-baat par gussa hona', 'Mere saath photo na khinchwana'] },
];

/* ------------------------------------------------------------
   REWARD - The secret gift.
   Edit freely. Shown as a mysterious locked envelope/card
   first, then opens to this content. The handoff button
   afterwards leads to Special Message / Final Birthday etc.
   ------------------------------------------------------------ */
export const SECRET_REWARD = {
    eyebrow: 'TUMHARE LIYE — SIRF TUMHARE LIYE',
    title: 'Meri Pyari Biwi 💙',
    // Paragraphs are rendered as separate <p> - keep them short.
    paragraphs: [
        'Tumne yeh saare secrets dhoondh liye…',
        'har yaad, har sawaal, har chhoti si baat.',
        'Lekin ek secret aisa hai jo shayad kabhi secret tha hi nahi…',
        'Mera dil bahut pehle hi tumhara ho chuka tha. ❤️',
        'Iss game se bhi pehle, in yaadon se bhi pehle.',
        'Pata nahi kab tum meri aadat se badhkar meri zarurat ban gayi…',
        'kab tumhari khushi meri khushi ban gayi,',
        'aur tumhari udaasi dekh kar mera dil bhi chup sa ho jaata hai.',
        'Har level par tumne jo pyaar, patience aur apnapan dikhaya,',
        'usne mujhe bas ek hi cheez aur strongly feel karayi—',
        'main kitna lucky hoon ki meri zindagi mein tum ho.',
        'Tum meri sirf ek beautiful memory nahi ho…',
        'tum woh insaan ho jiske saath main aur bhi hazaar memories banana chahta hoon.',
        'Aur chahe kitna bhi time beet jaaye,',
        'chahe zindagi kitni bhi badal jaaye…',
        'meri ek choice kabhi nahi badlegi — tum.',
        'Aaj bhi.',
        'Kal bhi.',
        'Aur har aane wale kal mein bhi. 💙',
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
        { id: '05', name: 'UNLOCK MY HEART', subtitle: 'Bas ek last secret baaki hai...' },
    ],
    successMessages: {
        level1: 'Tumhe hamari kahani yaad hai... ❤️',
        level2: 'You found every little piece of us.',
        level3: 'Tum mujhe kitna jaanti ho...',
        level4a: 'Har moment alag tha...',
        level4b: '...par sab milkar hum bane.',
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
