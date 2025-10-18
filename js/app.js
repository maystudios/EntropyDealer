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
      name: 'Leichte Neigung',
      description: '⚙️ +5% Erfolg für 1 Runde',
      rarity: 'good',
      type: 'temp',
      apply(state) {
        state.tempModifiers.probability += 0.05;
      },
    },
    coldLuck: {
      id: 'coldLuck',
      name: 'Kaltes Pech',
      description: '⚠️ −5% Erfolg für 1 Runde',
      rarity: 'bad',
      type: 'temp',
      apply(state) {
        state.tempModifiers.probability -= 0.05;
      },
    },
    luckyBreak: {
      id: 'luckyBreak',
      name: 'Glücksmoment',
      description: '✨ Hauskante −1% dauerhaft',
      rarity: 'good',
      type: 'perm',
      apply(state) {
        state.edge = Math.max(state.edge - 0.01, -0.5);
      },
    },
    riskyLever: {
      id: 'riskyLever',
      name: 'Riskanter Hebel',
      description: '🎲 Einsatz ×1,5 (nur jetzt)',
      rarity: 'neutral',
      type: 'temp',
      apply(state) {
        state.tempModifiers.betMultiplier *= 1.5;
      },
    },
    houseTurns: {
      id: 'houseTurns',
      name: 'Haus dreht nach',
      description: '🔥 Hauskante +1% dauerhaft',
      rarity: 'bad',
      type: 'perm',
      apply(state) {
        state.edge = Math.min(state.edge + 0.01, 0.5);
      },
    },
  };

  const SHOP_POOL = [
    {
      id: 'edgeDown',
      name: 'Kante feilen',
      description: 'Hauskante −2%.',
      price: 200,
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
      apply(state) {
        removeCardFromDeck('coldLuck');
      },
    },
    {
      id: 'addLightTilt',
      name: 'Neue Karte: Leichte Neigung',
      description: 'Fügt „Leichte Neigung“ hinzu.',
      price: 120,
      apply(state) {
        state.deck.push({ ...CARD_LIBRARY.lightTilt });
        state.deck = Utils.shuffle(state.deck);
        pushTickerMessage('Shop', 'Neue „Leichte Neigung“ im Deck.', 'info');
      },
    },
    {
      id: 'unlockBet',
      name: 'Einsatz-Stufe freischalten',
      description: 'Neuer Einsatz (+50% Maximum).',
      price: 100,
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
    cardRarity: document.getElementById('cardRarity'),
    cardType: document.getElementById('cardType'),
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
    tabButtons: document.querySelectorAll('.tab-button'),
    tutorialOverlay: document.getElementById('tutorialOverlay'),
    tutorialText: document.getElementById('tutorialText'),
    tutorialStep: document.getElementById('tutorialStep'),
    summaryModal: document.getElementById('summaryModal'),
    summaryMessage: document.getElementById('summaryMessage'),
    summaryRestart: document.getElementById('summaryRestart'),
  };

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
    const counts = new Map();
    [...state.deck, ...state.discard].forEach((card) => {
      const key = card.id;
      const entry = counts.get(key) || { card, amount: 0 };
      entry.amount += 1;
      counts.set(key, entry);
    });
    elements.deckList.innerHTML = '';
    if (!counts.size) {
      const li = document.createElement('li');
      li.className = 'rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3 text-sm text-slate-400';
      li.textContent = 'Deck lädt…';
      elements.deckList.appendChild(li);
      return;
    }
    [...counts.values()]
      .sort((a, b) => a.card.name.localeCompare(b.card.name))
      .forEach(({ card, amount }) => {
        const li = document.createElement('li');
        li.className = 'flex items-start justify-between gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-4 py-3';
        const text = document.createElement('div');
        text.innerHTML = `<p class="text-sm font-semibold text-slate-100">${amount}× ${card.name}</p><p class="text-xs text-slate-300">${card.description}</p>`;
        li.appendChild(text);
        elements.deckList.appendChild(li);
      });
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
      { ...CARD_LIBRARY.lightTilt },
      { ...CARD_LIBRARY.coldLuck },
      { ...CARD_LIBRARY.coldLuck },
      { ...CARD_LIBRARY.coldLuck },
      { ...CARD_LIBRARY.luckyBreak },
      { ...CARD_LIBRARY.riskyLever },
      { ...CARD_LIBRARY.riskyLever },
      { ...CARD_LIBRARY.houseTurns },
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
    if (!elements.cardDisplay) return;
    const title = elements.cardDisplay.querySelector('.card__title');
    const description = elements.cardDisplay.querySelector('.card__description');
    const status = elements.cardStatus;
    elements.cardDisplay.classList.remove('good', 'bad', 'neutral');

    if (!card) {
      if (elements.cardRarity) elements.cardRarity.textContent = '---';
      if (elements.cardType) elements.cardType.textContent = '---';
      if (title) title.textContent = 'Zieh eine Karte…';
      if (description) description.textContent = 'Tippe auf „Karte ziehen & wetten“, um loszulegen.';
      if (status) {
        status.textContent = 'Ergebnis erscheint nach Flip.';
        status.classList.remove('win', 'lose');
      }
      return;
    }

    if (elements.cardRarity) {
      const label = card.rarity === 'good' ? 'Gut' : card.rarity === 'bad' ? 'Riskant' : 'Neutral';
      elements.cardRarity.textContent = label;
    }
    if (elements.cardType) {
      elements.cardType.textContent = card.type === 'perm' ? 'Dauerhaft' : '1 Runde';
    }
    if (title) title.textContent = card.name;
    if (description) description.textContent = card.description;
    if (status) {
      status.textContent = 'Flip & auszahlen für das Ergebnis.';
      status.classList.remove('win', 'lose');
    }

    if (card.rarity === 'good') {
      elements.cardDisplay.classList.add('good');
    } else if (card.rarity === 'bad') {
      elements.cardDisplay.classList.add('bad');
    } else {
      elements.cardDisplay.classList.add('neutral');
    }
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
    state.currentShopItem = null;
    shopLocked = false;
    updateActionButton();
    renderBetButtons();
    updateShopCountdown();
  }

  function removeCardFromDeck(cardId) {
    const removeFrom = (collection) => {
      const index = collection.findIndex((card) => card.id === cardId);
      if (index >= 0) {
        collection.splice(index, 1);
        return true;
      }
      return false;
    };

    if (removeFrom(state.deck) || removeFrom(state.discard)) {
      pushTickerMessage('Shop', '„Kaltes Pech“ entfernt.', 'info');
      renderDeckList();
    } else {
      pushTickerMessage('Shop', 'Keine „Kaltes Pech“-Karte gefunden.', 'warning');
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
