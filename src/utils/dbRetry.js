const db = require('../config/db');

const RETRYABLE_PATTERNS = ['ECONNRESET', 'ETIMEDOUT', 'Connection terminated'];

const isRetryable = (err) => {
  const code = err && err.code ? String(err.code) : '';
  const message = err && err.message ? String(err.message) : '';
  return RETRYABLE_PATTERNS.some(
    (pattern) => code.includes(pattern) || message.includes(pattern)
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const dbQuery = async (text, params) => {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await db.query(text, params);
    } catch (err) {
      lastError = err;

      if (!isRetryable(err) || attempt === maxAttempts) {
        throw err;
      }

      console.warn(
        `DB query başarısız (deneme ${attempt}/${maxAttempts}): ${err.message}. 500ms sonra tekrar deneniyor...`
      );
      await sleep(500);
    }
  }

  throw lastError;
};

module.exports = { dbQuery };
