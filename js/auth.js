// ── AUTH MODULE ──
let currentUser = null;

function initAuth() {
  if (!auth) return;
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      updateUserUI();
      showScreen('lobby');
    } else {
      currentUser = null;
      showScreen('auth');
    }
  });
}

function loginEmail() {
  const email = id('l-email').value.trim();
  const pass  = id('l-pass').value;
  const err   = id('l-err');
  if (!email || !pass) { err.textContent = 'Isi email dan password!'; return; }
  err.textContent = 'Masuk...';
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => err.textContent = '')
    .catch(e => err.textContent = authMsg(e.code));
}

function registerEmail() {
  const tag   = id('r-tag').value.trim();
  const email = id('r-email').value.trim();
  const pass  = id('r-pass').value;
  const err   = id('r-err');
  if (!tag)  { err.textContent = 'Gamertag wajib diisi!'; return; }
  if (!email){ err.textContent = 'Email wajib diisi!'; return; }
  if (pass.length < 6) { err.textContent = 'Password min 6 karakter!'; return; }
  err.textContent = 'Mendaftar...';
  auth.createUserWithEmailAndPassword(email, pass)
    .then(c => c.user.updateProfile({ displayName: tag }))
    .then(() => err.textContent = '')
    .catch(e => err.textContent = authMsg(e.code));
}

function loginGoogle() {
  if (!auth) return;
  const p = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(p).catch(e => {
    id('l-err').textContent = authMsg(e.code);
  });
}

function logout() {
  if (currentRoomCode) leaveRoom();
  auth && auth.signOut();
}

function playOffline() {
  currentUser = { uid: 'offline_' + Date.now(), displayName: getGamertag() || 'Player', isOffline: true };
  updateUserUI();
  showScreen('lobby');
}

function updateUserUI() {
  if (!currentUser) return;
  const name = getGamertag() || currentUser.displayName || 'Player';
  id('user-tag').textContent = name;
  id('user-gem').textContent = name.charAt(0).toUpperCase();
  id('profile-gem-big').textContent = name.charAt(0).toUpperCase();
  id('new-tag').value = name;
}

function getGamertag() {
  return localStorage.getItem('lumina_tag') || (currentUser && currentUser.displayName) || '';
}

function showProfile() {
  id('modal-profile').classList.remove('hidden');
}

function saveGamertag() {
  const v = id('new-tag').value.trim();
  if (!v || v.length < 2) { id('tag-msg').textContent = 'Min 2 karakter!'; return; }
  localStorage.setItem('lumina_tag', v);
  id('tag-msg').textContent = '✓ Disimpan!';
  id('tag-msg').style.color = 'var(--c1)';
  updateUserUI();
  if (auth && currentUser && !currentUser.isOffline) {
    currentUser.updateProfile({ displayName: v }).catch(() => {});
  }
  setTimeout(() => closeModal('modal-profile'), 1000);
}

function authMsg(code) {
  const m = {
    'auth/invalid-email': 'Format email salah',
    'auth/user-not-found': 'Email tidak terdaftar',
    'auth/wrong-password': 'Password salah',
    'auth/invalid-credential': 'Email/password salah',
    'auth/email-already-in-use': 'Email sudah dipakai',
    'auth/weak-password': 'Password terlalu lemah',
    'auth/popup-closed-by-user': 'Login dibatalkan',
    'auth/network-request-failed': 'Tidak ada koneksi',
    'auth/too-many-requests': 'Terlalu banyak percobaan',
  };
  return m[code] || 'Error: ' + code;
}

// Tab switching
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    id('tab-' + t.dataset.tab).classList.add('active');
  });
});
