let muted = false;
let audioContext = null;

try {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  console.warn('Web Audio API not supported:', e);
}

function playTone(frequency, duration, type = 'sine') {
  if (muted || !audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.warn('Error playing tone:', e);
  }
}

export function playSound(soundName) {
  if (!audioContext) return;
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  switch (soundName) {
    case 'correctGuess':
      // Success chime - ascending notes
      playTone(523.25, 0.1, 'sine'); // C5
      setTimeout(() => playTone(659.25, 0.1, 'sine'), 100); // E5
      setTimeout(() => playTone(783.99, 0.2, 'sine'), 200); // G5
      break;
    
    case 'wrongGuess':
      // Subtle blip
      playTone(200, 0.05, 'square');
      break;
    
    case 'roundEnd':
      // Completion sound
      playTone(440, 0.2, 'sine');
      setTimeout(() => playTone(554.37, 0.2, 'sine'), 200);
      break;
    
    case 'yourTurn':
      // Notification ding
      playTone(880, 0.15, 'sine');
      setTimeout(() => playTone(1108.73, 0.15, 'sine'), 150);
      break;
    
    default:
      break;
  }
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

