(() => {
  const MAX_TURNS = 25;
  const SHOP_INTERVAL = 5;
  const GOAL_MONEY = 1000;
  const MIN_PROB = 0.05;
  const MAX_PROB = 0.95;
  const STORAGE_KEY = 'entropyDealerBestScore';

  const STARTING_STATE = {
    money: 100,
    baseProbability: 0.5,
    edge: 0,
    focus: 0,
    turn: 0,
    betOptions: [5, 10, 20, 40],
    selectedBet: 10,
  };

  const CARD_LIBRARY = {
    lightTilt: {
      id: 'lightTilt',
      name: 'Lichtneigung',
      description: '🌠 +6% Erfolg (1 Runde)',
      type: 'temp',
      rarityTier: 'U',
      icon: '🌠',
      palette: 'aurora',
      apply(state) {
        state.tempModifiers.probability += 0.06;
        pushTickerMessage('Karte', 'Lichtneigung: Erfolg +6%.', 'info');
      },
    },
    coldLuck: {
      id: 'coldLuck',
      name: 'Kaltes Pech',
      description: '🧊 −6% Erfolg (1 Runde)',
      type: 'temp',
      rarityTier: 'C',
      icon: '🧊',
      palette: 'frost',
      apply(state) {
        state.tempModifiers.probability -= 0.06;
        pushTickerMessage('Karte', 'Kaltes Pech: Erfolg −6%.', 'warning');
      },
    },
    luckyBreak: {
      id: 'luckyBreak',
      name: 'Glückssprung',
      description: '✨ Hauskante −1% dauerhaft',
      type: 'perm',
      rarityTier: 'R',
      icon: '✨',
      palette: 'starlight',
      apply(state) {
        state.edge = Math.max(state.edge - 0.01, -0.5);
        pushTickerMessage('Karte', 'Glückssprung: Hauskante sinkt um 1%.', 'info');
      },
    },
    riskyLever: {
      id: 'riskyLever',
      name: 'Riskanter Hebel',
      description: '🎲 Einsatz ×1,5 (1 Runde)',
      type: 'temp',
      rarityTier: 'U',
      icon: '🎲',
      palette: 'ember',
      apply(state) {
        state.tempModifiers.betMultiplier *= 1.5;
        pushTickerMessage('Karte', 'Riskanter Hebel: Einsatz ×1,5.', 'info');
      },
    },
    houseTurns: {
      id: 'houseTurns',
      name: 'Haus zieht an',
      description: '💀 Hauskante +1,5% dauerhaft',
      type: 'perm',
      rarityTier: 'R',
      icon: '💀',
      palette: 'void',
      apply(state) {
        state.edge = Math.min(state.edge + 0.015, 0.5);
        pushTickerMessage('Karte', 'Hauskante steigt um 1,5%.', 'warning');
      },
    },
    focusSurge: {
      id: 'focusSurge',
      name: 'Fokus-Schub',
      description: '⚡ +8% Erfolg & Einsatz ×1,3 (1 Runde)',
      type: 'temp',
      rarityTier: 'R',
      icon: '⚡',
      palette: 'aurora',
      apply(state) {
        state.tempModifiers.probability += 0.08;
        state.tempModifiers.betMultiplier *= 1.3;
        pushTickerMessage('Karte', 'Fokus-Schub: Erfolg +8%, Einsatz ×1,3.', 'info');
      },
    },
    marketPulse: {
      id: 'marketPulse',
      name: 'Marktpuls',
      description: '💹 Sofort +€35',
      type: 'instant',
      rarityTier: 'U',
      icon: '💹',
      palette: 'circuit',
      apply(state) {
        state.money += 35;
        pushTickerMessage('Karte', 'Marktpuls zahlt €35 aus.', 'info');
      },
    },
    glitchField: {
      id: 'glitchField',
      name: 'Glitch-Feld',
      description: '🪙 Erfolg +12%, Einsatz halbiert (1 Runde)',
      type: 'temp',
      rarityTier: 'E',
      icon: '🪙',
      palette: 'starlight',
      apply(state) {
        state.tempModifiers.probability += 0.12;
        state.tempModifiers.betMultiplier *= 0.5;
        pushTickerMessage('Karte', 'Glitch-Feld: Erfolg +12%, Einsatz halbiert.', 'info');
      },
    },
    entropyTax: {
      id: 'entropyTax',
      name: 'Entropie-Steuer',
      description: '🧾 Sofort −€30',
      type: 'instant',
      rarityTier: 'U',
      icon: '🧾',
      palette: 'void',
      apply(state) {
        state.money = Math.max(0, state.money - 30);
        pushTickerMessage('Karte', 'Entropie kassiert €30.', 'warning');
      },
    },
    probabilityCrash: {
      id: 'probabilityCrash',
      name: 'Wahrscheinlichkeitseinbruch',
      description: '📉 −8% Erfolg (1 Runde)',
      type: 'temp',
      rarityTier: 'C',
      icon: '📉',
      palette: 'frost',
      apply(state) {
        state.tempModifiers.probability -= 0.08;
        pushTickerMessage('Karte', 'Wahrscheinlichkeitseinbruch: −8% Erfolg.', 'warning');
      },
    },
    luckyStreak: {
      id: 'luckyStreak',
      name: 'Streiflicht',
      description: '🌈 Einsatz ×1,4 & +6% Erfolg (1 Runde)',
      type: 'temp',
      rarityTier: 'R',
      icon: '🌈',
      palette: 'aurora',
      apply(state) {
        state.tempModifiers.betMultiplier *= 1.4;
        state.tempModifiers.probability += 0.06;
        pushTickerMessage('Karte', 'Streiflicht: Einsatz ×1,4 & Erfolg +6%.', 'info');
      },
    },
    voidAnchor: {
      id: 'voidAnchor',
      name: 'Leerenanker',
      description: '🪨 Basis-Erfolg −2% dauerhaft',
      type: 'perm',
      rarityTier: 'R',
      icon: '🪨',
      palette: 'void',
      apply(state) {
        state.baseProbability = Utils.clamp(state.baseProbability - 0.02, MIN_PROB, MAX_PROB);
        pushTickerMessage('Karte', 'Leerenanker senkt den Basis-Erfolg um 2%.', 'warning');
      },
    },
    edgePolish: {
      id: 'edgePolish',
      name: 'Kantenpolitur',
      description: '🪓 Hauskante −1,5% dauerhaft',
      type: 'perm',
      rarityTier: 'R',
      icon: '🪓',
      palette: 'circuit',
      apply(state) {
        state.edge = Math.max(state.edge - 0.015, -0.5);
        pushTickerMessage('Karte', 'Kantenpolitur: Hauskante sinkt um 1,5%.', 'info');
      },
    },
    quantumCopy: {
      id: 'quantumCopy',
      name: 'Quanten-Kopie',
      description: '🃏 Kopiert die letzte Ablagekarte ins Deck',
      type: 'instant',
      rarityTier: 'E',
      icon: '🃏',
      palette: 'starlight',
      apply(state) {
        if (state.discard.length) {
          const source = state.discard[state.discard.length - 1];
          state.deck.push({ ...source });
          state.deck = Utils.shuffle(state.deck);
          pushTickerMessage('Karte', `„${source.name}“ wird dupliziert.`, 'info');
        } else {
          pushTickerMessage('Karte', 'Keine Karte zum Kopieren.', 'warning');
        }
      },
    },
  };

  const SHOP_POOL = [
    {
      id: 'edgeDown',
      name: 'Kante feilen',
      description: 'Hauskante −2%.',
      price: 200,
      rarityTier: 'R',
      icon: '🛠️',
      palette: 'circuit',
      apply(state) {
        state.edge = Math.max(state.edge - 0.02, -0.5);
        pushTickerMessage('Shop', 'Hauskante sinkt um 2%.', 'info');
      },
    },
    {
      id: 'baseUp',
      name: 'Instinkt trainieren',
      description: 'Basis-Erfolg +2%.',
      price: 180,
      rarityTier: 'U',
      icon: '📈',
      palette: 'aurora',
      apply(state) {
        state.baseProbability = Utils.clamp(state.baseProbability + 0.02, 0.05, 0.95);
        pushTickerMessage('Shop', 'Basis-Erfolg steigt um 2%.', 'info');
      },
    },
    {
      id: 'banishColdLuck',
      name: 'Verbannung: Kaltes Pech',
      description: 'Entfernt „Kaltes Pech“ aus dem Deck.',
      price: 150,
      rarityTier: 'E',
      icon: '🧊',
      palette: 'frost',
      apply() {
        removeCardFromDeck('coldLuck', 'Kaltes Pech');
      },
    },
    {
      id: 'banishVoidAnchor',
      name: 'Anker lösen',
      description: 'Entfernt „Leerenanker“ aus Deck oder Ablage.',
      price: 220,
      rarityTier: 'E',
      icon: '⚓',
      palette: 'void',
      apply() {
        removeCardFromDeck('voidAnchor', 'Leerenanker');
      },
    },
    {
      id: 'addFocusSurge',
      name: 'Neue Karte: Fokus-Schub',
      description: 'Fügt „Fokus-Schub“ hinzu.',
      price: 230,
      rarityTier: 'R',
      icon: '⚡',
      palette: 'aurora',
      apply(state) {
        state.deck.push({ ...CARD_LIBRARY.focusSurge });
        state.deck = Utils.shuffle(state.deck);
        pushTickerMessage('Shop', '„Fokus-Schub“ betritt dein Deck.', 'info');
      },
    },
    {
      id: 'addEdgePolish',
      name: 'Neue Karte: Kantenpolitur',
      description: 'Fügt „Kantenpolitur“ hinzu.',
      price: 210,
      rarityTier: 'R',
      icon: '🪓',
      palette: 'circuit',
      apply(state) {
        state.deck.push({ ...CARD_LIBRARY.edgePolish });
        state.deck = Utils.shuffle(state.deck);
        pushTickerMessage('Shop', '„Kantenpolitur“ veredelt dein Deck.', 'info');
      },
    },
    {
      id: 'addLuckyStreak',
      name: 'Neue Karte: Streiflicht',
      description: 'Fügt „Streiflicht“ hinzu.',
      price: 160,
      rarityTier: 'R',
      icon: '🌈',
      palette: 'aurora',
      apply(state) {
        state.deck.push({ ...CARD_LIBRARY.luckyStreak });
        state.deck = Utils.shuffle(state.deck);
        pushTickerMessage('Shop', '„Streiflicht“ glitzert in deinem Deck.', 'info');
      },
    },
    {
      id: 'unlockBet',
      name: 'Einsatz-Stufe freischalten',
      description: 'Neuer Einsatz (+50% Maximum).',
      price: 100,
      rarityTier: 'C',
      icon: '💱',
      palette: 'circuit',
      apply(state) {
        const currentMax = Math.max(...state.betOptions);
        const newLevel = Math.round(currentMax * 1.5);
        if (!state.betOptions.includes(newLevel)) {
          state.betOptions.push(newLevel);
          state.betOptions.sort((a, b) => a - b);
          pushTickerMessage('Shop', `Neuer Einsatz freigeschaltet: €${newLevel}.`, 'info');
          if (state.selectedBet === currentMax) {
            state.selectedBet = newLevel;
          }
          renderBetButtons();
        }
      },
    },
  ];

  const state = {
    money: STARTING_STATE.money,
    baseProbability: STARTING_STATE.baseProbability,
    edge: STARTING_STATE.edge,
    focus: STARTING_STATE.focus,
    turn: STARTING_STATE.turn,
    betOptions: [...STARTING_STATE.betOptions],
    selectedBet: STARTING_STATE.selectedBet,
    deck: [],
    discard: [],
    tempModifiers: createTempModifiers(),
    activeCard: null,
    runActive: true,
    bestScore: 0,
    currentShopItem: null,
    awaitingFlip: false,
  };

  const elements = {
    money: document.getElementById('money'),
    bestScore: document.getElementById('bestScore'),
    effectiveProbability: document.getElementById('effectiveProbability'),
    baseProbability: document.getElementById('baseProbability'),
    edge: document.getElementById('edge'),
    turn: document.getElementById('turn'),
    roundProgress: document.getElementById('roundProgress'),
    currentBet: document.getElementById('currentBet'),
    cardDisplay: document.getElementById('cardDisplay'),
    cardElement: document.querySelector('#cardDisplay .game-card'),
    cardRarity: document.getElementById('cardRarity'),
    cardType: document.getElementById('cardType'),
    cardIcon: document.getElementById('cardIcon'),
    cardStatus: document.querySelector('#cardDisplay .card__status'),
    betButtons: document.getElementById('betButtons'),
    drawButton: document.getElementById('drawButton'),
    restartButton: document.getElementById('restartButton'),
    tickerList: document.getElementById('tickerList'),
    tickerPanel: document.getElementById('tickerPanel'),
    shopModal: document.getElementById('shopModal'),
    shopDescription: document.getElementById('shopDescription'),
    shopPrice: document.getElementById('shopPrice'),
    buyButton: document.getElementById('buyButton'),
    skipShopButton: document.getElementById('skipShopButton'),
    phaseBadge: document.getElementById('phaseBadge'),
    actionStage: document.getElementById('actionStage'),
    deckList: document.getElementById('deckList'),
    deckTab: document.getElementById('deckTab'),
    shopTab: document.getElementById('shopTab'),
    shopCountdown: document.getElementById('shopCountdown'),
    shopHints: document.getElementById('shopHints'),
    shopCardPreview: document.getElementById('shopCardPreview'),
    tabButtons: document.querySelectorAll('.tab-button'),
    tutorialOverlay: document.getElementById('tutorialOverlay'),
    tutorialText: document.getElementById('tutorialText'),
    tutorialStep: document.getElementById('tutorialStep'),
    summaryModal: document.getElementById('summaryModal'),
    summaryMessage: document.getElementById('summaryMessage'),
    summaryRestart: document.getElementById('summaryRestart'),
    shopModalCard: document.getElementById('shopModalCard'),
  };

  const CardEffects = (() => {
    const registered = new WeakSet();
    const timers = new WeakMap();
    const pointerState = { card: null, posX: 0, posY: 0, width: 0, height: 0 };
    let frame = null;
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = reduceMotionQuery.matches;
    const supportsHoverQuery = window.matchMedia('(hover: hover)');
    const supportsPointerEvents = 'PointerEvent' in window;

    const clearTimer = (card) => {
      const existing = timers.get(card);
      if (existing) {
        clearTimeout(existing);
        timers.delete(card);
      }
    };

    const setDefaults = (card) => {
      if (!card) return;
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      card.style.setProperty('--grad-x', '50%');
      card.style.setProperty('--grad-y', '50%');
      card.style.setProperty('--spark-x', '50%');
      card.style.setProperty('--spark-y', '50%');
      card.style.setProperty('--spark-opacity', '0.4');
      card.style.setProperty('--glare-x', '50%');
      card.style.setProperty('--glare-y', '50%');
      card.style.setProperty('--sheen-angle', '120deg');
    };

    const queueIdleAnimation = (card) => {
      if (!card || prefersReducedMotion) return;
      clearTimer(card);
      const timer = setTimeout(() => {
        if (card.isConnected) {
          card.classList.add('animated');
        }
      }, 2400);
      timers.set(card, timer);
    };

    const resetCard = (card) => {
      if (!card) return;
      clearTimer(card);
      if (!prefersReducedMotion) {
        card.style.transition = 'transform 0.45s ease';
      } else {
        card.style.transition = '';
      }
      setDefaults(card);
      card.classList.remove('card-touch-shine');
      card.classList.remove('animated');
      if (!prefersReducedMotion) {
        setTimeout(() => {
          if (card.isConnected) {
            card.style.transition = '';
          }
        }, 450);
        queueIdleAnimation(card);
      }
    };

    const updateCard = () => {
      const card = pointerState.card;
      if (!card || prefersReducedMotion) {
        frame = null;
        return;
      }
      const { posX, posY, width, height } = pointerState;
      if (!width || !height) {
        frame = null;
        return;
      }
      const l = Math.max(Math.min(posX, width), 0);
      const t = Math.max(Math.min(posY, height), 0);
      const px = Math.abs(Math.floor((l / width) * 100) - 100);
      const py = Math.abs(Math.floor((t / height) * 100) - 100);
      const pa = (50 - px) + (50 - py);
      const lp = 50 + (px - 50) / 1.5;
      const tp = 50 + (py - 50) / 1.5;
      const pxSpark = 50 + (px - 50) / 7;
      const pySpark = 50 + (py - 50) / 7;
      const pOpc = 20 + Math.abs(pa) * 1.5;
      const ty = ((tp - 50) / 2) * -1;
      const tx = ((lp - 50) / 1.5) * 0.5;
      const sheenAngle = 120 + (lp - 50) * 0.8;
      card.style.transform = `perspective(900px) rotateX(${ty.toFixed(2)}deg) rotateY(${tx.toFixed(2)}deg)`;
      card.style.setProperty('--grad-x', `${lp.toFixed(2)}%`);
      card.style.setProperty('--grad-y', `${tp.toFixed(2)}%`);
      card.style.setProperty('--spark-x', `${pxSpark.toFixed(2)}%`);
      card.style.setProperty('--spark-y', `${pySpark.toFixed(2)}%`);
      card.style.setProperty('--spark-opacity', Math.min(pOpc / 100, 1).toFixed(2));
      card.style.setProperty('--glare-x', `${pxSpark.toFixed(2)}%`);
      card.style.setProperty('--glare-y', `${pySpark.toFixed(2)}%`);
      card.style.setProperty('--sheen-angle', `${sheenAngle.toFixed(2)}deg`);
      frame = null;
    };

    const triggerShine = (card) => {
      if (!card || prefersReducedMotion) return;
      card.classList.remove('card-touch-shine');
      void card.offsetWidth;
      card.classList.add('card-touch-shine');
      setTimeout(() => {
        if (card.isConnected) {
          card.classList.remove('card-touch-shine');
        }
      }, 600);
    };

    const handlePointerEnter = (event) => {
      const card = event.currentTarget;
      if (!card || card.dataset.active !== 'true' || prefersReducedMotion) return;
      clearTimer(card);
      card.classList.remove('animated');
      card.style.transition = 'transform 0.18s ease-out';
      const rect = card.getBoundingClientRect();
      pointerState.card = card;
      pointerState.width = rect.width;
      pointerState.height = rect.height;
      pointerState.posX = rect.width / 2;
      pointerState.posY = rect.height / 2;
      if (!frame) {
        frame = requestAnimationFrame(updateCard);
      }
    };

    const handlePointerMove = (event) => {
      const card = event.currentTarget;
      if (!card || card.dataset.active !== 'true' || prefersReducedMotion) return;
      clearTimer(card);
      card.style.transition = '';
      card.classList.remove('animated');
      const point = event.touches && event.touches[0] ? event.touches[0] : event;
      const rect = card.getBoundingClientRect();
      pointerState.card = card;
      pointerState.width = rect.width;
      pointerState.height = rect.height;
      pointerState.posX = point.clientX - rect.left;
      pointerState.posY = point.clientY - rect.top;
      if (!frame) {
        frame = requestAnimationFrame(updateCard);
      }
    };

    const handlePointerLeave = (event) => {
      const card = event.currentTarget;
      if (pointerState.card === card) {
        pointerState.card = null;
      }
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      resetCard(card);
    };

    const handlePointerDown = (event) => {
      const card = event.currentTarget;
      if (!card || card.dataset.active !== 'true') return;
      if (prefersReducedMotion) return;
      if (!event.pointerType) {
        triggerShine(card);
        return;
      }
      if (event.pointerType === 'mouse') {
        if (supportsHoverQuery.matches) {
          triggerShine(card);
        }
        return;
      }
      triggerShine(card);
    };

    const register = (card) => {
      if (!card || registered.has(card)) return;
      registered.add(card);
      setDefaults(card);
      if (!prefersReducedMotion) {
        card.classList.add('animated');
        queueIdleAnimation(card);
      }
      if (supportsPointerEvents) {
        card.addEventListener('pointerenter', handlePointerEnter);
        card.addEventListener('pointermove', handlePointerMove);
        card.addEventListener('pointerleave', handlePointerLeave);
        card.addEventListener('pointerdown', handlePointerDown);
      } else {
        card.addEventListener('mouseenter', handlePointerEnter);
        card.addEventListener('mousemove', handlePointerMove);
        card.addEventListener('mouseleave', handlePointerLeave);
        card.addEventListener('mousedown', handlePointerDown);
        card.addEventListener('touchstart', () => triggerShine(card), { passive: true });
        card.addEventListener('touchmove', handlePointerMove, { passive: true });
      }
    };

    const handleReduceMotionChange = (event) => {
      prefersReducedMotion = event.matches;
      if (prefersReducedMotion) {
        if (frame) {
          cancelAnimationFrame(frame);
          frame = null;
        }
        pointerState.card = null;
      }
      document.querySelectorAll('.game-card').forEach((card) => {
        setDefaults(card);
        card.classList.remove('card-touch-shine');
        if (prefersReducedMotion) {
          clearTimer(card);
          card.classList.remove('animated');
          card.style.transition = '';
        } else {
          card.classList.add('animated');
          queueIdleAnimation(card);
        }
      });
    };

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', handleReduceMotionChange);
    } else if (reduceMotionQuery.addListener) {
      reduceMotionQuery.addListener(handleReduceMotionChange);
    }

    const refresh = (root = document) => {
      root.querySelectorAll('.game-card').forEach(register);
    };

    const activate = (card) => {
      if (!card) return;
      clearTimer(card);
      setDefaults(card);
      if (!prefersReducedMotion) {
        card.classList.add('animated');
        queueIdleAnimation(card);
      }
    };

    const deactivate = (card) => {
      if (!card) return;
      if (pointerState.card === card) {
        pointerState.card = null;
      }
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      clearTimer(card);
      setDefaults(card);
      card.classList.remove('animated');
      card.classList.remove('card-touch-shine');
      card.style.transition = '';
    };

    return { refresh, deactivate, activate };
  })();

  function setDisplayCardActive(active) {
    if (!elements.cardElement) return;
    elements.cardElement.dataset.active = active ? 'true' : 'false';
    if (!active) {
      CardEffects.deactivate(elements.cardElement);
    } else {
      CardEffects.activate(elements.cardElement);
    }
  }

  const BET_BUTTON_BASE_CLASSES =
    'w-full rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-base font-semibold text-slate-200 transition-all duration-200 hover:border-[#5bd4ff] hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5bd4ff] disabled:cursor-not-allowed disabled:opacity-60';
  const BET_BUTTON_SELECTED_CLASSES =
    'border-[#5bd4ff] bg-[#123042] text-[#5bd4ff] shadow-[0_0_25px_rgba(91,212,255,0.35)]';
  const TICKER_ITEM_BASE_CLASSES =
    'flex items-start justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';

  let shopLocked = false;

  const tutorial = {
    active: false,
    completed: false,
    index: 0,
    highlight: null,
    steps: [
      {
        text: 'Schritt 1: Ziehe eine Karte.',
        targetId: 'drawButton',
        trigger: 'card-drawn',
      },
      {
        text: 'Schritt 2: Drücke Flip & auszahlen.',
        targetId: 'drawButton',
        trigger: 'flip-complete',
      },
      {
        text: 'Schritt 3: Beobachte dein Ergebnis unten.',
        targetId: 'tickerPanel',
        trigger: 'tutorial-complete',
      },
    ],
  };

  const TICKER_ICONS = {
    win: '💰',
    lose: '💸',
    info: 'ℹ️',
    warning: '⚠️',
    Shop: '🛒',
    Deck: '🂠',
    Versuch: '🏁',
    Karte: '🎴',
  };

  const SHOP_HINTS = [
    '🛠️ Dauerhafte Effekte bauen deinen Vorteil Runde für Runde aus.',
    '💡 Entferne Risiko-Karten früh, um stabile Versuche zu sichern.',
    '💰 Shop erscheint alle 5 Züge – plane deinen Einsatz rechtzeitig.',
  ];

  const RARITY_LABELS = {
    C: 'Gewöhnlich',
    U: 'Ungewöhnlich',
    R: 'Selten',
    E: 'Episch',
  };

  const TYPE_LABELS = {
    temp: '1 Runde',
    perm: 'Dauerhaft',
    instant: 'Sofort',
  };

  const RARITY_TIER_BY_TYPE = {
    good: 'R',
    bad: 'C',
    neutral: 'U',
  };

  const DEFAULT_CARD_ICON = '🎴';

  function getRarityTier(card) {
    if (!card) return 'C';
    if (card.rarityTier) return card.rarityTier;
    if (card.rarity && RARITY_TIER_BY_TYPE[card.rarity]) {
      return RARITY_TIER_BY_TYPE[card.rarity];
    }
    return 'C';
  }

  function getRarityLabel(tier) {
    return RARITY_LABELS[tier] || RARITY_LABELS.C;
  }

  function getTypeLabel(type) {
    return TYPE_LABELS[type] || TYPE_LABELS.temp;
  }

  function getCardIcon(card) {
    return (card && card.icon) || DEFAULT_CARD_ICON;
  }

  function formatCardDataFromCard(card, overrides = {}) {
    const rarityTier = overrides.rarityTier || getRarityTier(card);
    return {
      title: overrides.title || card.name,
      description: overrides.description || card.description,
      icon: overrides.icon || getCardIcon(card),
      typeLabel: overrides.typeLabel || getTypeLabel(card.type),
      rarityTier,
      palette: overrides.palette || card.palette,
      ariaLabel:
        overrides.ariaLabel || `${overrides.title || card.name}: ${overrides.description || card.description}`,
    };
  }

  function createCardShell({ context, active, rarityTier, ariaLabel, size, palette }) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.context = context;
    card.dataset.active = active ? 'true' : 'false';
    card.dataset.rarity = rarityTier;
    if (size) {
      card.dataset.size = size;
    }
    if (palette) {
      card.dataset.palette = palette;
    }
    card.setAttribute('aria-label', ariaLabel);
    card.tabIndex = 0;

    const sheen = document.createElement('div');
    sheen.className = 'card-sheen';
    const glare = document.createElement('div');
    glare.className = 'card-glare';
    const inner = document.createElement('div');
    inner.className = 'card-inner';

    card.append(sheen, glare, inner);
    return { card, inner };
  }

  function createGameCardView(data, options = {}) {
    const { context = 'deck', active = false, size = 'compact', footer, palette } = options;
    const rarityTier = data.rarityTier || 'C';
    const ariaLabel = data.ariaLabel || `${data.title}: ${data.description}`;
    const { card, inner } = createCardShell({
      context,
      active,
      rarityTier,
      ariaLabel,
      size,
      palette: palette || data.palette,
    });

    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-300';
    header.innerHTML = `<span>${getRarityLabel(rarityTier)}</span><span>${data.typeLabel || ''}</span>`;

    const body = document.createElement('div');
    body.className = 'flex items-start gap-3';

    const icon = document.createElement('span');
    icon.className = size === 'large' ? 'card-icon text-3xl' : 'card-icon text-2xl';
    icon.textContent = data.icon || DEFAULT_CARD_ICON;

    const textWrap = document.createElement('div');
    textWrap.className = 'space-y-1';

    const title = document.createElement('h3');
    if (size === 'large') {
      title.className = 'text-2xl font-semibold text-slate-100';
    } else if (size === 'regular') {
      title.className = 'text-lg font-semibold text-slate-100';
    } else {
      title.className = 'text-base font-semibold text-slate-100';
    }
    title.textContent = data.title;

    const description = document.createElement('p');
    if (size === 'large') {
      description.className = 'text-sm leading-6 text-slate-300';
    } else if (size === 'regular') {
      description.className = 'text-sm leading-6 text-slate-300';
    } else {
      description.className = 'text-xs leading-5 text-slate-300';
    }
    description.textContent = data.description;

    textWrap.append(title, description);
    body.append(icon, textWrap);

    inner.append(header, body);

    if (footer) {
      const footerEl = document.createElement('p');
      footerEl.className = 'text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400';
      footerEl.textContent = footer;
      inner.append(footerEl);
    }

    return card;
  }

  function animateValue(element) {
    if (!element) return;
    element.classList.remove('value-pop');
    // Trigger reflow to restart animation
    void element.offsetWidth;
    element.classList.add('value-pop');
  }

  function updatePhaseBadge() {
    if (!elements.phaseBadge) return;
    if (shopLocked) {
      elements.phaseBadge.textContent = 'Shop';
      return;
    }
    if (!state.runActive) {
      elements.phaseBadge.textContent = 'Beendet';
      return;
    }
    if (state.awaitingFlip) {
      elements.phaseBadge.textContent = 'Flip';
      return;
    }
    elements.phaseBadge.textContent = 'Bereit';
  }

  function updateActionButton() {
    if (!elements.drawButton) return;
    if (shopLocked) {
      elements.drawButton.disabled = true;
      elements.drawButton.textContent = 'Shop offen…';
    } else if (!state.runActive) {
      elements.drawButton.disabled = true;
      elements.drawButton.textContent = 'Versuch beendet';
    } else if (state.awaitingFlip) {
      elements.drawButton.disabled = false;
      elements.drawButton.textContent = 'Flip & auszahlen';
    } else {
      elements.drawButton.disabled = false;
      elements.drawButton.textContent = 'Karte ziehen & wetten';
    }
    updatePhaseBadge();
  }

  function showFeedback(success) {
    if (!elements.actionStage) return;
    elements.actionStage.classList.remove('feedback-success', 'feedback-fail');
    void elements.actionStage.offsetWidth;
    elements.actionStage.classList.add(success ? 'feedback-success' : 'feedback-fail');
    setTimeout(() => {
      elements.actionStage.classList.remove('feedback-success', 'feedback-fail');
    }, 600);
  }

  function renderDeckList() {
    if (!elements.deckList) return;
    elements.deckList.innerHTML = '';
    if (!state.deck.length) {
      const li = document.createElement('li');
      li.className = 'rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3 text-sm text-slate-400';
      li.textContent = state.discard.length ? 'Deck wird gemischt…' : 'Deck leer – Shop oder Gewinn abwarten.';
      elements.deckList.appendChild(li);
      return;
    }

    const allowDeckTilt = state.runActive && !shopLocked && !state.activeCard;

    state.deck.forEach((card, index) => {
      const li = document.createElement('li');
      li.className = 'flex';
      const isTopCard = index === 0;
      const data = formatCardDataFromCard(card, {
        ariaLabel: `${card.name}: ${card.description}. ${isTopCard ? 'Oberste Karte im Deck.' : `Position ${index + 1} im Deck.`}`,
      });
      const cardEl = createGameCardView(data, {
        context: 'deck',
        active: isTopCard && allowDeckTilt,
        size: 'compact',
        footer: isTopCard
          ? `${allowDeckTilt ? 'Bereit' : 'Wartet'} · ${data.typeLabel}`
          : data.typeLabel,
      });
      li.appendChild(cardEl);
      elements.deckList.appendChild(li);
    });

    CardEffects.refresh(elements.deckList);
  }

  function updateShopCountdown() {
    if (!elements.shopCountdown) return;
    if (!state.runActive) {
      elements.shopCountdown.textContent = 'Versuch beendet. Shop geschlossen.';
      return;
    }
    if (shopLocked) {
      elements.shopCountdown.textContent = 'Shop ist geöffnet – entscheide jetzt.';
      return;
    }
    if (state.turn === 0) {
      elements.shopCountdown.textContent = 'Noch 5 Züge bis zum nächsten Shop.';
      return;
    }
    const remainder = state.turn % SHOP_INTERVAL;
    const remaining = remainder === 0 ? SHOP_INTERVAL : SHOP_INTERVAL - remainder;
    elements.shopCountdown.textContent = `Noch ${remaining} Zug${remaining === 1 ? '' : 'e'}.`;
  }

  function setTutorialHighlight(target) {
    if (tutorial.highlight) {
      tutorial.highlight.classList.remove('tutorial-highlight');
    }
    tutorial.highlight = target;
    if (tutorial.highlight) {
      tutorial.highlight.classList.add('tutorial-highlight');
    }
  }

  function showTutorialStep() {
    if (!tutorial.active) return;
    const step = tutorial.steps[tutorial.index];
    if (!step) {
      tutorial.completed = true;
      tutorial.active = false;
      if (elements.tutorialOverlay) {
        elements.tutorialOverlay.classList.remove('active');
      }
      setTutorialHighlight(null);
      return;
    }
    const target = document.getElementById(step.targetId);
    if (elements.tutorialOverlay) {
      elements.tutorialOverlay.classList.add('active');
      if (elements.tutorialText) {
        elements.tutorialText.textContent = step.text;
      }
      if (elements.tutorialStep) {
        elements.tutorialStep.textContent = `${tutorial.index + 1}/3`;
      }
    }
    if (target) {
      setTutorialHighlight(target);
    }
  }

  function maybeAdvanceTutorial(trigger) {
    if (!tutorial.active) return;
    const step = tutorial.steps[tutorial.index];
    if (step && step.trigger === trigger) {
      tutorial.index += 1;
      if (tutorial.index >= tutorial.steps.length) {
        setTimeout(() => {
          if (elements.tutorialOverlay) {
            elements.tutorialOverlay.classList.remove('active');
          }
          setTutorialHighlight(null);
          tutorial.active = false;
          tutorial.completed = true;
        }, 1200);
      } else {
        showTutorialStep();
      }
    }
  }

  function startTutorial() {
    if (tutorial.completed) return;
    tutorial.active = true;
    tutorial.index = 0;
    showTutorialStep();
  }

  function switchTab(tab) {
    if (!elements.deckTab || !elements.shopTab) return;
    if (tab === 'shop') {
      elements.shopTab.classList.remove('hidden');
      elements.deckTab.classList.add('hidden');
    } else {
      elements.deckTab.classList.remove('hidden');
      elements.shopTab.classList.add('hidden');
      tab = 'deck';
    }
    if (elements.tabButtons) {
      elements.tabButtons.forEach((button) => {
        if (button.dataset.tab === tab) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    }
  }

  function renderShopHints() {
    if (!elements.shopHints) return;
    elements.shopHints.innerHTML = '';
    SHOP_HINTS.forEach((hint) => {
      const li = document.createElement('li');
      li.className = 'rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3 text-sm text-slate-200';
      li.textContent = hint;
      elements.shopHints.appendChild(li);
    });
  }

  function renderShopCardTargets(offer) {
    if (elements.shopCardPreview) {
      elements.shopCardPreview.innerHTML = '';
    }
    if (elements.shopModalCard) {
      elements.shopModalCard.innerHTML = '';
    }

    if (!offer) {
      if (elements.shopCardPreview) {
        const placeholder = document.createElement('p');
        placeholder.className = 'text-sm text-slate-500';
        placeholder.textContent = 'Kein Angebot aktiv.';
        elements.shopCardPreview.appendChild(placeholder);
      }
      return;
    }

    const cardData = {
      title: offer.name,
      description: offer.description,
      icon: offer.icon || '🛒',
      typeLabel: 'Shop',
      rarityTier: offer.rarityTier || 'U',
      ariaLabel: `${offer.name}: ${offer.description}. Preis €${offer.price}.`,
      palette: offer.palette || 'shop',
    };

    if (elements.shopCardPreview) {
      const previewCard = createGameCardView(cardData, {
        context: 'shop',
        active: false,
        size: 'compact',
        footer: `€${offer.price}`,
        palette: cardData.palette,
      });
      elements.shopCardPreview.appendChild(previewCard);
      CardEffects.refresh(elements.shopCardPreview);
    }

    if (elements.shopModalCard) {
      const modalCard = createGameCardView(cardData, {
        context: 'shop',
        active: true,
        size: 'regular',
        footer: `€${offer.price}`,
        palette: cardData.palette,
      });
      elements.shopModalCard.appendChild(modalCard);
      CardEffects.refresh(elements.shopModalCard);
    }
  }

  function clearShopCards() {
    renderShopCardTargets(null);
  }
  const BUY_BUTTON_ACCENT_CLASSES = [
    'bg-accent',
    'hover:bg-[#73dcff]',
    'text-midnight',
    'focus-visible:outline-[#5bd4ff]',
    'shadow-[0_20px_45px_rgba(91,212,255,0.3)]',
  ];
  const BUY_BUTTON_DANGER_CLASSES = [
    'bg-danger',
    'hover:bg-[#ff8787]',
    'text-[#1b0a0a]',
    'focus-visible:outline-[#ff6b6b]',
    'shadow-[0_20px_45px_rgba(255,107,107,0.35)]',
  ];

  function applyBuyButtonStyle(canAfford) {
    if (!elements.buyButton) return;
    const removeClasses = canAfford ? BUY_BUTTON_DANGER_CLASSES : BUY_BUTTON_ACCENT_CLASSES;
    removeClasses.forEach((cls) => elements.buyButton.classList.remove(cls));
    const addClasses = canAfford ? BUY_BUTTON_ACCENT_CLASSES : BUY_BUTTON_DANGER_CLASSES;
    addClasses.forEach((cls) => {
      if (!elements.buyButton.classList.contains(cls)) {
        elements.buyButton.classList.add(cls);
      }
    });
  }

  function createTempModifiers() {
    return {
      probability: 0,
      betMultiplier: 1,
    };
  }

  function createStartDeck() {
    const cards = [];
    cards.push(
      { ...CARD_LIBRARY.lightTilt },
      { ...CARD_LIBRARY.lightTilt },
      { ...CARD_LIBRARY.focusSurge },
      { ...CARD_LIBRARY.riskyLever },
      { ...CARD_LIBRARY.riskyLever },
      { ...CARD_LIBRARY.coldLuck },
      { ...CARD_LIBRARY.coldLuck },
      { ...CARD_LIBRARY.probabilityCrash },
      { ...CARD_LIBRARY.glitchField },
      { ...CARD_LIBRARY.luckyBreak },
      { ...CARD_LIBRARY.houseTurns },
      { ...CARD_LIBRARY.entropyTax },
      { ...CARD_LIBRARY.marketPulse },
      { ...CARD_LIBRARY.luckyStreak },
      { ...CARD_LIBRARY.voidAnchor },
      { ...CARD_LIBRARY.quantumCopy },
    );
    return Utils.shuffle(cards);
  }

  function resetState() {
    state.money = STARTING_STATE.money;
    state.baseProbability = STARTING_STATE.baseProbability;
    state.edge = STARTING_STATE.edge;
    state.focus = STARTING_STATE.focus;
    state.turn = STARTING_STATE.turn;
    state.betOptions = [...STARTING_STATE.betOptions];
    state.selectedBet = STARTING_STATE.selectedBet;
    state.deck = createStartDeck();
    state.discard = [];
    state.tempModifiers = createTempModifiers();
    state.activeCard = null;
    state.runActive = true;
    state.currentShopItem = null;
    state.awaitingFlip = false;
    shopLocked = false;
    renderBetButtons();
    updateCardDisplay(null);
    renderStats();
    clearTicker();
    renderDeckList();
    clearShopCards();
    updateShopCountdown();
    updateActionButton();
    if (elements.summaryModal) {
      elements.summaryModal.classList.add('hidden');
    }
    if (elements.summaryMessage) {
      elements.summaryMessage.textContent = '';
    }
    if (!tutorial.completed) {
      startTutorial();
    } else if (elements.tutorialOverlay) {
      elements.tutorialOverlay.classList.remove('active');
      setTutorialHighlight(null);
    }
    pushTickerMessage('Versuch', 'Neuer Versuch. Ziehe eine Karte!', 'info');
  }

  function renderStats() {
    const effectiveProb = getEffectiveProbability();
    const moneyText = `€${state.money.toFixed(0)}`;
    if (elements.money && elements.money.textContent !== moneyText) {
      elements.money.textContent = moneyText;
      animateValue(elements.money);
    } else if (elements.money) {
      elements.money.textContent = moneyText;
    }

    const bestText = `€${state.bestScore.toFixed(0)}`;
    if (elements.bestScore) {
      elements.bestScore.textContent = bestText;
    }

    const betText = `€${state.selectedBet.toFixed(0)}`;
    if (elements.currentBet && elements.currentBet.textContent !== betText) {
      elements.currentBet.textContent = betText;
      animateValue(elements.currentBet);
    } else if (elements.currentBet) {
      elements.currentBet.textContent = betText;
    }

    const effText = `${(effectiveProb * 100).toFixed(0)}%`;
    if (elements.effectiveProbability && elements.effectiveProbability.textContent !== effText) {
      elements.effectiveProbability.textContent = effText;
      animateValue(elements.effectiveProbability);
    } else if (elements.effectiveProbability) {
      elements.effectiveProbability.textContent = effText;
    }

    if (elements.baseProbability) {
      elements.baseProbability.textContent = `${(state.baseProbability * 100).toFixed(0)}%`;
    }
    if (elements.edge) {
      elements.edge.textContent = `${(state.edge * 100).toFixed(1)}%`;
    }
    if (elements.turn) {
      elements.turn.textContent = `Runde ${state.turn} / ${MAX_TURNS}`;
    }
    if (elements.roundProgress) {
      const progress = Math.min((state.turn / MAX_TURNS) * 100, 100);
      elements.roundProgress.style.width = `${progress}%`;
    }

    updateShopCountdown();
    updateActionButton();
  }

  function renderBetButtons() {
    elements.betButtons.innerHTML = '';
    state.betOptions.forEach((bet) => {
      const button = document.createElement('button');
      button.className = `${BET_BUTTON_BASE_CLASSES} ${
        bet === state.selectedBet ? BET_BUTTON_SELECTED_CLASSES : ''
      }`.trim();
      button.textContent = `€${bet}`;
      button.type = 'button';
      button.disabled = state.awaitingFlip || shopLocked || !state.runActive;
      button.addEventListener('click', () => {
        state.selectedBet = bet;
        renderBetButtons();
        renderStats();
      });
      elements.betButtons.appendChild(button);
    });
  }

  function getEffectiveProbability() {
    const raw = state.baseProbability - state.edge + state.tempModifiers.probability;
    return Utils.clamp(raw, MIN_PROB, MAX_PROB);
  }

  function drawCard() {
    if (!state.deck.length) {
      if (state.discard.length) {
        state.deck = Utils.shuffle(state.discard);
        state.discard = [];
        pushTickerMessage('Deck', 'Deck gemischt.', 'info');
      }
    }

    if (!state.deck.length) {
      pushTickerMessage('Deck', 'Keine Karten zum Ziehen!', 'warning');
      return null;
    }

    const card = state.deck.shift();
    state.discard.push(card);
    state.activeCard = card;
    card.apply(state);
    updateCardDisplay(card);
    renderStats();
    renderDeckList();
    pushTickerMessage('Karte', `${card.name}: ${card.description}`, 'info');
    return card;
  }

  function updateCardDisplay(card) {
    if (!elements.cardElement || !elements.cardDisplay) return;
    const title = elements.cardDisplay.querySelector('.card__title');
    const description = elements.cardDisplay.querySelector('.card__description');
    const status = elements.cardStatus;
    const rarity = elements.cardRarity;
    const type = elements.cardType;
    const icon = elements.cardIcon;

    setDisplayCardActive(false);

    if (!card) {
      elements.cardElement.dataset.rarity = 'C';
      delete elements.cardElement.dataset.palette;
      elements.cardElement.setAttribute('aria-label', 'Keine Karte ausgewählt');
      if (rarity) rarity.textContent = '---';
      if (type) type.textContent = '---';
      if (icon) icon.textContent = DEFAULT_CARD_ICON;
      if (title) title.textContent = 'Zieh eine Karte…';
      if (description) description.textContent = 'Tippe auf „Karte ziehen & wetten“, um loszulegen.';
      if (status) {
        status.textContent = 'Ergebnis erscheint nach Flip.';
        status.classList.remove('win', 'lose');
      }
      CardEffects.refresh(elements.cardDisplay);
      return;
    }

    const rarityTier = getRarityTier(card);
    elements.cardElement.dataset.rarity = rarityTier;
    if (card.palette) {
      elements.cardElement.dataset.palette = card.palette;
    } else {
      delete elements.cardElement.dataset.palette;
    }
    elements.cardElement.setAttribute('aria-label', `${card.name}: ${card.description}`);
    if (rarity) rarity.textContent = getRarityLabel(rarityTier);
    if (type) type.textContent = getTypeLabel(card.type);
    if (icon) icon.textContent = getCardIcon(card);
    if (title) title.textContent = card.name;
    if (description) description.textContent = card.description;
    if (status) {
      status.textContent = 'Flip & auszahlen für das Ergebnis.';
      status.classList.remove('win', 'lose');
    }

    CardEffects.refresh(elements.cardDisplay);
  }

  function clearTicker() {
    elements.tickerList.innerHTML = '';
  }

  function pushTickerMessage(source, text, outcome, probability) {
    if (!elements.tickerList) return;
    const li = document.createElement('li');
    li.className = TICKER_ITEM_BASE_CLASSES;
    if (outcome === 'win') {
      li.classList.add('border-[#66ffa6]', 'text-[#66ffa6]');
    } else if (outcome === 'lose') {
      li.classList.add('border-[#ff6b6b]', 'text-[#ff6b6b]');
    }
    const icon = TICKER_ICONS[outcome] || TICKER_ICONS[source] || 'ℹ️';
    const content = document.createElement('div');
    content.className = 'flex items-center text-sm font-medium';
    content.innerHTML = `<span class="ticker-icon">${icon}</span><span><span class="font-semibold">${source}</span> ${text}</span>`;
    li.appendChild(content);
    if (typeof probability === 'number') {
      const span = document.createElement('span');
      span.className = 'text-xs font-semibold text-slate-300';
      span.textContent = `${Math.round(probability * 100)}%`;
      li.appendChild(span);
    }
    elements.tickerList.prepend(li);
    while (elements.tickerList.children.length > 9) {
      elements.tickerList.removeChild(elements.tickerList.lastChild);
    }
  }

  function resolveTrial() {
    const card = state.activeCard;
    if (!card) return;
    const betAmount = Math.round(state.selectedBet * state.tempModifiers.betMultiplier);
    const probability = getEffectiveProbability();
    const roll = Utils.randomFloat();
    const success = roll <= probability;

    if (success) {
      state.money += betAmount;
      pushTickerMessage(card.name, `Gewinn +€${betAmount}`, 'win', probability);
    } else {
      state.money -= betAmount;
      pushTickerMessage(card.name, `Verlust −€${betAmount}`, 'lose', probability);
    }

    if (state.money < 0) {
      state.money = 0;
    }

    state.turn += 1;
    state.tempModifiers = createTempModifiers();
    state.awaitingFlip = false;
    state.activeCard = null;
    setDisplayCardActive(false);
    renderDeckList();
    renderStats();
    renderBetButtons();

    if (elements.cardStatus) {
      elements.cardStatus.textContent = success
        ? `Gewinn! +€${betAmount}`
        : `Verlust! −€${betAmount}`;
      elements.cardStatus.classList.remove('win', 'lose');
      elements.cardStatus.classList.add(success ? 'win' : 'lose');
    }
    showFeedback(success);

    maybeAdvanceTutorial('flip-complete');
    setTimeout(() => maybeAdvanceTutorial('tutorial-complete'), 1600);

    if (state.money > state.bestScore) {
      state.bestScore = state.money;
      persistBestScore();
    }

    checkRunEnd();

    if (state.runActive) {
      maybeOpenShop();
    }
  }

  function maybeOpenShop() {
    if (!state.runActive) return;
    if (state.turn === 0) return;
    if (state.turn % SHOP_INTERVAL !== 0) return;
    if (state.turn >= MAX_TURNS) return;
    if (shopLocked) return;

    const offer = Utils.sample(SHOP_POOL);
    state.currentShopItem = offer;
    pushTickerMessage('Shop', 'Shop öffnet sich!', 'info');
    openShopModal(offer);
  }

  function openShopModal(offer) {
    if (!offer) return;
    elements.shopDescription.textContent = `${offer.name}: ${offer.description}`;
    elements.shopPrice.textContent = `€${offer.price}`;
    renderShopCardTargets(offer);
    elements.shopModal.classList.remove('hidden');
    const canAfford = state.money >= offer.price;
    elements.buyButton.disabled = !canAfford;
    applyBuyButtonStyle(canAfford);
    shopLocked = true;
    updateActionButton();
    renderBetButtons();
    updateShopCountdown();
  }

  function closeShopModal() {
    elements.shopModal.classList.add('hidden');
    clearShopCards();
    state.currentShopItem = null;
    shopLocked = false;
    updateActionButton();
    renderBetButtons();
    updateShopCountdown();
  }

  function removeCardFromDeck(cardId, displayName) {
    const removeFrom = (collection) => {
      const index = collection.findIndex((card) => card.id === cardId);
      if (index >= 0) {
        collection.splice(index, 1);
        return true;
      }
      return false;
    };

    const label = displayName || cardId;

    if (removeFrom(state.deck) || removeFrom(state.discard)) {
      pushTickerMessage('Shop', `„${label}“ entfernt.`, 'info');
      renderDeckList();
    } else {
      pushTickerMessage('Shop', `Keine „${label}“-Karte gefunden.`, 'warning');
    }
  }

  function checkRunEnd() {
    if (!state.runActive) return;

    if (state.money >= GOAL_MONEY) {
      endRun('Zielkapital erreicht!');
      return;
    }

    if (state.turn >= MAX_TURNS) {
      if (state.money > 0) {
        endRun('25 Runden überlebt!');
      } else {
        endRun('25 Runden vorbei. Entropie hat gewonnen.');
      }
      return;
    }

    if (state.money <= 0) {
      endRun('Bankroll leer. Versuch beendet.');
    }
  }

  function endRun(message) {
    state.runActive = false;
    state.awaitingFlip = false;
    if (elements.shopModal && !elements.shopModal.classList.contains('hidden')) {
      closeShopModal();
    }
    shopLocked = false;
    updateActionButton();
    renderBetButtons();
    pushTickerMessage('Versuch', message, 'info');
    if (elements.cardStatus) {
      elements.cardStatus.textContent = message;
      elements.cardStatus.classList.remove('win', 'lose');
    }
    if (tutorial.active) {
      tutorial.active = false;
      tutorial.completed = true;
      if (elements.tutorialOverlay) {
        elements.tutorialOverlay.classList.remove('active');
      }
      setTutorialHighlight(null);
    }
    if (elements.summaryMessage) {
      elements.summaryMessage.textContent = `${message} Schlusskapital: €${state.money.toFixed(
        0
      )}. Beste Runde: €${state.bestScore.toFixed(0)}.`;
    }
    if (elements.summaryModal) {
      elements.summaryModal.classList.remove('hidden');
    }
  }

  function handleDraw() {
    if (!state.runActive || shopLocked) return;

    if (!state.awaitingFlip) {
      const card = drawCard();
      if (!card) return;
      state.awaitingFlip = true;
      setDisplayCardActive(true);
      renderBetButtons();
      renderStats();
      updateActionButton();
      maybeAdvanceTutorial('card-drawn');
    } else {
      resolveTrial();
    }
  }

  function handleRestart() {
    resetState();
  }

  function persistBestScore() {
    try {
      localStorage.setItem(STORAGE_KEY, String(state.bestScore));
    } catch (error) {
      console.warn('Unable to store best score', error);
    }
    renderStats();
  }

  function loadBestScore() {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY));
      if (!Number.isNaN(stored) && stored > 0) {
        state.bestScore = stored;
      }
    } catch (error) {
      console.warn('Unable to load best score', error);
    }
  }

  function handleBuy() {
    if (!state.currentShopItem) return;
    if (state.money < state.currentShopItem.price) {
      pushTickerMessage('Shop', 'Nicht genug Kapital.', 'warning');
      return;
    }

    state.money -= state.currentShopItem.price;
    state.currentShopItem.apply(state);
    renderStats();
    renderDeckList();
    closeShopModal();
  }

  function handleSkipShop() {
    if (state.currentShopItem) {
      pushTickerMessage('Shop', 'Angebot übersprungen.', 'info');
    }
    closeShopModal();
  }

  function attachEventListeners() {
    if (elements.drawButton) {
      elements.drawButton.addEventListener('click', handleDraw);
    }
    if (elements.restartButton) {
      elements.restartButton.addEventListener('click', handleRestart);
    }
    if (elements.buyButton) {
      elements.buyButton.addEventListener('click', handleBuy);
    }
    if (elements.skipShopButton) {
      elements.skipShopButton.addEventListener('click', handleSkipShop);
    }
    if (elements.tabButtons) {
      elements.tabButtons.forEach((button) => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
      });
    }
    if (elements.summaryRestart) {
      elements.summaryRestart.addEventListener('click', handleRestart);
    }
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', handleSkipShop);
    }
  }

  function init() {
    loadBestScore();
    renderShopHints();
    renderBetButtons();
    attachEventListeners();
    if (elements.buyButton) {
      applyBuyButtonStyle(true);
    }
    switchTab('deck');
    resetState();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
