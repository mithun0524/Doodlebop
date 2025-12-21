function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required' };
  }
  
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, message: 'Username must be 3-20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true };
}

function validateRoomCode(roomCode) {
  if (!roomCode || typeof roomCode !== 'string') {
    return { valid: false, message: 'Room code is required' };
  }
  
  if (!/^[A-Z]{6}$/.test(roomCode)) {
    return { valid: false, message: 'Room code must be exactly 6 uppercase letters' };
  }
  
  return { valid: true };
}

function validateWord(word, wordList) {
  if (!word || typeof word !== 'string') {
    return { valid: false, message: 'Word is required' };
  }
  
  if (!wordList.includes(word.toLowerCase())) {
    return { valid: false, message: 'Invalid word selected' };
  }
  
  return { valid: true };
}

module.exports = {
  validateUsername,
  validateRoomCode,
  validateWord
};



