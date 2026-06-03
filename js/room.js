// ── ROOM MODULE ──
let currentRoomCode = null;
let isHost = false;
let myRole = 'player'; // player | spectator
let roomRef = null;
let roomUnsub = null;
let chatRef = null;
let chatUnsub = null;

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join('');
}

function openCreateModal() {
  if (!currentUser) { toast('Login dulu!'); return; }
  id('modal-create').classList.remove('hidden');
  id('c-name').value = (getGamertag() || 'Room') + "'s Room";
}
function openJoinModal() {
  if (!currentUser || currentUser.isOffline) { toast('Login untuk main online!'); return; }
  id('modal-join').classList.remove('hidden');
  id('j-code').value = '';
  id('j-err').textContent = '';
}

function createRoom() {
  if (!db) { toast('Firebase belum dikonfigurasi!'); return; }
  const name     = id('c-name').value.trim() || 'Game Room';
  const game     = document.querySelector('input[name="c-game"]:checked').value;
  const timeLimit = +document.querySelector('input[name="c-time"]:checked').value;
  const code     = genCode();

  const data = {
    code, name, game, timeLimit,
    hostRole: 'player',
    status: 'waiting',
    createdAt: Date.now(),
    players: {
      [currentUser.uid]: {
        uid: currentUser.uid,
        name: getGamertag() || currentUser.displayName || 'Host',
        role: 'host',
        playRole: 'player',
        joinedAt: Date.now()
      }
    },
    gameState: null
  };

  db.ref('rooms/' + code).set(data)
    .then(() => { closeModal('modal-create'); currentRoomCode = code; isHost = true; myRole = 'player'; enterRoomScreen(code, data); })
    .catch(e => toast('Gagal buat room: ' + e.message));
}

function joinRoom() {
  const code = id('j-code').value.trim().toUpperCase();
  const err  = id('j-err');
  if (code.length !== 6) { err.textContent = 'Kode harus 6 karakter!'; return; }
  err.textContent = 'Mencari...';
  db.ref('rooms/' + code).once('value').then(snap => {
    const room = snap.val();
    if (!room)                 { err.textContent = 'Room tidak ditemukan!'; return; }
    if (room.status === 'playing') { err.textContent = 'Game sedang berlangsung!'; return; }
    const players = room.players || {};
    const uids = Object.keys(players);
    if (uids.includes(currentUser.uid)) {
      err.textContent = '';
      closeModal('modal-join');
      currentRoomCode = code; isHost = false; myRole = players[currentUser.uid].playRole || 'player';
      enterRoomScreen(code, room); return;
    }
    const playerCount = uids.filter(u => players[u].playRole === 'player').length;
    const maxPlayers = 2;
    db.ref('rooms/' + code + '/players/' + currentUser.uid).set({
      uid: currentUser.uid,
      name: getGamertag() || currentUser.displayName || 'Guest',
      role: 'guest',
      playRole: playerCount < maxPlayers ? 'player' : 'spectator',
      joinedAt: Date.now()
    }).then(() => {
      err.textContent = '';
      closeModal('modal-join');
      currentRoomCode = code; isHost = false; myRole = playerCount < maxPlayers ? 'player' : 'spectator';
      enterRoomScreen(code, room);
    });
  }).catch(e => { err.textContent = 'Error: ' + e.message; });
}

function enterRoomScreen(code, room) {
  showScreen('room');
  id('room-code-disp').textContent = code;
  id('room-name-display').textContent = room.name || 'Room';
  id('host-panel').classList.toggle('hidden', !isHost);
  id('guest-wait').classList.toggle('hidden', isHost);

  if (isHost) {
    document.querySelector(`input[name="h-game"][value="${room.game}"]`).checked = true;
    document.querySelector(`input[name="h-time"][value="${room.timeLimit||300}"]`).checked = true;
    id('btn-stop').classList.add('hidden');
    id('btn-restart').classList.add('hidden');
    id('btn-start').classList.remove('hidden');
    id('btn-start').disabled = true;
  }

  listenRoom(code);
  listenChat(code);
  addSysMsg('Kamu bergabung ke room ' + code);
}

function listenRoom(code) {
  if (roomUnsub) { roomRef && roomRef.off('value', roomUnsub); }
  roomRef = db.ref('rooms/' + code);
  roomUnsub = roomRef.on('value', snap => {
    const room = snap.val();
    if (!room) { leaveRoomCleanup(); return; }
    renderPlayers(room);
    syncHostUI(room);
    if (room.status === 'playing' && room.gameState) {
      const screen = document.getElementById('screen-ttt').classList.contains('visible') ||
                     document.getElementById('screen-chess').classList.contains('visible');
      if (!screen) {
        if (room.game === 'ttt')   initTTTOnline(room);
        else                       initChessOnline(room);
      }
    }
    if (room.status === 'stopped') {
      toast('Host menghentikan permainan');
    }
  });
}

function renderPlayers(room) {
  const box = id('players-box');
  box.innerHTML = '';
  const players = room.players || {};
  Object.values(players).sort((a,b) => a.joinedAt - b.joinedAt).forEach(p => {
    const isMe = p.uid === currentUser.uid;
    const div = document.createElement('div');
    div.className = 'player-row' + (isMe ? ' me' : '');
    const initial = (p.name || '?').charAt(0).toUpperCase();
    const isSpec = p.playRole === 'spectator';
    div.innerHTML = `
      <div class="p-gem${isSpec?' spec':''}">${initial}</div>
      <div class="p-name">${p.name}${isMe?' (kamu)':''}</div>
      <div class="p-role${p.role==='host'?' host':isSpec?' spectator':''}">${p.role==='host'?'👑 Host':isSpec?'👁 Spectator':'🎮 Player'}</div>
    `;
    box.appendChild(div);
  });
  // enable start when ≥2 players
  if (isHost) {
    const playerCount = Object.values(players).filter(p => p.playRole === 'player').length;
    id('btn-start').disabled = playerCount < 2;
  }
}

function syncHostUI(room) {
  if (!isHost) return;
  const playing = room.status === 'playing';
  const stopped = room.status === 'stopped';
  id('btn-start').classList.toggle('hidden', playing);
  id('btn-stop').classList.toggle('hidden', !playing);
  id('btn-restart').classList.toggle('hidden', !playing && !stopped);
}

function hostSet(key, val) {
  if (!isHost || !currentRoomCode) return;
  db.ref('rooms/' + currentRoomCode + '/' + key).set(val);
}

function hostStartGame() {
  if (!isHost || !currentRoomCode) return;
  db.ref('rooms/' + currentRoomCode).once('value').then(snap => {
    const room = snap.val();
    if (!room) return;
    const players = Object.values(room.players || {}).filter(p => p.playRole === 'player');
    if (players.length < 2) { toast('Butuh minimal 2 player!'); return; }

    let gs;
    if (room.game === 'ttt')   gs = buildTTTState(room, players);
    else                       gs = buildChessState(room, players);

    db.ref('rooms/' + currentRoomCode).update({ status: 'playing', gameState: gs });
  });
}

function hostStopGame() {
  if (!isHost || !currentRoomCode) return;
  db.ref('rooms/' + currentRoomCode).update({ status: 'stopped' });
  toast('Permainan dihentikan');
}

function hostRestartGame() {
  if (!isHost || !currentRoomCode) return;
  db.ref('rooms/' + currentRoomCode).once('value').then(snap => {
    const room = snap.val();
    if (!room) return;
    const players = Object.values(room.players || {}).filter(p => p.playRole === 'player');
    let gs;
    if (room.game === 'ttt')   gs = buildTTTState(room, players);
    else                       gs = buildChessState(room, players);
    db.ref('rooms/' + currentRoomCode).update({ status: 'playing', gameState: gs });
  });
}

function guestSetRole(role) {
  myRole = role;
  if (!currentRoomCode || !currentUser) return;
  db.ref('rooms/' + currentRoomCode + '/players/' + currentUser.uid + '/playRole').set(role);
}

function buildTTTState(room, players) {
  return {
    board: Array(9).fill(null),
    turn: 'X', winner: null, winCells: null,
    scores: { X: 0, O: 0, draws: 0 },
    playerX: players[0].uid, playerXName: players[0].name,
    playerO: players[1].uid, playerOName: players[1].name,
    timeLimit: room.timeLimit || 300,
    timerX: room.timeLimit || 300,
    timerO: room.timeLimit || 300,
    lastTickAt: Date.now(),
    moveCount: 0,
    moveHistory: []
  };
}

function buildChessState(room, players) {
  return {
    board: initialChessBoard(),
    turn: 'white', status: 'playing',
    capturedW: [], capturedB: [],
    moveHistory: [],
    enPassant: null,
    castling: { wK:true, wQ:true, bK:true, bQ:true },
    playerW: players[0].uid, playerWName: players[0].name,
    playerB: players[1].uid, playerBName: players[1].name,
    timeLimit: room.timeLimit || 300,
    timerW: room.timeLimit || 300,
    timerB: room.timeLimit || 300,
    lastTickAt: Date.now(),
    lastMove: null, promotionPending: null
  };
}

// ── CHAT ──
function listenChat(code) {
  if (chatUnsub) { chatRef && chatRef.off('value', chatUnsub); }
  chatRef = db.ref('chats/' + code);
  chatUnsub = chatRef.limitToLast(60).on('child_added', snap => {
    const msg = snap.val();
    appendChatMsg(msg, 'chat-msgs');
    appendChatMsg(msg, 'game-chat-msgs');
    appendChatMsg(msg, 'chess-chat-msgs');
  });
}

function sendChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inp = id('chat-input');
  const text = inp.value.trim();
  if (!text || !currentRoomCode) return;
  inp.value = '';
  pushChatMsg(text);
}
function sendGameChat() {
  const inp = id('game-chat-input');
  const text = inp.value.trim();
  if (!text || !currentRoomCode) return;
  inp.value = '';
  pushChatMsg(text);
}
function sendChessChat() {
  const inp = id('chess-chat-input');
  const text = inp.value.trim();
  if (!text || !currentRoomCode) return;
  inp.value = '';
  pushChatMsg(text);
}
function pushChatMsg(text) {
  if (!db || !currentRoomCode) return;
  db.ref('chats/' + currentRoomCode).push({
    uid: currentUser.uid,
    name: getGamertag() || currentUser.displayName,
    text, ts: Date.now()
  });
}
function addSysMsg(text) {
  const msg = { uid: 'system', name: 'System', text, ts: Date.now() };
  appendChatMsg(msg, 'chat-msgs');
}
function appendChatMsg(msg, containerId) {
  const box = id(containerId);
  if (!box) return;
  const isMe = msg.uid === currentUser?.uid;
  const isSys = msg.uid === 'system';
  const div = document.createElement('div');
  div.className = 'chat-msg' + (isMe?' me':isSys?' sys':'');
  div.innerHTML = isSys
    ? `<span class="chat-msg-text">${msg.text}</span>`
    : `<span class="chat-msg-name${isMe?'':' opp'}">${isMe?'Kamu':msg.name}</span><span class="chat-msg-text">${escHtml(msg.text)}</span>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function escHtml(s) { return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function copyCode() {
  navigator.clipboard.writeText(currentRoomCode || '')
    .then(() => toast('Kode disalin! 📋'))
    .catch(() => toast('Kode: ' + currentRoomCode));
}

function leaveRoom() {
  leaveRoomCleanup();
  showScreen('lobby');
}

function leaveRoomCleanup() {
  if (roomRef && roomUnsub) { roomRef.off('value', roomUnsub); roomRef = null; roomUnsub = null; }
  if (chatRef && chatUnsub) { chatRef.off('child_added', chatUnsub); chatRef = null; chatUnsub = null; }
  if (currentRoomCode && db) {
    if (isHost) {
      db.ref('rooms/' + currentRoomCode).remove();
      db.ref('chats/' + currentRoomCode).remove();
    } else if (currentUser) {
      db.ref('rooms/' + currentRoomCode + '/players/' + currentUser.uid).remove();
    }
  }
  currentRoomCode = null; isHost = false; myRole = 'player';
  stopGameTimers();
}

// Offline
function goOfflineTTT()  { currentRoomCode = null; initTTTOffline(); }
function goOfflineChess() { currentRoomCode = null; initChessOffline(); }
