// ── CHESS MODULE ──
const PC = {wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};
let chessRef = null; let chessUnsub = null;
let myChessColor = null;
let selSq = null; let validCache = [];
let chessOffline = false; let chessAI = false;
let chessTimerInterval = null;

function initialChessBoard() {
  return [
    'bR','bN','bB','bQ','bK','bB','bN','bR',
    'bP','bP','bP','bP','bP','bP','bP','bP',
    ...Array(32).fill(null),
    'wP','wP','wP','wP','wP','wP','wP','wP',
    'wR','wN','wB','wQ','wK','wB','wN','wR',
  ];
}

// ── INIT ONLINE ──
function initChessOnline(room) {
  chessOffline = false; chessAI = false;
  const gs = room.gameState;
  myChessColor = currentUser.uid === gs.playerW ? 'white' : 'black';
  showScreen('chess');
  id('chess-name-w').textContent = gs.playerWName || 'Putih';
  id('chess-name-b').textContent = gs.playerBName || 'Hitam';
  renderChess(gs);

  chessRef = db.ref('rooms/' + currentRoomCode + '/gameState');
  if (chessUnsub) chessRef.off('value', chessUnsub);
  chessUnsub = chessRef.on('value', snap => {
    const g = snap.val(); if (!g) return;
    selSq = null; validCache = [];
    renderChess(g);
    runChessTimer(g);
  });
}

// ── INIT OFFLINE ──
function initChessOffline(vsAI = true) {
  chessOffline = true; chessAI = vsAI;
  myChessColor = 'white';
  showScreen('chess');
  const pName = getGamertag() || 'Kamu';
  const gs = {
    board: initialChessBoard(),
    turn: 'white', status: 'playing',
    capturedW: [], capturedB: [], moveHistory: [],
    enPassant: null, castling: {wK:true,wQ:true,bK:true,bQ:true},
    playerW: 'local_w', playerWName: pName,
    playerB: 'local_b', playerBName: vsAI ? '🤖 AI' : 'Pemain Hitam',
    timeLimit: 0, timerW: 0, timerB: 0,
    lastMove: null, promotionPending: null
  };
  window._chessGs = gs;
  id('chess-name-w').textContent = gs.playerWName;
  id('chess-name-b').textContent = gs.playerBName;
  renderChess(gs);
}

// ── RENDER BOARD ──
function renderChess(gs) {
  const board = id('chess-board');
  board.innerHTML = '';
  const flip = myChessColor === 'black';

  for (let vr = 0; vr < 8; vr++) {
    for (let vc = 0; vc < 8; vc++) {
      const r = flip ? 7-vr : vr;
      const c = flip ? 7-vc : vc;
      const idx = r*8+c;
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((r+c)%2===0?'lt':'dk');
      sq.dataset.i = idx;

      if (c===0) { const lbl=document.createElement('span'); lbl.className='rl'; lbl.textContent=8-r; sq.appendChild(lbl); }
      if (r===7) { const lbl=document.createElement('span'); lbl.className='rf'; lbl.textContent='abcdefgh'[c]; sq.appendChild(lbl); }

      if (gs.lastMove) {
        if (idx===gs.lastMove.from) sq.classList.add('lm-f');
        if (idx===gs.lastMove.to)   sq.classList.add('lm-t');
      }
      if ((gs.status==='check'||gs.status==='checkmate') && gs.board[idx]===(gs.turn==='white'?'wK':'bK')) sq.classList.add('chk');
      if (selSq===idx) sq.classList.add('sel');
      if (validCache.includes(idx)) sq.classList.add(gs.board[idx]?'vc':'vm');

      if (gs.board[idx]) {
        const pc = document.createElement('span');
        pc.className = 'cp';
        pc.textContent = PC[gs.board[idx]] || '';
        sq.appendChild(pc);
      }
      sq.addEventListener('click', () => onChessSqClick(idx, gs));
      board.appendChild(sq);
    }
  }

  // Status
  const st = id('chess-status');
  st.className = 'chess-status';
  if (gs.status==='checkmate') {
    const winner = gs.turn==='white'?'Hitam':'Putih';
    st.textContent = `♟ Skakmat! ${winner} Menang!`; st.classList.add('mat');
    const isWin = (gs.turn==='white' && myChessColor==='black') || (gs.turn==='black' && myChessColor==='white');
    showResult(isWin?'win':'lose', winner+' Menang!');
  } else if (gs.status==='stalemate') {
    st.textContent = '🤝 Pat! Seri!'; showResult('draw', 'Pat');
  } else if (gs.status==='check') {
    st.textContent = `⚠️ Skak! Giliran ${gs.turn==='white'?'Putih':'Hitam'}`; st.classList.add('chk');
  } else {
    const isMe = chessOffline ? true : gs.turn===myChessColor;
    st.textContent = isMe && gs.turn===myChessColor ? `Giliran kamu (${gs.turn==='white'?'Putih':'Hitam'})` : `Giliran ${gs.turn==='white'?'Putih':'Hitam'}`;
  }

  // Turn badge
  id('chess-turn-badge') && (id('chess-turn-badge').textContent = gs.turn==='white'?'Giliran: Putih':'Giliran: Hitam');
  id('chess-bar-top').classList.toggle('active', gs.turn==='black');
  id('chess-bar-bot').classList.toggle('active', gs.turn==='white');

  // History
  const hist = id('chess-hist'); hist.innerHTML = '';
  (gs.moveHistory||[]).forEach(m => { const s=document.createElement('span'); s.className='cm'; s.textContent=m; hist.appendChild(s); });
  hist.scrollLeft = hist.scrollWidth;

  // Captured
  id('chess-caps-w').textContent = (gs.capturedW||[]).map(p=>PC[p]||'').join('');
  id('chess-caps-b').textContent = (gs.capturedB||[]).map(p=>PC[p]||'').join('');

  // Timers
  if (gs.timeLimit > 0) {
    id('chess-timer-w').textContent = fmtTime(Math.ceil(gs.timerW||0));
    id('chess-timer-b').textContent = fmtTime(Math.ceil(gs.timerB||0));
    id('chess-timer-w').classList.toggle('low', (gs.timerW||0) < 30);
    id('chess-timer-b').classList.toggle('low', (gs.timerB||0) < 30);
  } else {
    id('chess-timer-w').textContent = '--:--';
    id('chess-timer-b').textContent = '--:--';
  }
}

// ── CLICK HANDLER ──
function onChessSqClick(idx, gs) {
  if (gs.status==='checkmate'||gs.status==='stalemate') return;
  const isMyTurn = chessOffline ? (!chessAI||gs.turn==='white') : gs.turn===myChessColor;
  if (!isMyTurn && myRole!=='spectator') { if(!chessOffline) toast('Bukan giliran kamu!'); return; }
  if (myRole==='spectator') return;

  const piece = gs.board[idx];
  if (selSq===null) {
    if (!piece) return;
    const pc = piece[0]==='w'?'white':'black';
    if (pc!==gs.turn) return;
    selSq = idx; validCache = getLegal(gs, idx);
    renderChess(gs);
  } else {
    if (idx===selSq) { selSq=null; validCache=[]; renderChess(gs); return; }
    if (piece && (piece[0]==='w')===(gs.turn==='white')) { selSq=idx; validCache=getLegal(gs,idx); renderChess(gs); return; }
    if (validCache.includes(idx)) {
      chessOffline ? doChessMoveOffline(gs, selSq, idx) : doChessMoveOnline(gs, selSq, idx);
    }
    selSq=null; validCache=[];
  }
}

function doChessMoveOffline(gs, from, to) {
  const ng = applyMove(JSON.parse(JSON.stringify(gs)), from, to);
  if (ng.promotionPending) { showPromo(ng.promotionPending.color, to, true); window._chessGs=ng; return; }
  window._chessGs = ng;
  renderChess(ng);
  if (chessAI && !ng.winner && ng.status!=='checkmate' && ng.turn==='black') {
    setTimeout(() => { const ag=aiChessMove(window._chessGs); window._chessGs=ag; renderChess(ag); }, 500);
  }
}

function doChessMoveOnline(gs, from, to) {
  const ng = applyMove(JSON.parse(JSON.stringify(gs)), from, to);
  ng.lastTickAt = Date.now();
  if (ng.promotionPending) { showPromo(ng.promotionPending.color, to, false); chessRef.set(ng); return; }
  chessRef.set(ng);
}

// ── APPLY MOVE ──
function applyMove(gs, from, to) {
  const piece = gs.board[from];
  const cap   = gs.board[to];
  const type  = piece[1];
  const color = piece[0]==='w'?'white':'black';

  if (cap) { color==='white' ? gs.capturedW.push(cap) : gs.capturedB.push(cap); }

  // En passant
  if (type==='P' && to===gs.enPassant) {
    const epR = color==='white' ? Math.floor(to/8)+1 : Math.floor(to/8)-1;
    const epI = epR*8+(to%8);
    const epc = gs.board[epI];
    if (epc) { color==='white' ? gs.capturedW.push(epc) : gs.capturedB.push(epc); }
    gs.board[epI] = null;
  }

  gs.board[to] = piece; gs.board[from] = null;
  gs.enPassant = null;

  if (type==='P') {
    if (Math.abs(Math.floor(to/8)-Math.floor(from/8))===2) gs.enPassant = from+(to-from)/2;
  }
  if (type==='K') {
    const dc=(to%8)-(from%8);
    if (dc===2)  { gs.board[to-1]=piece[0]+'R'; gs.board[to+1]=null; }
    if (dc===-2) { gs.board[to+1]=piece[0]+'R'; gs.board[to-2]=null; }
    color==='white' ? (gs.castling.wK=false,gs.castling.wQ=false) : (gs.castling.bK=false,gs.castling.bQ=false);
  }
  if (type==='R') {
    if(from===63)gs.castling.wK=false; if(from===56)gs.castling.wQ=false;
    if(from===7) gs.castling.bK=false; if(from===0) gs.castling.bQ=false;
  }

  // Notation
  const files='abcdefgh';
  const fn = files[from%8]+(8-Math.floor(from/8));
  const tn = files[to%8]+(8-Math.floor(to/8));
  gs.moveHistory.push((PC[piece]||'')+fn+(cap?'x':'-')+tn);
  gs.lastMove = {from,to};

  // Promotion check
  if (type==='P') {
    const tr = Math.floor(to/8);
    if ((color==='white'&&tr===0)||(color==='black'&&tr===7)) {
      gs.promotionPending={color,sq:to}; return gs;
    }
  }

  gs.turn = color==='white'?'black':'white';
  updateChessStatus(gs);
  return gs;
}

function updateChessStatus(gs) {
  const opp = gs.turn;
  if (isInCheck(gs,opp)) {
    gs.status = hasLegal(gs,opp)?'check':'checkmate';
  } else {
    gs.status = hasLegal(gs,opp)?'playing':'stalemate';
  }
}

// ── MOVE GENERATION ──
function getLegal(gs,from) {
  return getPseudo(gs,from).filter(to => {
    const ng=JSON.parse(JSON.stringify(gs));
    const p=ng.board[from]; ng.board[to]=p; ng.board[from]=null;
    return !isInCheck(ng,p[0]==='w'?'white':'black');
  });
}
function hasLegal(gs,color) {
  for(let i=0;i<64;i++){
    if(!gs.board[i])continue;
    const pc=gs.board[i][0]==='w'?'white':'black';
    if(pc!==color)continue;
    if(getLegal(gs,i).length>0)return true;
  }
  return false;
}
function isInCheck(gs,color) {
  const king=color==='white'?'wK':'bK';
  const ki=gs.board.indexOf(king);
  if(ki===-1)return false;
  const opp=color==='white'?'black':'white';
  for(let i=0;i<64;i++){
    if(!gs.board[i])continue;
    const pc=gs.board[i][0]==='w'?'white':'black';
    if(pc!==opp)continue;
    if(getPseudo(gs,i).includes(ki))return true;
  }
  return false;
}
function getPseudo(gs,from) {
  const p=gs.board[from]; if(!p)return[];
  const t=p[1],c=p[0]==='w'?'white':'black',r=Math.floor(from/8),col=from%8;
  if(t==='P')return pawnMoves(gs,from,r,col,c);
  if(t==='N')return knightMoves(gs,r,col,c);
  if(t==='B')return slideMoves(gs,r,col,c,[[1,1],[1,-1],[-1,1],[-1,-1]]);
  if(t==='R')return slideMoves(gs,r,col,c,[[1,0],[-1,0],[0,1],[0,-1]]);
  if(t==='Q')return slideMoves(gs,r,col,c,[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]);
  if(t==='K')return kingMoves(gs,from,r,col,c);
  return[];
}
function pawnMoves(gs,from,r,col,c) {
  const m=[],d=c==='white'?-1:1,sr=c==='white'?6:1;
  const r1=r+d;
  if(r1>=0&&r1<8&&!gs.board[r1*8+col]){m.push(r1*8+col);if(r===sr&&!gs.board[(r1+d)*8+col])m.push((r1+d)*8+col);}
  for(const dc of[-1,1]){const nc=col+dc;if(nc<0||nc>7)continue;const ni=r1*8+nc;if(gs.board[ni]&&(gs.board[ni][0]==='w')!==(c==='white'))m.push(ni);if(ni===gs.enPassant)m.push(ni);}
  return m;
}
function knightMoves(gs,r,col,c) {
  const m=[];
  for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=col+dc;if(nr<0||nr>7||nc<0||nc>7)continue;const ni=nr*8+nc;if(gs.board[ni]&&(gs.board[ni][0]==='w')===(c==='white'))continue;m.push(ni);}
  return m;
}
function slideMoves(gs,r,col,c,dirs) {
  const m=[];
  for(const[dr,dc]of dirs){let nr=r+dr,nc=col+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){const ni=nr*8+nc;if(gs.board[ni]){if((gs.board[ni][0]==='w')!==(c==='white'))m.push(ni);break;}m.push(ni);nr+=dr;nc+=dc;}}
  return m;
}
function kingMoves(gs,from,r,col,c) {
  const m=[];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=r+dr,nc=col+dc;if(nr<0||nr>7||nc<0||nc>7)continue;const ni=nr*8+nc;if(gs.board[ni]&&(gs.board[ni][0]==='w')===(c==='white'))continue;m.push(ni);}
  const ca=gs.castling;
  if(c==='white'&&r===7&&col===4){if(ca.wK&&!gs.board[61]&&!gs.board[62]&&gs.board[63]==='wR')m.push(62);if(ca.wQ&&!gs.board[59]&&!gs.board[58]&&!gs.board[57]&&gs.board[56]==='wR')m.push(58);}
  if(c==='black'&&r===0&&col===4){if(ca.bK&&!gs.board[5]&&!gs.board[6]&&gs.board[7]==='bR')m.push(6);if(ca.bQ&&!gs.board[3]&&!gs.board[2]&&!gs.board[1]&&gs.board[0]==='bR')m.push(2);}
  return m;
}

// ── PROMOTION ──
function showPromo(color, sq, offline) {
  const prefix = color==='white'?'w':'b';
  const opts = ['Q','R','B','N'];
  const box = id('promo-opts'); box.innerHTML='';
  opts.forEach(p => {
    const btn=document.createElement('div');
    btn.className='promo-pc'; btn.textContent=PC[prefix+p];
    btn.onclick=()=>doPromo(prefix+p,sq,offline);
    box.appendChild(btn);
  });
  id('promo-modal').classList.remove('hidden');
}
function doPromo(piece,sq,offline) {
  id('promo-modal').classList.add('hidden');
  if (offline) {
    const gs=window._chessGs;
    gs.board[sq]=piece; gs.promotionPending=null;
    gs.turn=piece[0]==='w'?'black':'white';
    updateChessStatus(gs);
    window._chessGs=gs; renderChess(gs);
    if(chessAI&&gs.turn==='black')setTimeout(()=>{const ag=aiChessMove(window._chessGs);window._chessGs=ag;renderChess(ag);},500);
  } else {
    chessRef.once('value').then(snap=>{
      const gs=snap.val(); if(!gs||!gs.promotionPending)return;
      const ng=JSON.parse(JSON.stringify(gs));
      ng.board[sq]=piece; ng.promotionPending=null;
      ng.turn=piece[0]==='w'?'black':'white';
      updateChessStatus(ng); ng.lastTickAt=Date.now();
      chessRef.set(ng);
    });
  }
}

// ── CHESS TIMER ──
function runChessTimer(gs) {
  clearInterval(chessTimerInterval);
  if(!gs.timeLimit||gs.status==='checkmate'||gs.status==='stalemate')return;
  chessTimerInterval=setInterval(()=>{
    chessRef&&chessRef.once('value').then(snap=>{
      const g=snap.val();if(!g||g.status==='checkmate'||g.status==='stalemate'){clearInterval(chessTimerInterval);return;}
      const k=g.turn==='white'?'timerW':'timerB';
      const elapsed=(Date.now()-(g.lastTickAt||Date.now()))/1000;
      const rem=Math.max(0,(g[k]||g.timeLimit)-elapsed);
      id('chess-timer-'+( g.turn==='white'?'w':'b')).textContent=fmtTime(Math.ceil(rem));
      if(rem<=0&&isHost){
        const winner=g.turn==='white'?'black':'white';
        chessRef.update({status:'checkmate',turn:g.turn==='white'?'white':'black'});
        clearInterval(chessTimerInterval);
      }
    });
  },1000);
}

function exitGame() {
  selSq=null;validCache=[];
  stopGameTimers();
  if(chessTimerInterval){clearInterval(chessTimerInterval);chessTimerInterval=null;}
  if(chessRef&&chessUnsub){chessRef.off('value',chessUnsub);chessRef=null;chessUnsub=null;}
  if(tttRef&&tttUnsub){tttRef.off('value',tttUnsub);tttRef=null;tttUnsub=null;}
  if(currentRoomCode) leaveRoom(); else showScreen('lobby');
  id('result-overlay').classList.add('hidden');
}

function toggleChat() {
  const fc=id('float-chat')||id('float-chat-chess');
  if(fc)fc.classList.toggle('hidden');
}
