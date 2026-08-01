import { useState } from 'react';
import { sendNativeRequest } from '../../services/native-host-client';
export function PopupApp() {
  const [status, setStatus] = useState('Not checked');
  const [detail, setDetail] = useState('');
  async function healthCheck() {
    setStatus('Checking…');
    const response = await sendNativeRequest({
      protocolVersion: 1,
      requestId: crypto.randomUUID(),
      type: 'health-check',
      payload: {},
    });
    if (response.success) {
      setStatus('Connected');
      setDetail(
        `Native host ${String((response.data as { hostVersion: string }).hostVersion)}`,
      );
    } else {
      setStatus('Disconnected');
      setDetail(response.error.message);
    }
  }
  return (
    <main className="popup">
      <h1>AI Message Assistant</h1>
      <p>
        <strong>Status:</strong> {status}
      </p>
      <p>{detail}</p>
      <button onClick={healthCheck}>Run health check</button>
      <button
        className="secondary"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Open options
      </button>
      <small>v0.1.0 · API keys are configured only with the local CLI.</small>
    </main>
  );
}
