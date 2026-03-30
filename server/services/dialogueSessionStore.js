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

export function updateDialogueSession(sessionId, updater) {
  const entry = sessions.get(sessionId);
  if (!entry?.session) return null;

  const nextSession =
    typeof updater === 'function'
      ? updater(entry.session)
      : { ...entry.session, ...updater };

  entry.session = nextSession;
  return nextSession;
}

export function removeDialogueSession(sessionId) {
  sessions.delete(sessionId);
}
