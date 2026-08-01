import { useState } from 'react';
import type { Operation } from '@zi-language-assistant/contracts';
import { sendNativeRequest } from '../../services/native-host-client';
export function OptionsApp() {
  const [text, setText] = useState('I have check this issue.');
  const [operation, setOperation] = useState<Operation>('grammar');
  const [result, setResult] = useState('');
  const [metadata, setMetadata] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    setError('');
    const response = await sendNativeRequest({
      protocolVersion: 1,
      requestId: crypto.randomUUID(),
      type: 'improve-message',
      payload: {
        text,
        operation,
        sourceLanguage: 'auto',
        targetLanguage: 'English',
        tone: 'professional',
      },
    });
    setLoading(false);
    if (!response.success) {
      setError(`${response.error.code}: ${response.error.message}`);
      return;
    }
    const data = response.data as {
      suggestedText: string;
      model: string;
      usage: { inputTokens: number; outputTokens: number };
      durationMs: number;
    };
    setResult(data.suggestedText);
    setMetadata(
      `${data.model} · ${data.usage.inputTokens}/${data.usage.outputTokens} tokens · ${data.durationMs} ms`,
    );
  }
  return (
    <main className="options">
      <h1>AI Message Assistant</h1>
      <p>
        Configure your API key with <code>ai-message-host configure</code>; it
        never enters this extension.
      </p>
      <label>
        Draft
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <label>
        Operation
        <select
          value={operation}
          onChange={(event) => setOperation(event.target.value as Operation)}
        >
          {['grammar', 'translate', 'professional', 'concise'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <button disabled={loading || !text.trim()} onClick={submit}>
        {loading ? 'Improving…' : 'Improve message'}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <label>
            Suggestion
            <textarea readOnly value={result} />
          </label>
          <p>{metadata}</p>
        </>
      )}
    </main>
  );
}
