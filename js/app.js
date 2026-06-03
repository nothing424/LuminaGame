// ── APP MODULE ── (load terakhir, DOMContentLoaded safe)

function id(x) { return document.getElementById(x); }

// ── SCREENS ──
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));
  const el = id('screen-' + name);
  if (el) el.classList.add('visible');
  const ro = id('result-overlay');
  if (ro) ro.classList.add('hidden');
}

// ── MODALS ──
function closeModal(mid) {
  const el = id(mid);
  if (el) el.classList.add('hidden');
}

// ── TOAST ──
let _toastT = null;
function toast(msg, ms) {
  ms = ms || 2500;
  const el = id('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(function() { el.classList.remove('show'); }, ms);
}

// ── RESULT OVERLAY ──
function showResult(type, subtitle) {
  const ov = id('result-overlay');
  if (!ov) return;
  setTimeout(function() {
    const icon  = id('res-icon');
    const title = id('res-title');
    const sub   = id('res-sub');
    const again = id('res-again');
    if (type === 'win')       { icon.textContent='🏆'; title.textContent='MENANG!'; title.style.color='var(--c1)'; }
    else if (type === 'lose') { icon.textContent='💀'; title.textContent='KALAH!';  title.style.color='var(--c2)'; }
    else                      { icon.textContent='🤝'; title.textContent='SERI!';   title.style.color='var(--c3)'; }
    sub.textContent = subtitle || '';
    if (again) again.style.display = (typeof chessOffline!=='undefined' && (chessOffline||tttOffline||isHost)) ? '' : 'none';
    ov.classList.remove('hidden');
  }, 800);
}

// ── FORMAT TIME ──
function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  var m = Math.floor(s/60), sec = s % 60;
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// ── MODAL CLICK-OUTSIDE CLOSE ──
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-ov').forEach(function(m) {
    m.addEventListener('click', function(e) {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  // Auth tabs
  document.querySelectorAll('.tab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('active'); });
      document.querySelectorAll('.tab-pane').forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      var pane = id('tab-' + t.dataset.tab);
      if (pane) pane.classList.add('active');
    });
  });

  // Chat enter key
  var ci = id('chat-input');
  if (ci) ci.addEventListener('keydown', function(e){ if(e.key==='Enter') sendChat(e); });
  var gi = id('game-chat-input');
  if (gi) gi.addEventListener('keydown', function(e){ if(e.key==='Enter') sendGameChat(); });
  var xi = id('chess-chat-input');
  if (xi) xi.addEventListener('keydown', function(e){ if(e.key==='Enter') sendChessChat(); });

  // Escape closes modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-ov:not(.hidden)').forEach(function(m){ m.classList.add('hidden'); });
      var ro = id('result-overlay');
      if (ro) ro.classList.add('hidden');
    }
  });

  // Prevent double-tap zoom iOS
  var _lt = 0;
  document.addEventListener('touchend', function(e){
    var n = Date.now();
    if (n - _lt < 300) e.preventDefault();
    _lt = n;
  }, { passive: false });

  // Start splash
  startSplash();
});

// ── SPLASH ──
function startSplash() {
  var canvas = id('splash-canvas');
  if (!canvas) { finishSplash(); return; }
  var ctx = canvas.getContext('2d');
  var stars = [];
  var W, H, raf;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = [];
    for (var i = 0; i < 100; i++) {
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.5+0.3,
        vx: (Math.random()-0.5)*0.4,
        vy: (Math.random()-0.5)*0.4,
        a: Math.random()*0.7+0.2,
        hue: Math.random()*60+180
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0,0,W,H);
    var g1 = ctx.createRadialGradient(W*.3,H*.3,0,W*.3,H*.3,W*.4);
    g1.addColorStop(0,'rgba(167,139,250,.18)'); g1.addColorStop(1,'transparent');
    ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);
    var g2 = ctx.createRadialGradient(W*.75,H*.7,0,W*.75,H*.7,W*.35);
    g2.addColorStop(0,'rgba(74,255,203,.13)'); g2.addColorStop(1,'transparent');
    ctx.fillStyle = g2; ctx.fillRect(0,0,W,H);
    stars.forEach(function(s){
      s.x+=s.vx; s.y+=s.vy;
      if(s.x<0)s.x=W; if(s.x>W)s.x=0;
      if(s.y<0)s.y=H; if(s.y>H)s.y=0;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle='hsla('+s.hue+',100%,80%,'+s.a+')'; ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  }
  draw();

  var pct = 0;
  var fill  = id('splash-fill');
  var pctEl = id('splash-pct');
  var interval = setInterval(function() {
    pct += Math.random()*9+2;
    if (pct >= 100) { pct = 100; clearInterval(interval); }
    if (fill)  fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    if (pct >= 100) {
      setTimeout(function() {
        cancelAnimationFrame(raf);
        var sp = id('splash');
        if (!sp) { finishSplash(); return; }
        sp.style.transition = 'opacity .5s';
        sp.style.opacity = '0';
        setTimeout(function() {
          sp.style.display = 'none';
          finishSplash();
        }, 500);
      }, 400);
    }
  }, 55);
}

function finishSplash() {
  // Init Firebase auth listener or show auth screen
  if (typeof initAuth === 'function') initAuth();
  else showScreen('auth');
}

// ── OFFLINE SHORTCUTS ──
function goOfflineTTT()   { currentRoomCode=null; initTTTOffline(true); }
function goOfflineChess() { currentRoomCode=null; initChessOffline(true); }
function playOffline()    { 
  currentUser = { uid:'offline_'+Date.now(), displayName: localStorage.getItem('lumina_tag')||'Player', isOffline:true };
  updateUserUI();
  showScreen('lobby');
}

// ── TOGGLE CHAT ──
function toggleChat() {
  var fc = id('float-chat') || id('float-chat-chess');
  if (fc) fc.classList.toggle('hidden');
}
