console.log("[AdSkipper] Content script loaded.");

let isMutedByExtension = false;
let hasCountedCurrentAd = false;
let originalMuteState = false;

// Robust ad detection using browser-level metadata and fallbacks
function isAdPlaying() {
  // 1. Check navigator.mediaSession metadata
  if (navigator.mediaSession && navigator.mediaSession.metadata) {
    const metadata = navigator.mediaSession.metadata;
    const title = (metadata.title || "").toLowerCase();
    const artist = (metadata.artist || "").toLowerCase();
    const album = (metadata.album || "").toLowerCase();

    if (
      title.includes("advertisement") || 
      artist.includes("advertisement") || 
      album.includes("advertisement") ||
      artist === "spotify" ||
      album === "spotify"
    ) {
      return true;
    }
  }

  // 2. Check document title
  if (document.title && document.title.toLowerCase().includes("advertisement")) {
    return true;
  }

  // 3. Check now-playing bar elements for "advertisement" text content
  const nowPlayingWidget = document.querySelector('[data-testid="now-playing-widget"]');
  if (nowPlayingWidget) {
    const textContent = nowPlayingWidget.textContent.toLowerCase();
    if (textContent.includes("advertisement")) {
      return true;
    }
  }

  // 4. Fallback: Check for stable DOM elements like permanent links or badges
  if (
    document.querySelector('a[href*="/ad-info/"]') || 
    document.querySelector('a[href*="spotify.com/ad"]') || 
    document.querySelector('[data-testid="ad-badge"]')
  ) {
    return true;
  }

  return false;
}

// Mutes and fast-forwards/skips the audio element
function checkAndHandleAd(audio) {
  if (!audio) return;

  const adDetected = isAdPlaying();
  
  if (adDetected) {
    // 1. Mute the audio and track extension state to avoid overriding manual user mute
    if (!audio.muted && !isMutedByExtension) {
      originalMuteState = audio.muted;
      audio.muted = true;
      isMutedByExtension = true;
      console.log("[AdSkipper] Ad detected! Muting audio stream.");
    }

    // 2. Increment count exactly once per ad sequence
    if (!hasCountedCurrentAd) {
      hasCountedCurrentAd = true;
      chrome.runtime.sendMessage({ action: "AD_SKIPPED" });
    }

    // 3. Skip the ad by forwarding time and maximizing playback rate
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = audio.duration - 0.1;
    } else {
      audio.currentTime = 9999;
    }
    
    // Set max playback rate to speed through if currentTime change is throttled
    if (audio.playbackRate !== 16.0) {
      audio.playbackRate = 16.0;
    }
  } else {
    // Normal track resumes
    // 1. Restore standard playback rate
    if (audio.playbackRate !== 1.0) {
      audio.playbackRate = 1.0;
    }

    // 2. Restore mute/volume state only if muted by extension
    if (isMutedByExtension) {
      audio.muted = originalMuteState;
      isMutedByExtension = false;
      console.log("[AdSkipper] Normal song resumed. Restoring audio state.");
    }

    // 3. Reset ad-counting trigger
    hasCountedCurrentAd = false;
  }
}

// Track already bound audio elements to prevent duplicate listeners
const boundAudios = new WeakSet();

function bindAudioElement(audio) {
  if (boundAudios.has(audio)) return;
  boundAudios.add(audio);

  console.log("[AdSkipper] Bound audio element successfully.", audio);

  // Direct event listeners to bypass background-tab timer throttling
  const events = ["play", "playing", "timeupdate", "durationchange", "volumechange"];
  events.forEach(eventName => {
    audio.addEventListener(eventName, () => checkAndHandleAd(audio));
  });

  // Initial check
  checkAndHandleAd(audio);
}

// Locate and bind all audio elements in the page
function findAndBindAudios() {
  const audios = document.querySelectorAll("audio");
  if (audios.length > 0) {
    audios.forEach(bindAudioElement);
  }
}

// Run immediately to capture any pre-existing elements
findAndBindAudios();

// Observe the DOM to bind new dynamically created audio elements
const observer = new MutationObserver(() => {
  findAndBindAudios();
  const audios = document.querySelectorAll("audio");
  audios.forEach(checkAndHandleAd);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Fallback interval (1s) to double-check state even if events are throttled/missed
setInterval(() => {
  findAndBindAudios();
  const audios = document.querySelectorAll("audio");
  audios.forEach(checkAndHandleAd);
}, 1000);
