const sessions = new Map();

export function saveDialogueSession(session) {
  sessions.set(session.sessionId, {
    session,
    createdAt: Date.now(),
  });
}

export function getDialogueSession(sessionId) {
  return sessions.get(sessionId)?.session || null;
}

export function removeDialogueSession(sessionId) {
  sessions.delete(sessionId);
}
