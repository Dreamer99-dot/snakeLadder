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
  started: false
};

let elements = {};

function cacheElements() {
  elements = {
    setupPanel: document.getElementById("setup-panel"),
    gamePanel: document.getElementById("game-panel"),
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
    boardOverlay: document.getElementById("board-overlay")
  };
}

function initUIState() {
  elements.setupPanel.classList.remove("hidden");
  elements.setupPanel.hidden = false;
  elements.gamePanel.classList.add("hidden");
  elements.gamePanel.hidden = true;
  elements.winnerBanner.classList.add("hidden");
  elements.winnerBanner.hidden = true;
  elements.rollDice.disabled = true;
  elements.restart.classList.add("hidden");
  elements.restart.hidden = true;
  elements.startGame.disabled = false;
}

function updateBoardSize() {
  const board = elements.board;
  if (!board) return;
  const viewport = window.visualViewport;
  const viewportWidth =
    (viewport && viewport.width) ||
    document.documentElement.clientWidth ||
    window.innerWidth;
  const viewportHeight =
    (viewport && viewport.height) ||
    document.documentElement.clientHeight ||
    window.innerHeight;
  const app = document.querySelector(".app");
  const appStyle = app ? getComputedStyle(app) : null;
  const padX = appStyle
    ? parseFloat(appStyle.paddingLeft) + parseFloat(appStyle.paddingRight)
    : 40;
  const padY = appStyle
    ? parseFloat(appStyle.paddingTop) + parseFloat(appStyle.paddingBottom)
    : 40;
  const header = document.querySelector(".app-header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const controls = document.querySelector(".controls");
  const isStacked = window.matchMedia("(max-width: 900px)").matches;
  const controlsHeight =
    isStacked && controls ? controls.getBoundingClientRect().height : 0;
  const controlsWidth =
    !isStacked && controls ? controls.getBoundingClientRect().width : 0;
  const availableWidth = Math.max(0, viewportWidth - padX - controlsWidth);
  const availableHeight = Math.max(
    0,
    viewportHeight - padY - headerHeight - controlsHeight
  );
  const size = Math.max(200, Math.floor(Math.min(availableWidth, availableHeight)));
  board.style.width = `${size}px`;
  board.style.height = `${size}px`;
  board.style.setProperty("--board-size", `${size}px`);
  requestAnimationFrame(drawConnections);
}

function drawConnections() {
  const overlay = elements.boardOverlay;
  const board = elements.board;
  if (!overlay || !board) return;
  const width = board.clientWidth;
  const height = board.clientHeight;
  if (!width || !height) return;
  overlay.style.left = `${board.offsetLeft}px`;
  overlay.style.top = `${board.offsetTop}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;
  overlay.style.display = "block";
  overlay.width = Math.round(width);
  overlay.height = Math.round(height);
  const ctx = overlay.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.lineCap = "round";

  const getCellCenter = (square) => {
    const cell = board.querySelector(`[data-square='${square}']`);
    if (!cell) return null;
    const cellRect = cell.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    return {
      x: cellRect.left + cellRect.width / 2 - boardRect.left,
      y: cellRect.top + cellRect.height / 2 - boardRect.top
    };
  };

  const drawArrow = (from, to, color, curve) => {
    const start = getCellCenter(from);
    const end = getCellCenter(to);
    if (!start || !end) return;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const offsetX = (-dy / len) * curve;
    const offsetY = (dx / len) * curve;
    const controlX = midX + offsetX;
    const controlY = midY + offsetY;
    const lineWidth = Math.max(2, Math.min(4, width / 160));
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(end.y - controlY, end.x - controlX);
    const headLen = lineWidth * 3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  Object.entries(ladders).forEach(([from, to]) => {
    drawArrow(Number(from), Number(to), "#2f8f7a", 0);
  });

  Object.entries(snakes).forEach(([from, to], index) => {
    drawArrow(Number(from), Number(to), "#b6483d", -(12 + index * 2));
  });
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

  gameState.players = players;
  gameState.positions = players.map(() => 1);
  gameState.currentPlayer = 0;
  gameState.isMoving = false;
  gameState.started = true;

  elements.startGame.disabled = true;
  elements.setupError.textContent = "";
  elements.setupPanel.classList.add("hidden");
  elements.setupPanel.hidden = true;
  elements.gamePanel.classList.remove("hidden");
  elements.gamePanel.hidden = false;
  elements.rollDice.disabled = false;
  elements.moveLog.innerHTML = "";
  elements.restart.classList.remove("hidden");
  elements.restart.hidden = false;

  renderTokens();
  updateCurrentPlayer();
  logMove("Game started. All players begin on square 1.");
  updateBoardSize();
  setTimeout(updateBoardSize, 50);
  setTimeout(updateBoardSize, 250);
  requestAnimationFrame(drawConnections);
  setTimeout(drawConnections, 100);
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
    setDiceFace(tempRoll);
    await sleep(rollInterval);
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  setDiceFace(roll);
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

  let newPos = currentPos;
  for (let step = 0; step < steps; step += 1) {
    newPos += 1;
    gameState.positions[playerIndex] = newPos;
    renderTokens();
    await sleep(250);
  }

  logMove(`${player.name} moved: ${currentPos} -> ${newPos}`);

  const result = applySnakesAndLadders(newPos);
  if (result.to !== newPos) {
    await sleep(500);
    gameState.positions[playerIndex] = result.to;
    renderTokens();
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

function declareWinner(player) {
  gameState.isMoving = false;
  elements.rollDice.disabled = true;
  elements.winnerText.textContent = `${player.name} wins!`;
  elements.winnerBanner.classList.remove("hidden");
  logMove(`${player.name} reached 100 and won the game.`);
}

function resetGame() {
  gameState.players = [];
  gameState.positions = [];
  gameState.currentPlayer = 0;
  gameState.isMoving = false;
  gameState.started = false;

  elements.setupPanel.classList.remove("hidden");
  elements.setupPanel.hidden = false;
  elements.setupPanel.style.display = "block";
  elements.gamePanel.classList.add("hidden");
  elements.gamePanel.hidden = true;
  elements.gamePanel.style.display = "none";
  elements.winnerBanner.classList.add("hidden");
  elements.winnerBanner.hidden = true;
  elements.winnerBanner.style.display = "none";
  elements.rollDice.disabled = true;
  elements.restart.classList.add("hidden");
  elements.restart.hidden = true;
  elements.startGame.disabled = false;
}

function setDiceFace(value) {
  if (!elements.diceImage) return;
  if (value) {
    elements.diceImage.src = `Dice/${value}.png`;
    elements.diceImage.alt = `Dice showing ${value}`;
  } else {
    elements.diceImage.src = "Dice/dice.jpg";
    elements.diceImage.alt = "Dice showing -";
  }
}

function wireEvents() {
  elements.playerCount.addEventListener("input", (event) => {
    const count = Math.min(10, Math.max(1, Number(event.target.value || 1)));
    updatePlayerInputs(count);
  });

  elements.startGame.addEventListener("click", startGame);
  elements.rollDice.addEventListener("click", rollDice);
  elements.winnerRestart.addEventListener("click", resetGame);
  elements.restart.addEventListener("click", (event) => {
    event.preventDefault();
    resetGame();
  });
}

function init() {
  cacheElements();
  buildBoard();
  updatePlayerInputs(Number(elements.playerCount.value));
  wireEvents();
  initUIState();
  updateBoardSize();
  window.addEventListener("resize", updateBoardSize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateBoardSize);
  }
  window.addEventListener("load", updateBoardSize);
  setTimeout(updateBoardSize, 50);
  setTimeout(updateBoardSize, 250);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
