# 🎮 LUMINA GAME

**Tic Tac Toe & Catur Online/Offline Multiplayer**

---

## 📁 Struktur File

```
lumina/
├── index.html
├── assets/
│   └── logo.png
├── css/
│   ├── main.css      ← Auth, lobby, room, UI utama
│   ├── ttt.css       ← Tic Tac Toe
│   ├── chess.css     ← Catur
│   └── chat.css      ← Chat
└── js/
    ├── config.js     ← ⚠️ ISI FIREBASE CONFIG
    ├── auth.js       ← Login/Register/Google
    ├── room.js       ← Room, chat, host controls
    ├── ttt.js        ← Tic Tac Toe logic
    ├── chess.js      ← Chess engine
    ├── ai.js         ← Bot AI
    └── app.js        ← App init, splash, utils
```

---

## 🔥 Setup Firebase

1. https://console.firebase.google.com → buat project
2. Add Web App → salin config ke `js/config.js`
3. Authentication → aktifkan **Email/Password** + **Google**
4. Realtime Database → Create (test mode)

### Rules Database (setelah testing):
```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "chats": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 🌐 Deploy

### Netlify (Termudah)
Drag & drop folder `lumina/` ke https://netlify.com → dapat URL otomatis

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login && firebase init hosting
# public dir = lumina/
firebase deploy
```

---

## 📱 Install di HP (PWA)
- **Android Chrome**: Menu → Add to Home screen
- **iPhone Safari**: Share → Add to Home Screen

---

## ✨ Fitur Lengkap

### Auth
- ✅ Login Email/Password
- ✅ Daftar Email
- ✅ Login Google
- ✅ Main Offline tanpa login
- ✅ Ganti Gamertag kapan saja

### Room Online
- ✅ Buat room → dapat kode 6 digit unik
- ✅ Join dengan kode
- ✅ Chat real-time di room & dalam game
- ✅ Host Settings: ganti game, waktu, peran
- ✅ Pilih jadi **Player** atau **Spectator**
- ✅ Host: Mulai / Stop / Ulang permainan
- ✅ Timer: 5 / 10 / 15 menit per giliran

### Tic Tac Toe
- ✅ **Sliding Window**: setelah 3 langkah, yang tertua hilang (simbol paling awal dihapus)
- ✅ Visual "faded" untuk simbol yang akan hilang berikutnya
- ✅ Online multiplayer real-time
- ✅ Offline vs AI bot
- ✅ Skor terakumulasi per sesi
- ✅ Timer per giliran

### Catur
- ✅ Engine catur lengkap
- ✅ Skak, Skakmat, Pat, Seri
- ✅ Rokade (castling) kiri & kanan
- ✅ En passant
- ✅ Promosi pion (pilih Q/R/B/N)
- ✅ Highlight: kotak valid, langkah terakhir, skak
- ✅ Papan bisa dibalik (hitam main dari bawah)
- ✅ Riwayat langkah (notasi aljabar)
- ✅ Potongan buah tertampil
- ✅ Online multiplayer real-time
- ✅ Offline vs AI
- ✅ Timer per giliran

### UI/UX
- ✅ Splash screen animasi bintang
- ✅ Dark cosmic theme
- ✅ Animasi aurora & partikel
- ✅ Notifikasi toast
- ✅ Result overlay menang/kalah/seri
- ✅ Responsive Android & iPhone
- ✅ Font: Cinzel Decorative + Nunito + JetBrains Mono
