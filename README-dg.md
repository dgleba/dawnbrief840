
# Dawnbrief news podcast player

2026-10-25

-------------------------------------------------

# Version

version is edited in:

1.
src/components/Navbar.tsx

display on app..
see line 107
                Ver 22

public/sw.js

2.
When browser sees change in sw.js it reloads the app.
see line 2

const SWVERSION_NAME = 'ver22' ;

-------------------------------------------------

### Ver 22 Updates
- Fixed Android / Pixel 10 Pro PWA playback dropping/stalling on pause or buffer:
  - Updated `public/sw.js` to strictly bypass cross-origin audio streams and Range (206) requests from the Service Worker cache, allowing native media streaming and seeking.
  - Added continuous MediaSession `playbackState` ('playing' / 'paused') and `setPositionState` tracking so Android lockscreen and notifications maintain background audio sessions.
  - Explicit 'play' and 'pause' actions on MediaSession to prevent lockscreen / Bluetooth toggle inversion desyncs.
  - Added Screen WakeLock during active playback to prevent mobile CPU throttling.
  - Added automatic audio stall and network error auto-recovery in `AudioPlayer.tsx`.
