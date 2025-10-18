(() => {
  const MAX_TURNS = 25;
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
      description: '+5% success chance this turn.',
      rarity: 'good',
      type: 'temp',
      apply(state) {
        state.tempModifiers.probability += 0.05;
      },
    },
    coldLuck: {
      id: 'coldLuck',
      name: 'Kaltes Pech',
      description: '−5% success chance this turn.',
      rarity: 'bad',
      type: 'temp',
      apply(state) {
        state.tempModifiers.probability -= 0.05;
      },
    },
    luckyBreak: {
      id: 'luckyBreak',
      name: 'Glücksmoment',
      description: 'Edge decreases by 1%.',
      rarity: 'good',
      type: 'perm',
      apply(state) {
        state.edge = Math.max(state.edge - 0.01, -0.5);
      },
    },
    riskyLever: {
      id: 'riskyLever',
      name: 'Riskanter Hebel',
      description: 'Bet increases by 50% this turn.',
      rarity: 'neutral',
      type: 'temp',
      apply(state) {
        state.tempModifiers.betMultiplier *= 1.5;
      },
    },
    houseTurns: {
      id: 'houseTurns',
      name: 'Haus dreht nach',
      description: 'Edge increases by 1% permanently.',
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
      description: 'Reduce edge by 2%.',
      price: 200,
      apply(state) {
        state.edge = Math.max(state.edge - 0.02, -0.5);
        pushTickerMessage('Shop', 'Edge softened by 2%.', 'info');
      },
    },
    {
      id: 'baseUp',
      name: 'Instinkt trainieren',
      description: 'Increase base probability by 2%.',
      price: 180,
      apply(state) {
        state.baseProbability = Utils.clamp(state.baseProbability + 0.02, 0.05, 0.95);
        pushTickerMessage('Shop', 'Base probability rises by 2%.', 'info');
      },
    },
    {
      id: 'banishColdLuck',
      name: 'Verbannung: Kaltes Pech',
      description: 'Remove one copy of “Kaltes Pech” from the deck.',
      price: 150,
      apply(state) {
        removeCardFromDeck('coldLuck');
      },
    },
    {
      id: 'addLightTilt',
      name: 'Neue Karte: Leichte Neigung',
      description: 'Add a copy of “Leichte Neigung” to the deck.',
      price: 120,
      apply(state) {
        state.deck.push({ ...CARD_LIBRARY.lightTilt });
        state.deck = Utils.shuffle(state.deck);
        pushTickerMessage('Shop', 'A new Leichte Neigung joins the deck.', 'info');
      },
    },
    {
      id: 'unlockBet',
      name: 'Einsatz-Stufe freischalten',
      description: 'Unlock a new bet level (+50% max).',
      price: 100,
      apply(state) {
        const currentMax = Math.max(...state.betOptions);
        const newLevel = Math.round(currentMax * 1.5);
        if (!state.betOptions.includes(newLevel)) {
          state.betOptions.push(newLevel);
          state.betOptions.sort((a, b) => a - b);
          pushTickerMessage('Shop', `New bet level unlocked: ${newLevel}.`, 'info');
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
  };

  const elements = {
    money: document.getElementById('money'),
    bestScore: document.getElementById('bestScore'),
    effectiveProbability: document.getElementById('effectiveProbability'),
    baseProbability: document.getElementById('baseProbability'),
    edge: document.getElementById('edge'),
    turn: document.getElementById('turn'),
    cardDisplay: document.getElementById('cardDisplay'),
    betButtons: document.getElementById('betButtons'),
    drawButton: document.getElementById('drawButton'),
    restartButton: document.getElementById('restartButton'),
    tickerList: document.getElementById('tickerList'),
    shopModal: document.getElementById('shopModal'),
    shopDescription: document.getElementById('shopDescription'),
    shopPrice: document.getElementById('shopPrice'),
    buyButton: document.getElementById('buyButton'),
    skipShopButton: document.getElementById('skipShopButton'),
  };

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
    renderBetButtons();
    updateCardDisplay(null);
    renderStats();
    clearTicker();
    pushTickerMessage('Run', 'New run started. Draw a card to begin.', 'info');
  }

  function renderStats() {
    const effectiveProb = getEffectiveProbability();
    elements.money.textContent = `$${state.money.toFixed(0)}`;
    elements.bestScore.textContent = `$${state.bestScore.toFixed(0)}`;
    elements.effectiveProbability.textContent = `${(effectiveProb * 100).toFixed(0)}%`;
    elements.baseProbability.textContent = `${(state.baseProbability * 100).toFixed(0)}%`;
    elements.edge.textContent = `${(state.edge * 100).toFixed(1)}%`;
    elements.turn.textContent = `${state.turn}/${MAX_TURNS}`;
  }

  function renderBetButtons() {
    elements.betButtons.innerHTML = '';
    state.betOptions.forEach((bet) => {
      const button = document.createElement('button');
      button.className = 'btn btn--outline';
      if (bet === state.selectedBet) {
        button.classList.add('btn--selected');
      }
      button.textContent = `$${bet}`;
      button.type = 'button';
      button.addEventListener('click', () => {
        state.selectedBet = bet;
        renderBetButtons();
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
        pushTickerMessage('Deck', 'Deck reshuffled.', 'info');
      }
    }

    if (!state.deck.length) {
      pushTickerMessage('Deck', 'No cards left to draw!', 'warning');
      return null;
    }

    const card = state.deck.shift();
    state.discard.push(card);
    state.activeCard = card;
    card.apply(state);
    updateCardDisplay(card);
    renderStats();
    pushTickerMessage('Card', `${card.name} — ${card.description}`, 'info');
    return card;
  }

  function updateCardDisplay(card) {
    const title = elements.cardDisplay.querySelector('.card__title');
    const description = elements.cardDisplay.querySelector('.card__description');
    elements.cardDisplay.classList.remove('card--good', 'card--bad');

    if (!card) {
      title.textContent = 'Awaiting draw…';
      description.textContent = 'Press "Draw & Resolve" to begin the run.';
      return;
    }

    title.textContent = card.name;
    description.textContent = card.description;

    if (card.rarity === 'good') {
      elements.cardDisplay.classList.add('card--good');
    }
    if (card.rarity === 'bad') {
      elements.cardDisplay.classList.add('card--bad');
    }
  }

  function clearTicker() {
    elements.tickerList.innerHTML = '';
  }

  function pushTickerMessage(source, text, outcome, probability) {
    const li = document.createElement('li');
    li.className = 'ticker__item';
    if (outcome === 'win') li.classList.add('ticker__item--win');
    if (outcome === 'lose') li.classList.add('ticker__item--lose');
    li.innerHTML = `<span>${source}: ${text}</span>`;
    if (typeof probability === 'number') {
      const span = document.createElement('span');
      span.className = 'ticker__prob';
      span.textContent = `${Math.round(probability * 100)}%`; 
      li.appendChild(span);
    }
    elements.tickerList.prepend(li);
    while (elements.tickerList.children.length > 8) {
      elements.tickerList.removeChild(elements.tickerList.lastChild);
    }
  }

  function resolveTrial(card) {
    const betAmount = Math.round(state.selectedBet * state.tempModifiers.betMultiplier);
    const probability = getEffectiveProbability();
    const roll = Utils.randomFloat();
    const success = roll <= probability;

    if (success) {
      state.money += betAmount;
      pushTickerMessage(card.name, `Success! +$${betAmount}`, 'win', probability);
    } else {
      state.money -= betAmount;
      pushTickerMessage(card.name, `Fail. -$${betAmount}`, 'lose', probability);
    }

    if (state.money < 0) {
      state.money = 0;
    }

    state.turn += 1;
    state.tempModifiers = createTempModifiers();
    state.activeCard = null;
    renderStats();

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
    if (state.turn === 0) return;
    if (state.turn % 4 !== 0) return;
    if (state.turn >= MAX_TURNS) return;

    const offer = Utils.sample(SHOP_POOL);
    state.currentShopItem = offer;
    openShopModal(offer);
  }

  function openShopModal(offer) {
    if (!offer) return;
    elements.shopDescription.textContent = `${offer.name}: ${offer.description}`;
    elements.shopPrice.textContent = `$${offer.price}`;
    elements.shopModal.classList.add('visible');
    elements.buyButton.disabled = state.money < offer.price;
    elements.buyButton.classList.toggle('btn--danger', state.money < offer.price);
    elements.drawButton.disabled = true;
  }

  function closeShopModal() {
    elements.shopModal.classList.remove('visible');
    state.currentShopItem = null;
    if (state.runActive) {
      elements.drawButton.disabled = false;
    }
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
      pushTickerMessage('Shop', 'A Kaltes Pech card was removed.', 'info');
    } else {
      pushTickerMessage('Shop', 'No Kaltes Pech card to remove.', 'warning');
    }
  }

  function checkRunEnd() {
    if (!state.runActive) return;

    if (state.money >= GOAL_MONEY) {
      endRun('Victory! Target bankroll reached.');
      return;
    }

    if (state.turn >= MAX_TURNS) {
      if (state.money > 0) {
        endRun('Victory! You endured all 25 turns.');
      } else {
        endRun('Run complete. Entropy claimed your stack.');
      }
      return;
    }

    if (state.money <= 0) {
      endRun('Run over. Bankroll depleted.');
    }
  }

  function endRun(message) {
    state.runActive = false;
    elements.drawButton.disabled = true;
    pushTickerMessage('Run', message, 'info');
  }

  function handleDraw() {
    if (!state.runActive) return;
    const card = drawCard();
    if (!card) return;
    resolveTrial(card);
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
      pushTickerMessage('Shop', 'Insufficient funds.', 'warning');
      return;
    }

    state.money -= state.currentShopItem.price;
    state.currentShopItem.apply(state);
    renderStats();
    closeShopModal();
  }

  function handleSkipShop() {
    pushTickerMessage('Shop', 'Offer declined.', 'info');
    closeShopModal();
  }

  function attachEventListeners() {
    elements.drawButton.addEventListener('click', handleDraw);
    elements.restartButton.addEventListener('click', handleRestart);
    elements.buyButton.addEventListener('click', handleBuy);
    elements.skipShopButton.addEventListener('click', handleSkipShop);
  }

  function init() {
    loadBestScore();
    renderBetButtons();
    attachEventListeners();
    resetState();
    elements.bestScore.textContent = `$${state.bestScore.toFixed(0)}`;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
