/* Open index.html in a browser */

const ladders = {
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100
};

const snakes = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78
};

const palette = [
  "#d1495b",
  "#00798c",
  "#edae49",
  "#6c5ce7",
  "#00916e",
  "#f3722c",
  "#277da1",
  "#7f5539",
  "#9b5de5",
  "#2a9d8f"
];

const gameState = {
  players: [],
  positions: [],
  currentPlayer: 0,
  isMoving: false,
  started: false,
  lastDiceRoll: null,
  winner: null,
  zoom: 1,
  boardSizeMode: "auto",
  manualBoardSizePx: null
};

let elements = {};

function cacheElements() {
  elements = {
    setupPanel: document.getElementById("setup-panel"),
    gamePanel: document.getElementById("game-panel"),
    appHeader: document.querySelector(".app-header"),
    controls: document.querySelector(".controls"),
    playerCount: document.getElementById("player-count"),
    playerNames: document.getElementById("player-names"),
    startGame: document.getElementById("start-game"),
    rollDice: document.getElementById("roll-dice"),
    currentPlayerIndicator: document.getElementById("current-player-indicator"),
    board: document.getElementById("board"),
    moveLog: document.getElementById("move-log"),
    setupError: document.getElementById("setup-error"),
    winnerBanner: document.getElementById("winner-banner"),
    winnerText: document.getElementById("winner-text"),
    winnerRestart: document.getElementById("winner-restart"),
    restart: document.getElementById("restart"),
    diceImage: document.getElementById("dice-image"),
    diceValue: document.getElementById("dice-value"),
    boardOverlay: document.getElementById("board-overlay"),
    boardWrap: document.getElementById("board-wrap"),
    zoomIn: document.getElementById("zoomInBtn"),
    zoomOut: document.getElementById("zoomOutBtn"),
    zoomReset: document.getElementById("zoomResetBtn"),
    zoomLabel: document.getElementById("zoom-label"),
    fitBoard: document.getElementById("fitBoardBtn"),
    resizeHandle: document.getElementById("board-resize-handle"),
    jsStatus: document.getElementById("js-status"),
    cssStatus: document.getElementById("css-status")
  };
}

function buildBoard() {
  elements.board.innerHTML = "";
  for (let row = 9; row >= 0; row -= 1) {
    const rowStart = row * 10 + 1;
    const rowNumbers = Array.from({ length: 10 }, (_, i) => rowStart + i);
    if (row % 2 === 1) {
      rowNumbers.reverse();
    }
    rowNumbers.forEach((number) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.square = number;

      const numberLabel = document.createElement("div");
      numberLabel.className = "cell-number";
      numberLabel.textContent = number;
      cell.appendChild(numberLabel);

      if (ladders[number]) {
        const badge = document.createElement("div");
        badge.className = "badge ladder";
        badge.textContent = `L↑${ladders[number]}`;
        cell.appendChild(badge);
      }

      if (snakes[number]) {
        const badge = document.createElement("div");
        badge.className = "badge snake";
        badge.textContent = `S↓${snakes[number]}`;
        cell.appendChild(badge);
      }

      const tokenArea = document.createElement("div");
      tokenArea.className = "token-area";
      cell.appendChild(tokenArea);

      elements.board.appendChild(cell);
    });
  }
  drawConnections();
}

function updatePlayerInputs(count) {
  elements.playerNames.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Player ${i + 1}`;
    input.value = `Player ${i + 1}`;
    input.dataset.index = i;
    elements.playerNames.appendChild(input);
  }
}

function resetGameState(players) {
  gameState.players = players;
  gameState.positions = players.map(() => 1);
  gameState.currentPlayer = 0;
  gameState.isMoving = false;
  gameState.started = players.length > 0;
  gameState.lastDiceRoll = null;
  gameState.winner = null;
}

function resetToSetup(reason = "manual reset") {
  console.log(`resetToSetup: ${reason}`);
  resetGameState([]);
  setHidden(elements.setupPanel, false);
  setHidden(elements.gamePanel, true);
  setHidden(elements.winnerBanner, true);
  elements.rollDice.disabled = true;
  setHidden(elements.restart, true);
  updateDiceFace(null);
  elements.moveLog.innerHTML = "";
  clearHighlights();
  renderTokens();
  applyZoom(1);
}

function startGame() {
  const count = Number(elements.playerCount.value);
  if (Number.isNaN(count) || count < 1 || count > 10) {
    elements.setupError.textContent = "Player count must be between 1 and 10.";
    return;
  }

  const nameInputs = Array.from(elements.playerNames.querySelectorAll("input"));
  const players = nameInputs.slice(0, count).map((input, index) => {
    const name = input.value.trim() || `Player ${index + 1}`;
    return {
      name,
      color: palette[index % palette.length],
      initial: name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    };
  });

  resetGameState(players);

  elements.setupError.textContent = "";
  setHidden(elements.setupPanel, true);
  setHidden(elements.gamePanel, false);
  elements.rollDice.disabled = false;
  elements.moveLog.innerHTML = "";
  setHidden(elements.restart, false);

  renderTokens();
  updateCurrentPlayer();
  updateDiceFace(null);
  logMove("Game started. All players begin on square 1.");
  updateBoardSize();
  setTimeout(updateBoardSize, 50);
  setTimeout(updateBoardSize, 250);
  requestAnimationFrame(drawConnections);
}

async function rollDice() {
  if (!gameState.started || gameState.isMoving) {
    return;
  }

  gameState.isMoving = true;
  elements.rollDice.disabled = true;

  const rollDuration = 900;
  const rollInterval = 120;
  const startTime = Date.now();
  while (Date.now() - startTime < rollDuration) {
    const tempRoll = Math.floor(Math.random() * 6) + 1;
    updateDiceFace(tempRoll);
    await sleep(rollInterval);
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  gameState.lastDiceRoll = roll;
  updateDiceFace(roll);
  logMove(`${gameState.players[gameState.currentPlayer].name} rolled ${roll}`);
  await movePlayer(gameState.currentPlayer, roll);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function movePlayer(playerIndex, steps) {
  const player = gameState.players[playerIndex];
  const currentPos = gameState.positions[playerIndex];
  const target = currentPos + steps;

  if (target > 100) {
    logMove(`${player.name} stays at ${currentPos} (needs exact roll).`);
    gameState.isMoving = false;
    elements.rollDice.disabled = false;
    nextTurn();
    return;
  }

  clearHighlights();
  highlightCell(currentPos);

  let newPos = currentPos;
  for (let step = 0; step < steps; step += 1) {
    newPos += 1;
    gameState.positions[playerIndex] = newPos;
    renderTokens();
    highlightCell(newPos);
    await sleep(250);
  }

  logMove(`${player.name} moved: ${currentPos} -> ${newPos}`);

  const result = applySnakesAndLadders(newPos);

  if (result.to !== newPos) {
    await sleep(500);
    gameState.positions[playerIndex] = result.to;
    renderTokens();
    highlightCell(result.to);
    if (result.type === "ladder") {
      logMove(`Ladder: ${newPos} -> ${result.to}`);
    } else if (result.type === "snake") {
      logMove(`Snake: ${newPos} -> ${result.to}`);
    }
    await sleep(300);
  }

  if (result.to === 100) {
    declareWinner(player);
    return;
  }

  gameState.isMoving = false;
  elements.rollDice.disabled = false;
  nextTurn();
}

function applySnakesAndLadders(position) {
  if (ladders[position]) {
    return { type: "ladder", from: position, to: ladders[position] };
  }
  if (snakes[position]) {
    return { type: "snake", from: position, to: snakes[position] };
  }
  return { type: "none", from: position, to: position };
}

function renderTokens() {
  const cells = elements.board.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const tokenArea = cell.querySelector(".token-area");
    tokenArea.innerHTML = "";
  });

  gameState.players.forEach((player, index) => {
    const position = gameState.positions[index];
    const cell = elements.board.querySelector(`[data-square='${position}']`);
    if (!cell) return;
    const tokenArea = cell.querySelector(".token-area");
    const token = document.createElement("div");
    token.className = "token";
    token.style.backgroundColor = player.color;
    token.textContent = player.initial || String(index + 1);
    tokenArea.appendChild(token);
  });
}

function logMove(text) {
  const entry = document.createElement("div");
  entry.textContent = text;
  elements.moveLog.prepend(entry);
}

function nextTurn() {
  gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
  updateCurrentPlayer();
}

function updateCurrentPlayer() {
  const player = gameState.players[gameState.currentPlayer];
  elements.currentPlayerIndicator.innerHTML = "";
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.backgroundColor = player.color;
  const name = document.createElement("span");
  name.textContent = player.name;
  elements.currentPlayerIndicator.appendChild(dot);
  elements.currentPlayerIndicator.appendChild(name);
}

function highlightCell(number) {
  clearHighlights();
  const cell = elements.board.querySelector(`[data-square='${number}']`);
  if (cell) {
    cell.classList.add("highlight");
  }
}

function clearHighlights() {
  elements.board.querySelectorAll(".cell.highlight").forEach((cell) => {
    cell.classList.remove("highlight");
  });
}

function declareWinner(player) {
  gameState.isMoving = false;
  gameState.winner = player.name;
  elements.rollDice.disabled = true;
  elements.winnerText.textContent = `${player.name} wins!`;
  setHidden(elements.winnerBanner, false);
  console.log(`showWinner: ${player.name} reached 100`);
  logMove(`${player.name} reached 100 and won the game.`);
}

function setHidden(element, shouldHide) {
  if (!element) return;
  element.hidden = shouldHide;
  element.classList.toggle("hidden", shouldHide);
}

function updateDiceFace(value) {
  if (!elements.diceValue || !elements.diceImage) return;
  const label = value ? String(value) : "-";
  elements.diceValue.textContent = label;
  if (value) {
    elements.diceImage.src = `Dice/${value}.png`;
    elements.diceImage.alt = `Dice showing ${label}`;
  } else {
    elements.diceImage.src = "Dice/dice.jpg";
    elements.diceImage.alt = "Dice showing -";
  }
}

function drawConnections() {
  const overlay = elements.boardOverlay;
  if (!overlay) return;
  overlay.innerHTML = "";
  const boardEl = elements.board;
  const wrapEl = elements.boardWrap;
  if (!boardEl || !wrapEl) return;
  const boardWidth = boardEl.clientWidth;
  const boardHeight = boardEl.clientHeight;
  if (!boardWidth || !boardHeight) return;
  overlay.setAttribute("width", boardWidth);
  overlay.setAttribute("height", boardHeight);
  overlay.setAttribute("viewBox", `0 0 ${boardWidth} ${boardHeight}`);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const ladderMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  ladderMarker.setAttribute("id", "ladder-arrow");
  ladderMarker.setAttribute("markerWidth", "8");
  ladderMarker.setAttribute("markerHeight", "8");
  ladderMarker.setAttribute("refX", "4");
  ladderMarker.setAttribute("refY", "4");
  ladderMarker.setAttribute("orient", "auto");
  const ladderArrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  ladderArrow.setAttribute("d", "M0,0 L8,4 L0,8 Z");
  ladderArrow.setAttribute("fill", "#2f8f7a");
  ladderMarker.appendChild(ladderArrow);
  defs.appendChild(ladderMarker);

  const snakeMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  snakeMarker.setAttribute("id", "snake-arrow");
  snakeMarker.setAttribute("markerWidth", "8");
  snakeMarker.setAttribute("markerHeight", "8");
  snakeMarker.setAttribute("refX", "4");
  snakeMarker.setAttribute("refY", "4");
  snakeMarker.setAttribute("orient", "auto");
  const snakeArrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  snakeArrow.setAttribute("d", "M0,0 L8,4 L0,8 Z");
  snakeArrow.setAttribute("fill", "#b6483d");
  snakeMarker.appendChild(snakeArrow);
  defs.appendChild(snakeMarker);
  overlay.appendChild(defs);

  const getCellCenter = (square) => {
    const cell = boardEl.querySelector(`[data-square='${square}']`);
    if (!cell) return null;
    const offsetX = boardEl.offsetLeft;
    const offsetY = boardEl.offsetTop;
    return {
      x: offsetX + cell.offsetLeft + cell.offsetWidth / 2,
      y: offsetY + cell.offsetTop + cell.offsetHeight / 2
    };
  };

  const drawLine = (from, to, color, markerId, curve) => {
    const start = getCellCenter(from);
    const end = getCellCenter(to);
    if (!start || !end) return;
    const startX = start.x;
    const startY = start.y;
    const endX = end.x;
    const endY = end.y;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const controlX = (startX + endX) / 2 + curve;
    const controlY = (startY + endY) / 2 - curve;
    path.setAttribute("d", `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("marker-end", `url(#${markerId})`);
    overlay.appendChild(path);
  };

  Object.entries(ladders).forEach(([from, to], index) => {
    drawLine(Number(from), Number(to), "#2f8f7a", "ladder-arrow", 0);
  });

  Object.entries(snakes).forEach(([from, to], index) => {
    drawLine(Number(from), Number(to), "#b6483d", "snake-arrow", -(12 + index * 2));
  });
}

function applyZoom(value) {
  gameState.zoom = Math.min(1.0, Math.max(0.6, value));
  updateBoardSize();
}

function updateBoardSize() {
  if (!elements.boardWrap) return;
  const padding = 32;
  const viewportWidth =
    (window.visualViewport && window.visualViewport.width) ||
    document.documentElement.clientWidth ||
    window.innerWidth;
  const viewportHeight =
    (window.visualViewport && window.visualViewport.height) ||
    document.documentElement.clientHeight ||
    window.innerHeight;
  const headerHeight = elements.appHeader ? elements.appHeader.getBoundingClientRect().height : 0;
  const isStacked = window.matchMedia("(max-width: 900px)").matches;
  const reservedUI = headerHeight + padding;
  const availableWidth = viewportWidth - padding;
  const availableHeight = viewportHeight - reservedUI - padding;
  const fitSize = Math.max(200, Math.floor(Math.min(availableWidth, availableHeight)));
  const maxSize = fitSize;
  const minSize = 280;
  let baseSize = fitSize;
  if (gameState.boardSizeMode === "manual" && gameState.manualBoardSizePx) {
    baseSize = gameState.manualBoardSizePx;
  }
  const clampedBase = Math.min(maxSize, Math.max(minSize, baseSize));
  const effectiveSize = Math.floor(clampedBase * gameState.zoom);
  elements.boardWrap.style.width = `${effectiveSize}px`;
  elements.boardWrap.style.height = `${effectiveSize}px`;
  if (elements.zoomLabel) {
    elements.zoomLabel.textContent = `${Math.round(gameState.zoom * 100)}%`;
  }
  requestAnimationFrame(() => {
    drawConnections();
    renderTokens();
  });
}

function wireEvents() {
  elements.playerCount.addEventListener("input", (event) => {
    const count = Math.min(10, Math.max(1, Number(event.target.value || 1)));
    updatePlayerInputs(count);
  });

  elements.startGame.addEventListener("click", startGame);
  elements.rollDice.addEventListener("click", rollDice);
  elements.winnerRestart.addEventListener("click", () => {
    console.log("restart button clicked (winner modal)");
    resetToSetup("winner modal restart");
  });
  elements.restart.addEventListener("click", () => {
    console.log("restart button clicked (in-game)");
    resetToSetup("in-game restart");
  });

  elements.zoomIn.addEventListener("click", () => {
    applyZoom(gameState.zoom + 0.1);
  });
  elements.zoomOut.addEventListener("click", () => {
    applyZoom(gameState.zoom - 0.1);
  });
  elements.zoomReset.addEventListener("click", () => {
    applyZoom(1);
  });
  elements.fitBoard.addEventListener("click", () => {
    gameState.boardSizeMode = "auto";
    gameState.manualBoardSizePx = null;
    applyZoom(1);
  });

  let resizing = false;
  let startSize = 0;
  let startX = 0;
  let startY = 0;

  const startResize = (event) => {
    if (!elements.boardWrap) return;
    resizing = true;
    const point = event.touches ? event.touches[0] : event;
    startX = point.clientX;
    startY = point.clientY;
    startSize = elements.boardWrap.getBoundingClientRect().width;
    gameState.boardSizeMode = "manual";
  };

  const onResize = (event) => {
    if (!resizing) return;
    const point = event.touches ? event.touches[0] : event;
    const delta = Math.max(point.clientX - startX, point.clientY - startY);
    gameState.manualBoardSizePx = Math.round(startSize + delta);
    updateBoardSize();
  };

  const stopResize = () => {
    resizing = false;
  };

  elements.resizeHandle.addEventListener("mousedown", startResize);
  elements.resizeHandle.addEventListener("touchstart", startResize, { passive: true });
  window.addEventListener("mousemove", onResize);
  window.addEventListener("touchmove", onResize, { passive: true });
  window.addEventListener("mouseup", stopResize);
  window.addEventListener("touchend", stopResize);
}

function init() {
  // Initial UI state must be the setup screen.
  console.log("init: cache elements and reset to setup");
  cacheElements();
  if (elements.jsStatus) {
    elements.jsStatus.textContent = "JS: OK";
  }
  if (elements.cssStatus) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--border").trim();
    elements.cssStatus.textContent = bg ? "CSS: OK" : "CSS: ...";
  }
  buildBoard();
  updatePlayerInputs(Number(elements.playerCount.value));
  wireEvents();
  resetToSetup("initial load");
  window.addEventListener("resize", () => {
    updateBoardSize();
  });
  if (window.ResizeObserver && elements.boardWrap) {
    const observer = new ResizeObserver(() => updateBoardSize());
    observer.observe(elements.boardWrap);
  }
  updateBoardSize();
  window.addEventListener("load", () => {
    updateBoardSize();
  });
  setTimeout(updateBoardSize, 50);
  setTimeout(updateBoardSize, 250);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
