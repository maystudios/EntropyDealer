// app.js - Main Game Logic

// ============= GAME STATE =============
const gameState = {
    // Resources
    money: 100,
    bet: 10,
    baseP: 0.50,
    edge: 0.00,
    focus: 0,
    
    // Game Progress
    turn: 1,
    maxTurns: 25,
    goalMoney: 1000,
    
    // Deck
    deck: [],
    discard: [],
    
    // Current card and temporary modifiers
    currentCard: null,
    tempPMod: 0,
    tempBetMultiplier: 1,
    
    // Shop
    shopInterval: 4,
    currentShopItem: null,
    
    // Available bet levels
    availableBets: [5, 10, 20, 40],
    
    // Game state
    gameOver: false,
    bestScore: 0
};

// ============= CARD DEFINITIONS =============
const cardTypes = {
    LEICHTE_NEIGUNG: {
        name: "Leichte Neigung",
        description: "+0,05 Erfolgsquote für diesen Zug",
        type: "positive",
        effect: (state) => { state.tempPMod = 0.05; },
        permanent: false
    },
    KALTES_PECH: {
        name: "Kaltes Pech",
        description: "−0,05 Erfolgsquote für diesen Zug",
        type: "negative",
        effect: (state) => { state.tempPMod = -0.05; },
        permanent: false
    },
    GLUECKSMOMENT: {
        name: "Glücksmoment",
        description: "−0,01 Hauskante (dauerhaft)",
        type: "positive",
        effect: (state) => { state.edge = Math.max(0, state.edge - 0.01); },
        permanent: true
    },
    RISKANTER_HEBEL: {
        name: "Riskanter Hebel",
        description: "Einsatz ×1,5 nur für diesen Zug",
        type: "neutral",
        effect: (state) => { state.tempBetMultiplier = 1.5; },
        permanent: false
    },
    HAUS_DREHT: {
        name: "Haus dreht nach",
        description: "+0,01 Hauskante (dauerhaft)",
        type: "negative",
        effect: (state) => { state.edge = Math.min(0.5, state.edge + 0.01); },
        permanent: true
    }
};

// Starting deck composition
function createStartingDeck() {
    return [
        cardTypes.LEICHTE_NEIGUNG,
        cardTypes.LEICHTE_NEIGUNG,
        cardTypes.LEICHTE_NEIGUNG,
        cardTypes.KALTES_PECH,
        cardTypes.KALTES_PECH,
        cardTypes.KALTES_PECH,
        cardTypes.GLUECKSMOMENT,
        cardTypes.RISKANTER_HEBEL,
        cardTypes.RISKANTER_HEBEL,
        cardTypes.HAUS_DREHT
    ];
}

// ============= SHOP ITEMS =============
const shopItems = [
    {
        name: "Kante feilen",
        description: "−0,02 Hauskante",
        price: 200,
        effect: (state) => { state.edge = Math.max(0, state.edge - 0.02); }
    },
    {
        name: "Instinkt trainieren",
        description: "+0,02 Basiswahrscheinlichkeit",
        price: 180,
        effect: (state) => { state.baseP = Math.min(0.95, state.baseP + 0.02); }
    },
    {
        name: "Verbannung: Kaltes Pech",
        description: "Entferne 1 'Kaltes Pech' aus dem Deck",
        price: 150,
        effect: (state) => {
            // Remove one "Kaltes Pech" from deck or discard
            let removed = false;
            for (let i = 0; i < state.deck.length; i++) {
                if (state.deck[i].name === "Kaltes Pech") {
                    state.deck.splice(i, 1);
                    removed = true;
                    break;
                }
            }
            if (!removed) {
                for (let i = 0; i < state.discard.length; i++) {
                    if (state.discard[i].name === "Kaltes Pech") {
                        state.discard.splice(i, 1);
                        break;
                    }
                }
            }
        }
    },
    {
        name: "Neue Karte: Leichte Neigung",
        description: "Füge 1 'Leichte Neigung' zum Deck hinzu",
        price: 120,
        effect: (state) => { state.deck.push(cardTypes.LEICHTE_NEIGUNG); }
    },
    {
        name: "Einsatz-Stufe freischalten",
        description: "Neue Einsatzstufe +50% der höchsten",
        price: 100,
        effect: (state) => {
            const maxBet = Math.max(...state.availableBets);
            const newBet = Math.floor(maxBet * 1.5);
            if (!state.availableBets.includes(newBet)) {
                state.availableBets.push(newBet);
                state.availableBets.sort((a, b) => a - b);
            }
        }
    }
];

// ============= GAME FUNCTIONS =============

function initGame() {
    // Reset state
    gameState.money = 100;
    gameState.bet = 10;
    gameState.baseP = 0.50;
    gameState.edge = 0.00;
    gameState.focus = 0;
    gameState.turn = 1;
    gameState.deck = shuffle(createStartingDeck());
    gameState.discard = [];
    gameState.currentCard = null;
    gameState.tempPMod = 0;
    gameState.tempBetMultiplier = 1;
    gameState.currentShopItem = null;
    gameState.availableBets = [5, 10, 20, 40];
    gameState.gameOver = false;
    
    // Load best score
    gameState.bestScore = loadFromStorage('entropyDealerBestScore', 0);
    
    updateUI();
    showBetPanel();
}

function calculateEffectiveProbability() {
    const pEff = gameState.baseP - gameState.edge + gameState.tempPMod;
    return clamp(pEff, 0.05, 0.95);
}

function drawCard() {
    if (gameState.deck.length === 0) {
        // Reshuffle discard into deck
        gameState.deck = shuffle(gameState.discard);
        gameState.discard = [];
        showFeedback("Deck wurde neu gemischt!", "info");
    }
    
    const card = gameState.deck.shift();
    gameState.currentCard = card;
    return card;
}

function applyCardEffect() {
    if (gameState.currentCard) {
        gameState.currentCard.effect(gameState);
    }
}

function executeTrial() {
    const pEff = calculateEffectiveProbability();
    const actualBet = Math.floor(gameState.bet * gameState.tempBetMultiplier);
    const success = rollTrial(pEff);
    
    if (success) {
        gameState.money += actualBet;
        showFeedback(`Erfolg (${formatPercent(pEff)}) +${actualBet}`, "success");
    } else {
        gameState.money -= actualBet;
        showFeedback(`Fehlschlag (${formatPercent(1 - pEff)}) −${actualBet}`, "fail");
    }
    
    return success;
}

function cleanupTurn() {
    // Move current card to discard
    if (gameState.currentCard) {
        gameState.discard.push(gameState.currentCard);
        gameState.currentCard = null;
    }
    
    // Reset temporary effects
    gameState.tempPMod = 0;
    gameState.tempBetMultiplier = 1;
}

function checkWinCondition() {
    if (gameState.money >= gameState.goalMoney) {
        endGame(true, `Ziel erreicht! ${gameState.goalMoney} Kapital!`);
        return true;
    }
    if (gameState.turn >= gameState.maxTurns) {
        endGame(true, `${gameState.maxTurns} Züge überlebt!`);
        return true;
    }
    return false;
}

function checkLoseCondition() {
    if (gameState.money <= 0) {
        endGame(false, "Kapital aufgebraucht!");
        return true;
    }
    return false;
}

function shouldShowShop() {
    return gameState.turn % gameState.shopInterval === 0 && gameState.turn < gameState.maxTurns;
}

function showShop() {
    gameState.currentShopItem = randomChoice(shopItems);
    updateShopUI();
    hideCardPanel();
    hideBetPanel();
    document.getElementById('shop-panel').style.display = 'block';
    document.getElementById('action-btn').style.display = 'none';
}

function buyShopItem() {
    if (gameState.currentShopItem && gameState.money >= gameState.currentShopItem.price) {
        gameState.money -= gameState.currentShopItem.price;
        gameState.currentShopItem.effect(gameState);
        showFeedback(`Gekauft: ${gameState.currentShopItem.name}`, "success");
        closeShop();
    } else {
        showFeedback("Nicht genug Kapital!", "fail");
    }
}

function closeShop() {
    document.getElementById('shop-panel').style.display = 'none';
    document.getElementById('action-btn').style.display = 'block';
    gameState.currentShopItem = null;
    gameState.turn++;
    updateUI();
    
    if (!checkWinCondition()) {
        showBetPanel();
    }
}

function endGame(won, message) {
    gameState.gameOver = true;
    
    // Update best score
    if (gameState.money > gameState.bestScore) {
        gameState.bestScore = gameState.money;
        saveToStorage('entropyDealerBestScore', gameState.bestScore);
    }
    
    // Show game over screen
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-over-title').textContent = won ? "Sieg!" : "Niederlage";
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('final-turns').textContent = gameState.turn;
    document.getElementById('final-money').textContent = gameState.money;
}

// ============= UI FUNCTIONS =============

function updateUI() {
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('turn').textContent = gameState.turn;
    document.getElementById('p-eff').textContent = formatPercent(calculateEffectiveProbability());
    document.getElementById('edge').textContent = formatNumber(gameState.edge, 2);
    document.getElementById('best-score').textContent = gameState.bestScore;
    
    updateBetButtons();
}

function updateBetButtons() {
    const betPanel = document.querySelector('.bet-buttons');
    betPanel.innerHTML = '';
    
    gameState.availableBets.forEach(betAmount => {
        const btn = document.createElement('button');
        btn.className = 'bet-btn';
        btn.dataset.bet = betAmount;
        btn.textContent = betAmount;
        if (betAmount === gameState.bet) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', () => selectBet(betAmount));
        betPanel.appendChild(btn);
    });
}

function selectBet(amount) {
    gameState.bet = amount;
    updateBetButtons();
}

function showBetPanel() {
    document.getElementById('bet-panel').style.display = 'block';
    document.getElementById('card-panel').style.display = 'none';
    document.getElementById('action-btn').textContent = 'Karte ziehen';
}

function hideBetPanel() {
    document.getElementById('bet-panel').style.display = 'none';
}

function showCardPanel() {
    const card = gameState.currentCard;
    document.getElementById('card-name').textContent = card.name;
    document.getElementById('card-description').textContent = card.description;
    
    const cardElement = document.querySelector('.card');
    cardElement.className = 'card ' + card.type;
    
    document.getElementById('card-panel').style.display = 'block';
    document.getElementById('bet-panel').style.display = 'none';
    document.getElementById('action-btn').textContent = 'Trial ausführen';
}

function hideCardPanel() {
    document.getElementById('card-panel').style.display = 'none';
}

function updateShopUI() {
    const item = gameState.currentShopItem;
    document.getElementById('shop-item-name').textContent = item.name;
    document.getElementById('shop-item-description').textContent = item.description;
    document.getElementById('shop-item-price').textContent = item.price;
    
    const buyBtn = document.getElementById('buy-btn');
    if (gameState.money < item.price) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.5';
    } else {
        buyBtn.disabled = false;
        buyBtn.style.opacity = '1';
    }
}

function showFeedback(message, type = "info") {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = 'feedback ' + type;
}

// ============= GAME FLOW =============

let gamePhase = 'bet'; // 'bet', 'card', 'trial'

async function handleAction() {
    if (gameState.gameOver) return;
    
    if (gamePhase === 'bet') {
        // Draw card
        const card = drawCard();
        showCardPanel();
        gamePhase = 'card';
        updateUI();
        
    } else if (gamePhase === 'card') {
        // Apply card effect and execute trial
        applyCardEffect();
        updateUI();
        
        await wait(300); // Brief pause for effect to register
        
        executeTrial();
        updateUI();
        
        gamePhase = 'trial';
        document.getElementById('action-btn').textContent = 'Weiter';
        
    } else if (gamePhase === 'trial') {
        // Clean up and move to next turn
        cleanupTurn();
        
        if (checkLoseCondition()) {
            return;
        }
        
        if (checkWinCondition()) {
            return;
        }
        
        // Check if shop should appear
        if (shouldShowShop()) {
            showShop();
        } else {
            gameState.turn++;
            updateUI();
            showBetPanel();
            gamePhase = 'bet';
        }
    }
}

// ============= EVENT LISTENERS =============

document.getElementById('action-btn').addEventListener('click', handleAction);

document.getElementById('buy-btn').addEventListener('click', () => {
    buyShopItem();
});

document.getElementById('skip-btn').addEventListener('click', () => {
    showFeedback("Shop übersprungen", "info");
    closeShop();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gamePhase = 'bet';
    initGame();
});

// ============= INITIALIZE GAME =============

initGame();
