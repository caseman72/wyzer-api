// Rate limit tracking
let rateLimitRemaining = null;
let rateLimitResetBy = null;

export function getRateLimitStatus() {
  return {
    remaining: rateLimitRemaining,
    resetBy: rateLimitResetBy,
    resetIn: rateLimitResetBy ? Math.max(0, rateLimitResetBy - Date.now()) : null
  };
}

function parseRateLimitHeaders(headers) {
  const remaining = headers.get("x-ratelimit-remaining");
  const resetBy = headers.get("x-ratelimit-reset-by");

  if (remaining !== null) {
    rateLimitRemaining = parseInt(remaining);
  }
  if (resetBy) {
    rateLimitResetBy = new Date(resetBy).getTime();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class RateLimitError extends Error {
  constructor(resetBy, remaining) {
    const resetIn = Math.ceil((resetBy - Date.now()) / 1000);
    super(`Rate limited. Resets in ${resetIn} seconds`);
    this.name = "RateLimitError";
    this.resetBy = resetBy;
    this.remaining = remaining;
    this.resetIn = resetIn;
  }
}

export async function request(url, options = {}, { autoRetry = false, maxRetries = 1 } = {}) {
  // Check if we're currently rate limited
  if (rateLimitResetBy && rateLimitRemaining === 0) {
    const now = Date.now();
    if (now < rateLimitResetBy) {
      if (autoRetry) {
        const waitTime = rateLimitResetBy - now;
        console.log(`Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await sleep(waitTime + 1000); // Add 1s buffer
      }
      else {
        throw new RateLimitError(rateLimitResetBy, rateLimitRemaining);
      }
    }
  }

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    // Parse rate limit headers
    parseRateLimitHeaders(response.headers);

    const data = await response.json();

    // Check for rate limit error in response
    const isRateLimited =
      data.code === 3044 ||
      (data.code === 1000 && data.msg?.toLowerCase().includes("too many"));

    if (isRateLimited) {
      // Set rate limit reset to 10 minutes from now if not in headers
      if (!rateLimitResetBy || rateLimitResetBy < Date.now()) {
        rateLimitResetBy = Date.now() + 10 * 60 * 1000;
      }
      rateLimitRemaining = 0;

      if (autoRetry && attempt < maxRetries) {
        const waitTime = rateLimitResetBy - Date.now();
        console.log(`Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s before retry...`);
        await sleep(waitTime + 1000);
        continue;
      }

      throw new RateLimitError(rateLimitResetBy, 0);
    }

    // Warn if running low on rate limit
    if (rateLimitRemaining !== null && rateLimitRemaining < 5) {
      console.warn(`Warning: Only ${rateLimitRemaining} API calls remaining until reset`);
    }

    return { response, data };
  }

  throw lastError;
}
