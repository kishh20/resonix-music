# 🎵 Resonix - Premium High-Fidelity Music Streaming Platform

<div align="center">

![Resonix Banner](frontend/public/resonix.ico)

**A sleek, modern, high-fidelity music streaming ecosystem inspired by Spotify, Apple Music, and YouTube Music.**  
*100% Ad-Free • OG Creator Only • Live Synced Lyrics • Spotify-Style Jam Sessions • 320kbps Studio Audio*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com)

</div>

---

## 🌟 Key Highlights

- **Pure OG Creator Content (Strictly Non-Fan-Made)**:
  - Advanced filtering algorithm automatically purges fan-made covers, sped-up/slowed remixes, chipmunk edits, bass boosts, and non-canonical uploads.
  - Prioritizes official music videos, topic tracks, and verified original artist audio.
- **100% Ad-Free with Smart Outro Cutoff Engine**:
  - Automatically analyzes song waveforms and official durations to seamlessly cut off YouTube sponsor promotions, outro chatter, and social media end-cards right before they play.
- **Real-Time Time-Synced Karaoke Lyrics**:
  - Apple Music & Spotify-style line-by-line synchronized lyrics with live karaoke highlighting.
  - Interactive click-to-seek, smooth auto-scroll, and right-side **Now Playing slidebar** preview with live progress.
- **Spotify Jam (Real-Time Synchronized Group Listening)**:
  - Create or join collaborative Jam rooms with friends using room codes or QR codes.
  - Real-time synchronized playback: when the host plays, pauses, or seeks, everyone's music syncs instantly via low-latency WebSockets.
- **Windows Taskbar & Hardware Media Controls**:
  - Native Windows taskbar thumbnail hover preview with interactive **Play/Pause, Previous Song, and Next Song** buttons via the Web MediaSession API.
  - Full hardware media keyboard key support (<kbd>Play</kbd>, <kbd>Pause</kbd>, <kbd>Next</kbd>, <kbd>Prev</kbd>, <kbd>Mute</kbd>).
- **Studio Audio Fidelity (320kbps)**:
  - Streams high-bitrate **320kbps MP3 / 256kbps Opus & AAC** audio streams with HTTP 206 Partial Content range seeking support.
- **Spotify & Apple Music 100% Playlist Importer**:
  - Reconstructs any Spotify or Apple Music public playlist without truncation limits (supporting 100+ tracks), paginating and matching high-fidelity streams with 100% match rate.
- **Dual-Mode Cloud Sync**:
  - **Supabase Cloud Mode**: Multi-device relational PostgreSQL database with Row Level Security (RLS) and email authentication.
  - **Local Zero-Config Mode**: Instant fallback using encrypted browser and backend JSON storage—usable immediately without needing external cloud setup!
- **Progressive Web App (PWA) & Local Network Android Access**:
  - Installable as a standalone app on Windows and Android with lock screen playback and media notification shade.

---

## 🏗️ Architecture & Technology Stack

```
Resonix Music Platform
├── Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
│   ├── Zustand State Stores (Player, Library, Jam, Auth)
│   ├── HTML5 Audio & Web Audio API Analyser
│   ├── MediaSession API (Taskbar Hover Controls & Lockscreen)
│   ├── Real-Time WebSocket Client (Spotify-Style Jam Engine)
│   ├── Synced Karaoke Lyrics Engine with Smart Time Tracking
│   ├── Right-Side "Now Playing" Slidebar Panel
│   └── PWA Service Worker (App Shell caching & mobile standalone mode)
│
├── Backend (Python 3.10+ / 3.14 + FastAPI + WebSockets)
│   ├── Continuous Discovery Engine (Audius, Jamendo, Archive.org, YouTube Music)
│   ├── Jam Session Manager (Room management, real-time WebSocket sync)
│   ├── Smart Outro Cutoff & Duration Normalizer
│   ├── Strict OG Creator Filter (Purges fan covers & sped-up edits)
│   ├── Streaming Proxy with HTTP 206 Range seeking support
│   └── Fuzzy Song Matching & Recommender System
│
└── Cloud & Storage (Dual Supabase + Local JSON Storage)
    ├── Supabase PostgreSQL with Row Level Security (RLS)
    └── Offline Fallback for 100% privacy and zero-credential use
```

---

## 🚀 Quick Start on Windows

### Option 1: Desktop App Shortcut (Instant 1-Click Launch)
Double-click the **Resonix Music** shortcut on your Windows Desktop.  
It automatically starts the backend and frontend silently in the background and opens Resonix in a dedicated standalone app window.

- To recreate or update the desktop shortcut: run `create_desktop_shortcut.bat`.
- To stop background servers: double-click `stop_app.bat`.

---

### Option 2: Automatic 1-Click Launch via `start.bat`
Double-click `start.bat` in the root project folder. It will:
1. Verify Python 3.10+ and Node.js.
2. Configure the Python virtual environment and backend dependencies automatically.
3. Configure frontend npm packages automatically.
4. Detect your local WiFi IP address for mobile phone access.
5. Launch FastAPI backend (`http://localhost:8000`) and Vite frontend (`http://localhost:5173`).
6. Open Resonix in a dedicated standalone application window.

---

### Option 3: Manual Terminal Launch

#### Step 1: Start the Backend (Terminal 1)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
> The backend runs on `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).

#### Step 2: Start the Frontend (Terminal 2)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0
```
> The frontend runs on `http://localhost:5173`.

---

## 📱 Mobile Phone Access & PWA Installation

1. Connect your Android phone to the same Wi-Fi network as your computer.
2. In Resonix on your computer, click **Settings** to see your unique QR code and local network IP address (e.g. `http://192.168.1.X:5173`).
3. Scan the QR code or navigate to the URL in Chrome or Brave on your phone.
4. Tap **"Install App"** at the top or tap Chrome Menu (⋮) → **"Add to Home screen"**.
5. Resonix installs as a native standalone PWA on your home screen with lock screen playback and notification controls!

---

## 🎧 Spotify Playlist Importer

1. In Spotify (desktop, web, or mobile), open any playlist.
2. Click **Share → Copy link to playlist**.
3. In Resonix, navigate to **Spotify Importer** from the sidebar.
4. Paste the link and click **Import Playlist**.
5. Resonix reconstructs the entire playlist, fetches high-fidelity streams, and saves it directly to your library.

---

## 👥 Spotify Jam (Group Listening)

1. Click the **Jam** button in the player bar or top navigation.
2. Click **Start a Jam** to create a live listening room.
3. Share the 6-character room code or QR code with friends on your local network.
4. Friends click **Join Jam**, enter the code, and everyone's music plays in perfect sync!

---

## ⌨️ Desktop Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>N</kbd> | Next Track |
| <kbd>P</kbd> | Previous Track |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek backward / forward 5 seconds |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down 5% |
| <kbd>M</kbd> | Mute / Unmute audio |

---

## 📜 Legal & Licensing Attribution

- **Audius API**: Streamed via the open, decentralized Audius music protocol under artist-granted licenses.
- **Jamendo API**: Music provided under Creative Commons licensing for personal non-commercial listening.
- **Free Music Archive**: Curated acoustic and indie recordings hosted via Internet Archive collections.
- **YouTube / YouTube Music**: Official streaming audio accessed strictly under fair-use streaming protocols without offline piracy.
- **Spotify**: Metadata and playlist schema reconstruction only. Resonix does not circumvent Spotify DRM.
