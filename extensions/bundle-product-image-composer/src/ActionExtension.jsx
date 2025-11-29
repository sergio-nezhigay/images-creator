import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const [health, setHealth] = useState(null);
  const [postResult, setPostResult] = useState(null);

  useEffect(() => {
    (async function fetchHealth() {

      const res = await fetch("/app/api/extension-data", {
        method: "GET",

      });

      if (!res.ok) {
        console.error('Network error');
        return;
      }

      const healthData = await res.json();
      setHealth(healthData);
    })();
  }, []);

  async function testPostRequest() {
    try {
      const res = await fetch("/app/api/extension-data", {
        method: "POST",
        body: JSON.stringify({
          actionType: "testData",
          testField: "Hello from Extension",
          productIds: ["123", "456"],
          metadata: { source: "action-extension" }
        })
      });

      if (!res.ok) {
        setPostResult({ error: `Error: ${res.status}` });
        return;
      }

      const data = await res.json();
      setPostResult(data);
    } catch (err) {
      setPostResult({ error: err.message });
    }
  }

  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <s-admin-action>
      <s-stack direction="block">


        <s-text type="strong">Health: {JSON.stringify(health, null, 2)}</s-text>
        {postResult && (
          <s-text type="strong">POST Result: {JSON.stringify(postResult, null, 2)}</s-text>
        )}
      </s-stack>
      <s-button slot="primary-action" onClick={() => {
          console.log('saving');
          close();
        }}>Done</s-button>
      <s-button onClick={testPostRequest}>Test POST</s-button>
      <s-button slot="secondary-actions" onClick={() => {
          console.log('closing');
          close();
      }}>Close</s-button>
    </s-admin-action>
  );
}