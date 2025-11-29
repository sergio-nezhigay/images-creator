import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const [health, setHealth] = useState(null);

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
  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <s-admin-action>
      <s-stack direction="block">


        <s-text type="strong">{JSON.stringify(health, null, 2)}</s-text>
      </s-stack>
      <s-button slot="primary-action" onClick={() => {
          console.log('saving');
          close();
        }}>Done</s-button>
      <s-button slot="secondary-actions" onClick={() => {
          console.log('closing');
          close();
      }}>Close</s-button>
    </s-admin-action>
  );
}