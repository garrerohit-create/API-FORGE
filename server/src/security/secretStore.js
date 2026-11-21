/**
 * Session-only secret store kept strictly in backend process memory.
 * Secret values NEVER touch SQLite, disk, logs, or exports.
 * They are valid for the current backend process session only.
 */
class SecretStore {
  constructor() {
    // Key format: `${environmentId}:${variableKey}` -> secretValue
    this.secrets = new Map();
  }

  setSecret(environmentId, variableKey, value) {
    if (!environmentId || !variableKey) return;
    const key = `${environmentId}:${variableKey}`;
    if (value === null || value === undefined || value === '') {
      this.secrets.delete(key);
    } else {
      this.secrets.set(key, String(value));
    }
  }

  getSecret(environmentId, variableKey) {
    return this.secrets.get(`${environmentId}:${variableKey}`) || null;
  }

  hasSecret(environmentId, variableKey) {
    return this.secrets.has(`${environmentId}:${variableKey}`);
  }

  deleteEnvironmentSecrets(environmentId) {
    const prefix = `${environmentId}:`;
    for (const key of this.secrets.keys()) {
      if (key.startsWith(prefix)) {
        this.secrets.delete(key);
      }
    }
  }

  clear() {
    this.secrets.clear();
  }
}

export const secretStore = new SecretStore();
