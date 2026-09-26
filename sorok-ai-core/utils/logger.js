// In-memory circular buffer to preserve the latest 500 logs for the API and Live Console
const recentLogs = [];
const MAX_LOGS = 500;

export function addLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    level,
    message,
    meta
  };

  recentLogs.unshift(logEntry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }

  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  
  if (level === 'ERROR') {
    console.error(`${prefix} ${message}${metaStr}`);
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}${metaStr}`);
  } else {
    console.log(`${prefix} ${message}${metaStr}`);
  }

  return logEntry;
}

export function getLogs(limit = 100, levelFilter = null) {
  if (levelFilter) {
    return recentLogs.filter(l => l.level === levelFilter).slice(0, limit);
  }
  return recentLogs.slice(0, limit);
}

export function clearLogs() {
  recentLogs.length = 0;
}
