// Growth Plan Builder - Validation Utilities

// Phone number validation and formatting (xxx-xxx-xxxx)
export function formatPhoneNumber(value) {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Format as xxx-xxx-xxxx
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

export function isValidPhoneNumber(phone) {
  // Must match format: xxx-xxx-xxxx
  const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
  return phoneRegex.test(phone);
}

// Email validation
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation
export function validatePassword(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
  
  return {
    isValid: requirements.minLength && requirements.hasUppercase && requirements.hasNumber,
    requirements
  };
}

// Check if passwords match
export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword && password.length > 0;
}

// Rate limiting for login attempts
const RATE_LIMIT_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export function getRateLimitStatus(phoneNumber) {
  try {
    const stored = localStorage.getItem(`${RATE_LIMIT_KEY}_${phoneNumber}`);
    if (!stored) return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS };
    
    const data = JSON.parse(stored);
    const now = Date.now();
    
    // Check if lockout period has expired
    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingMinutes = Math.ceil((data.lockedUntil - now) / 60000);
      return { 
        isLocked: true, 
        attemptsRemaining: 0,
        remainingMinutes 
      };
    }
    
    // Reset if lockout expired
    if (data.lockedUntil && now >= data.lockedUntil) {
      localStorage.removeItem(`${RATE_LIMIT_KEY}_${phoneNumber}`);
      return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS };
    }
    
    return { 
      isLocked: false, 
      attemptsRemaining: MAX_ATTEMPTS - (data.attempts || 0) 
    };
  } catch {
    return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS };
  }
}

export function recordFailedAttempt(phoneNumber) {
  try {
    const stored = localStorage.getItem(`${RATE_LIMIT_KEY}_${phoneNumber}`);
    let data = stored ? JSON.parse(stored) : { attempts: 0 };
    
    data.attempts = (data.attempts || 0) + 1;
    data.lastAttempt = Date.now();
    
    // Lock out after max attempts
    if (data.attempts >= MAX_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCKOUT_DURATION;
    }
    
    localStorage.setItem(`${RATE_LIMIT_KEY}_${phoneNumber}`, JSON.stringify(data));
    
    return {
      isLocked: data.attempts >= MAX_ATTEMPTS,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - data.attempts)
    };
  } catch {
    return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS };
  }
}

export function clearRateLimitOnSuccess(phoneNumber) {
  try {
    localStorage.removeItem(`${RATE_LIMIT_KEY}_${phoneNumber}`);
  } catch {
    // Ignore errors
  }
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Trim and normalize text
export function normalizeText(text) {
  return text?.trim() || '';
}
