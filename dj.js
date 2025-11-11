const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bufferA, bufferB;
let sourceA, sourceB;
const gainA = audioCtx.createGain();
const gainB = audioCtx.createGain();
let automixActive = true;
let playing = false;

const bassBoost = audioCtx.createBiquadFilter();
bassBoost.type = "lowshelf";
bassBoost.frequency.value = 200;
bassBoost.gain.value = 10;
bassBoost.connect(audioCtx.destination);

navigator.mediaDevices?.enumerateDevices?.().then(devices => {
  const outputs = devices.filter(d => d.kind === "audiooutput");
  const bt = outputs.find(d => d.label.toLowerCase().includes("bluetooth"));
  document.getElementById("outputInfo").textContent =
    bt ? `🔊 Output: ${bt.label}` : "🔊 Output: default device";
});

function setNowPlaying(text, spinA = false, spinB = false) {
  document.getElementById("nowPlaying").textContent = text;
  document.getElementById("discA").classList.toggle("spin", spinA);
  document.getElementById("discB").classList.toggle("spin", spinB);
}

async function loadAndDecode(file) {
  try {
    const data = await file.arrayBuffer();
    return await audioCtx.decodeAudioData(data);
  } catch (err) {
    alert("Error decoding audio file.");
    return null;
  }
}

document.getElementById("trackA").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (file) {
    bufferA = await loadAndDecode(file);
    if (bufferA) setNowPlaying(`🎵 Ready on Deck A: ${file.name}`);
  }
});

document.getElementById("trackB").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (file) bufferB = await loadAndDecode(file);
});

document.getElementById("playBtn").onclick = async () => {
  if (!bufferA || !bufferB || playing) return;
  await audioCtx.resume();

  sourceA = audioCtx.createBufferSource();
  sourceA.buffer = bufferA;
  sourceA.connect(gainA).connect(bassBoost);
  sourceA.start();
  playing = true;

  setNowPlaying("🎵 Playing from Deck A", true, automixActive);

  if (automixActive) {
    const overlap = 5;
    const mixStart = bufferA.duration - overlap;
    sourceB = audioCtx.createBufferSource();
    sourceB.buffer = bufferB;
    sourceB.connect(gainB).connect(bassBoost);
    sourceB.start(audioCtx.currentTime + mixStart);

    gainA.gain.setValueAtTime(1, audioCtx.currentTime + mixStart);
    gainA.gain.linearRampToValueAtTime(0, audioCtx.currentTime + bufferA.duration);

    gainB.gain.setValueAtTime(0, audioCtx.currentTime + mixStart);
    gainB.gain.linearRampToValueAtTime(1, audioCtx.currentTime + bufferA.duration);

    setNowPlaying("🎵 Mix: Deck A ➡️ Deck B", true, true);
  }
};

function fadeOutAndStop(source, gainNode, duration = 2) {
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);
  setTimeout(() => {
    try { source.stop(); } catch {}
    gainNode.gain.value = 1;
  }, duration * 1000);
}

document.getElementById("pauseBtn").onclick = async () => {
  await audioCtx.resume();
  if (sourceA) fadeOutAndStop(sourceA, gainA);
  if (sourceB) fadeOutAndStop(sourceB, gainB);
  sourceA = null;
  sourceB = null;
  playing = false;
  setNowPlaying("⏸ Paused", false, false);
};

document.getElementById("automixBtn").onclick = () => {
  automixActive = !automixActive;
  const btn = document.getElementById("automixBtn");
  btn.classList.toggle("opacity-50", !automixActive);
  btn.classList.toggle("grayscale", !automixActive);
};