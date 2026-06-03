// ── TTT MODULE ──
// Rules: jika sudah ada 3 simbol, yang pertama hilang (oldest-move rule)
let tttRef = null;
let tttUnsub = null;
let myTTTSym = null;
let tttOffline = false;
let tttAI = false;
let tttTimerInterval = null;

const TTT_WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// ── Build TTT grid ──
function buildTTTGrid() {
  const grid = id('ttt-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'ttt-cell';
    cell.dataset.i = i;
    cell.addEventListener('click', () => onTTTClick(i));
    grid.appendChild(cell);
  }
}

// ── ONLINE TTT ──
function initTTTOnline(room) {
  tttOffline = false; tttAI = false;
  myTTTSym = currentUser.uid === room.gameState.playerX ? 'X' : 'O';
  showScreen('ttt');
  buildTTTGrid();
  renderTTT(room.gameState, room.timeLimit);

  tttRef = db.ref('rooms/' + currentRoomCode + '/gameState');
  if (tttUnsub) tttRef.off('value', tttUnsub);
  tttUnsub = tttRef.on('value', snap => {
    const gs = snap.val();
    if (!gs) return;
    renderTTT(gs, gs.timeLimit);
    runTTTTimer(gs);
  });
}

// ── OFFLINE TTT (vs AI or local 2P) ──
function initTTTOffline(vsAI = true) {
  tttOffline = true; tttAI = vsAI;
  myTTTSym = 'X';
  showScreen('ttt');
  buildTTTGrid();
  const pName = getGamertag() || 'Kamu';
  const gs = {
    board: Array(9).fill(null),
    moveOrder: [], // track order of moves per symbol
    turn: 'X', winner: null, winCells: null,
    scores: { X: 0, O: 0, draws: 0 },
    playerX: 'local_x', playerXName: pName,
    playerO: 'local_o', playerOName: vsAI ? '🤖 AI' : 'Pemain O',
    timeLimit: 0, timerX: 0, timerO: 0,
    moveCount: 0, moveHistory: []
  };
  window._tttGs = gs;
  renderTTT(gs, 0);
}

// ── RENDER ──
function renderTTT(gs, timeLimit) {
  id('ttt-nx').textContent = gs.playerXName || 'X';
  id('ttt-no').textContent = gs.playerOName || 'O';
  id('ttt-vx').textContent = gs.scores.X;
  id('ttt-vo').textContent = gs.scores.O;
  id('ttt-draws').textContent = gs.scores.draws;

  // Render cells
  const cells = document.querySelectorAll('.ttt-cell');
  cells.forEach((cell, i) => {
    const val = gs.board[i];
    cell.className = 'ttt-cell';
    cell.textContent = '';
    if (val === 'X') { cell.classList.add('X'); cell.textContent = '✕'; }
    else if (val === 'O') { cell.classList.add('O'); cell.textContent = '⭕'; }

    // Mark "gone" (oldest move about to disappear) 
    const moveOrder = gs.moveOrder || [];
    const xMoves = moveOrder.filter(m => m.sym === 'X');
    const oMoves = moveOrder.filter(m => m.sym === 'O');
    if (xMoves.length >= 3 && val === 'X' && xMoves[0].idx === i) cell.classList.add('gone');
    if (oMoves.length >= 3 && val === 'O' && oMoves[0].idx === i) cell.classList.add('gone');

    // Win highlight
    if (gs.winCells && gs.winCells.includes(i)) cell.classList.add('winner');

    // Lock cells
    const isMyTurn = tttOffline
      ? (!tttAI || gs.turn === 'X')
      : gs.turn === myTTTSym;
    const canClick = !gs.winner && isMyTurn && !val && !gs.winCells;
    if (!canClick) cell.classList.add('locked');
  });

  // Active card
  id('ttt-sc-x').classList.toggle('active', gs.turn === 'X' && !gs.winner);
  id('ttt-sc-o').classList.toggle('active', gs.turn === 'O' && !gs.winner);

  // Status
  const st = id('ttt-status');
  st.className = 'ttt-status';
  if (gs.winner === 'draw') {
    st.textContent = '🤝 Seri!'; st.classList.add('draw');
    showResult('draw', null);
  } else if (gs.winner) {
    const wName = gs.winner === 'X' ? gs.playerXName : gs.playerOName;
    st.textContent = `🏆 ${wName} Menang!`;
    st.classList.add(gs.winner === myTTTSym ? 'win' : 'lose');
    showResult(gs.winner === myTTTSym ? 'win' : (myTTTSym ? 'lose' : 'win'), wName + ' Menang!');
  } else {
    const turnName = gs.turn === 'X' ? gs.playerXName : gs.playerOName;
    const isMe = tttOffline ? gs.turn === myTTTSym : gs.turn === myTTTSym;
    st.textContent = isMe ? `Giliran kamu (${gs.turn})` : `Giliran ${turnName}`;
  }

  // Timers
  if (timeLimit > 0) {
    updateTimerDisplay('x', gs.timerX || 0, timeLimit);
    updateTimerDisplay('o', gs.timerO || 0, timeLimit);
  } else {
    id('timer-txt-x').textContent = '';
    id('timer-txt-o').textContent = '';
  }
}

// ── CLICK ──
function onTTTClick(i) {
  if (tttOffline) {
    const gs = window._tttGs;
    if (!gs || gs.winner || gs.board[i]) return;
    if (tttAI && gs.turn !== 'X') return;
    applyTTTMove(gs, i, true);
    if (tttAI && !gs.winner) setTimeout(() => aiTTTMove(gs), 400);
  } else {
    if (!tttRef || myRole === 'spectator') return;
    tttRef.once('value').then(snap => {
      const gs = snap.val();
      if (!gs || gs.winner || gs.board[i]) return;
      if (gs.turn !== myTTTSym) { toast('Bukan giliran kamu!'); return; }
      applyTTTMoveOnline(gs, i);
    });
  }
}

function applyTTTMove(gs, i, rerender = false) {
  // Sliding window: if already 3 of this sym, remove oldest
  const sym = gs.turn;
  if (!gs.moveOrder) gs.moveOrder = [];
  const symMoves = gs.moveOrder.filter(m => m.sym === sym);
  if (symMoves.length >= 3) {
    const oldest = symMoves[0];
    gs.board[oldest.idx] = null;
    gs.moveOrder = gs.moveOrder.filter(m => !(m.sym === sym && m.idx === oldest.idx));
  }
  gs.board[i] = sym;
  gs.moveOrder.push({ sym, idx: i });

  // Check win
  let winner = null; let winCells = null;
  for (const combo of TTT_WINS) {
    const [a,b,c] = combo;
    if (gs.board[a] && gs.board[a] === gs.board[b] && gs.board[a] === gs.board[c]) {
      winner = gs.board[a]; winCells = combo; break;
    }
  }
  const full = gs.board.every(c => c !== null);
  if (!winner && full) winner = 'draw';

  gs.winner = winner; gs.winCells = winCells;
  if (winner === 'X') gs.scores.X++;
  else if (winner === 'O') gs.scores.O++;
  else if (winner === 'draw') gs.scores.draws++;

  gs.turn = sym === 'X' ? 'O' : 'X';
  gs.moveCount = (gs.moveCount || 0) + 1;
  window._tttGs = gs;
  if (rerender) renderTTT(gs, 0);
}

function applyTTTMoveOnline(gs, i) {
  const sym = gs.turn;
  if (!gs.moveOrder) gs.moveOrder = [];
  const symMoves = gs.moveOrder.filter(m => m.sym === sym);
  let updates = { ...gs };

  if (symMoves.length >= 3) {
    const oldest = symMoves[0];
    updates.board = [...gs.board];
    updates.board[oldest.idx] = null;
    updates.moveOrder = gs.moveOrder.filter(m => !(m.sym === sym && m.idx === oldest.idx));
  } else {
    updates.board = [...gs.board];
    updates.moveOrder = [...gs.moveOrder];
  }
  updates.board[i] = sym;
  updates.moveOrder.push({ sym, idx: i });

  let winner = null; let winCells = null;
  for (const combo of TTT_WINS) {
    const [a,b,c] = combo;
    if (updates.board[a] && updates.board[a] === updates.board[b] && updates.board[a] === updates.board[c]) {
      winner = updates.board[a]; winCells = combo; break;
    }
  }
  const full = updates.board.every(c => c !== null);
  if (!winner && full) winner = 'draw';

  updates.winner = winner; updates.winCells = winCells;
  updates.scores = { ...gs.scores };
  if (winner === 'X') updates.scores.X++;
  else if (winner === 'O') updates.scores.O++;
  else if (winner === 'draw') updates.scores.draws++;

  updates.turn = sym === 'X' ? 'O' : 'X';
  updates.moveCount = (gs.moveCount || 0) + 1;
  updates.lastTickAt = Date.now();
  tttRef.set(updates);
}

// ── TIMER ──
function runTTTTimer(gs) {
  stopGameTimers();
  if (!gs.timeLimit || gs.winner) return;
  tttTimerInterval = setInterval(() => {
    tttRef && tttRef.once('value').then(snap => {
      const g = snap.val();
      if (!g || g.winner) { clearInterval(tttTimerInterval); return; }
      const elapsed = (Date.now() - (g.lastTickAt || Date.now())) / 1000;
      const key = g.turn === 'X' ? 'timerX' : 'timerO';
      const remaining = Math.max(0, (g[key] || g.timeLimit) - elapsed);
      updateTimerDisplay(g.turn === 'X' ? 'x' : 'o', remaining, g.timeLimit);
      if (remaining <= 0 && isHost) {
        // Time up → other player wins
        const winner = g.turn === 'X' ? 'O' : 'X';
        const sc = { ...g.scores };
        if (winner === 'X') sc.X++; else sc.O++;
        tttRef.update({ winner, winCells: null, scores: sc, timerX: g.timerX, timerO: g.timerO });
        clearInterval(tttTimerInterval);
      }
    });
  }, 1000);
}

function updateTimerDisplay(sym, secs, total) {
  const arc = id('timer-arc-' + sym);
  const txt = id('timer-txt-' + sym);
  if (!arc || !txt) return;
  const pct = total > 0 ? secs / total : 1;
  const dash = 94.2;
  arc.style.strokeDashoffset = dash * (1 - pct);
  txt.textContent = fmtTime(Math.ceil(secs));
  arc.style.stroke = secs < 30 ? '#ff6b6b' : secs < 60 ? '#ffd93d' : '#4affcb';
}

function fmtTime(s) {
  if (s <= 0) return '0:00';
  const m = Math.floor(s/60), sec = s%60;
  return m + ':' + String(sec).padStart(2,'0');
}

function stopGameTimers() {
  if (tttTimerInterval) { clearInterval(tttTimerInterval); tttTimerInterval = null; }
}

// ── PLAY AGAIN ──
function playAgain() {
  id('result-overlay').classList.add('hidden');
  if (tttOffline) {
    const gs = window._tttGs;
    if (!gs) return;
    gs.board = Array(9).fill(null);
    gs.moveOrder = [];
    gs.turn = 'X'; gs.winner = null; gs.winCells = null;
    window._tttGs = gs;
    renderTTT(gs, 0);
    if (tttAI && gs.turn === 'O') setTimeout(() => aiTTTMove(gs), 400);
  } else if (isHost) {
    hostRestartGame();
  }
}
