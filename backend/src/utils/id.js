export function makeImmutableId(prefix) {
  return `rozgarmitra-${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}`;
}

export function makeOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
