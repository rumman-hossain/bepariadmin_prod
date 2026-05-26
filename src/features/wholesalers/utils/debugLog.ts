/** Debug session logging — remove after verification */
export function wholesalerDebugLog(
  location: string,
  message: string,
  hypothesisId: string,
  data: Record<string, unknown> = {},
  runId = 'post-fix',
) {
  // #region agent log
  fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6152d8' },
    body: JSON.stringify({
      sessionId: '6152d8',
      location,
      message,
      hypothesisId,
      runId,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
