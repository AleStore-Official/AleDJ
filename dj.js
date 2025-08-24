let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bufferA, bufferB;
let sourceA, sourceB;
let gainA = audioCtx.createGain();
let gainB = audioCtx.createGain();
let automixActive = true;
let playing = false;

// 🎚️ Bass Boost Filter
const bassBoost = audioCtx.createBiquadFilter();
bassBoost.type = 'lowshelf';
bassBoost.frequency.value = 200;     // Frequenza centrale
bassBoost.gain.value = 10;           // Guadagno in dB (+10 bassi)

bassBoost.connect(audioCtx.destination); // Output finale

// 🔊 Mostra dispositivo output (Bluetooth se disponibile)
navigator.mediaDevices?.enumerateDevices?.().then(devices => {
  const outputs = devices.filter(d => d.kind === 'audiooutput');
  const bt = outputs.find(d => d.label.toLowerCase().includes('bluetooth'));
  document.getElementById('outputInfo').textContent =
    bt ? `🔊 Output: ${bt.label}` : '🔊 Output: dispositivo predefinito';
});

// 🎵 Visualizzazione del brano + rotazione
function setNowPlaying(text, spinA = false, spinB = false) {
  document.getElementById('nowPlaying').textContent = text;
  document.getElementById('discA').classList.toggle('spin', spinA);
  document.getElementById('discB').classList.toggle('spin', spinB);
}

// 🎶 Decodifica
async function loadAndDecode(file) {
  const data = await file.arrayBuffer();
  return await audioCtx.decodeAudioData(data);
}

// 🎚️ Caricamento tracce
document.getElementById('trackA').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (file) {
    bufferA = await loadAndDecode(file);
    setNowPlaying(`🎵 Pronto su Deck A: ${file.name}`);
  }
});

document.getElementById('trackB').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (file) {
    bufferB = await loadAndDecode(file);
  }
});

// ▶️ PLAY
document.getElementById('playBtn').onclick = () => {
  if (!bufferA || !bufferB || playing) return;

  sourceA = audioCtx.createBufferSource();
  sourceA.buffer = bufferA;
  sourceA.connect(gainA).connect(bassBoost);
  sourceA.start();
  playing = true;

  setNowPlaying(`🎵 In riproduzione da Deck A`, true, automixActive);

  if (automixActive) {
    const mixStart = bufferA.duration - 5;
    sourceB = audioCtx.createBufferSource();
    sourceB.buffer = bufferB;
    sourceB.connect(gainB).connect(bassBoost);
    sourceB.start(audioCtx.currentTime + mixStart);

    gainA.gain.setValueAtTime(1, audioCtx.currentTime + mixStart);
    gainA.gain.linearRampToValueAtTime(0, audioCtx.currentTime + bufferA.duration);

    gainB.gain.setValueAtTime(0, audioCtx.currentTime + mixStart);
    gainB.gain.linearRampToValueAtTime(1, audioCtx.currentTime + bufferA.duration);

    setNowPlaying(`🎵 Mix: Deck A ➡️ Deck B`, true, true);
  }
};

// ⏸ PAUSA con fade-out
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

document.getElementById('pauseBtn').onclick = () => {
  if (sourceA) fadeOutAndStop(sourceA, gainA);
  if (sourceB) fadeOutAndStop(sourceB, gainB);
  playing = false;
  setNowPlaying('⏸ Pausa', false, false);
};

// ⚡ Automix toggle
document.getElementById('automixBtn').onclick = () => {
  automixActive = !automixActive;
  const btn = document.getElementById('automixBtn');
  btn.classList.toggle('opacity-50', !automixActive);
  btn.classList.toggle('grayscale', !automixActive);
};