// ── AI MODULE ──

// ── TTT AI (minimax) ──
function aiTTTMove(gs) {
  if (gs.winner || gs.turn !== 'O') return;
  const move = bestTTTMove(gs);
  if (move !== -1) applyTTTMove(gs, move, true);
}

function bestTTTMove(gs) {
  // Try win first
  for (let i = 0; i < 9; i++) {
    if (gs.board[i]) continue;
    const t = testTTTMove(gs, i, 'O');
    if (t.winner === 'O') return i;
  }
  // Block X win
  for (let i = 0; i < 9; i++) {
    if (gs.board[i]) continue;
    const t = testTTTMove(gs, i, 'X');
    if (t.winner === 'X') return i;
  }
  // Center
  if (!gs.board[4]) return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => !gs.board[i]);
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
  // Any
  const avail = gs.board.map((v,i)=>v?-1:i).filter(i=>i!==-1);
  return avail.length ? avail[Math.floor(Math.random()*avail.length)] : -1;
}

function testTTTMove(gs, idx, sym) {
  const board = [...gs.board];
  const moveOrder = [...(gs.moveOrder||[])];
  const symMoves = moveOrder.filter(m=>m.sym===sym);
  if (symMoves.length>=3) {
    board[symMoves[0].idx]=null;
  }
  board[idx]=sym;
  let winner=null;
  const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(const[a,b,c]of wins){if(board[a]&&board[a]===board[b]&&board[a]===board[c]){winner=board[a];break;}}
  return {winner};
}

// ── CHESS AI (simple evaluation + random) ──
function aiChessMove(gs) {
  if (!gs || gs.status==='checkmate'||gs.status==='stalemate') return gs;
  const ng = JSON.parse(JSON.stringify(gs));
  const color = 'black';

  // Collect all legal moves
  const moves = [];
  for (let from=0; from<64; from++) {
    const p=ng.board[from]; if(!p) continue;
    if(p[0]!=='b') continue;
    const legal = getLegal(ng, from);
    legal.forEach(to => moves.push({from,to}));
  }
  if (!moves.length) return ng;

  // Score each move
  const scored = moves.map(mv => {
    const test = JSON.parse(JSON.stringify(ng));
    const applied = applyMove(test, mv.from, mv.to);
    return { mv, score: evalChess(applied, color) };
  });
  scored.sort((a,b) => b.score - a.score);

  // Pick best or random among top 3
  const top = scored.slice(0, Math.min(3, scored.length));
  const chosen = top[Math.floor(Math.random()*top.length)];
  const result = applyMove(ng, chosen.mv.from, chosen.mv.to);

  // Auto-promote to queen
  if (result.promotionPending) {
    result.board[result.promotionPending.sq] = 'bQ';
    result.promotionPending = null;
    result.turn = 'white';
    updateChessStatus(result);
  }
  return result;
}

const PIECE_VALUES = {P:1,N:3,B:3,R:5,Q:9,K:100};
function evalChess(gs, color) {
  let score = 0;
  gs.board.forEach(p => {
    if(!p) return;
    const v = PIECE_VALUES[p[1]] || 0;
    if(p[0]==='b') score += v; else score -= v;
  });
  // Prefer checkmate / check
  if(gs.status==='checkmate'&&gs.turn==='white') score+=1000;
  if(gs.status==='check') score+=5;
  return score;
}
