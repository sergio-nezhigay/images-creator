import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

const img_url1 = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cHJvZHVjdHxlbnwwfHwwfHx8MA%3D%3D";
const img_url2 = "https://help.rangeme.com/hc/article_attachments/360006928633/what_makes_a_good_product_image.jpg";

function Extension() {
      const {i18n, close, data, extension: {target}} = shopify;
  console.log({data});

//  Objectdata: selected: Array(2)0: {id: 'gid://shopify/Product/8714529931462'}1: {id: 'gid://shopify/Product/8714439721158'}
  const [processingResult, setProcessingResult] = useState(null);

  async function processImages() {
    try {
      setProcessingResult({ status: 'processing' });
      const res = await fetch("/app/api/image-process", {
        method: "POST",
        body: JSON.stringify({
          imageUrls: [img_url1, img_url2]
        })
      });

      if (!res.ok) {
        setProcessingResult({ error: `Error: ${res.status}` });
        return;
      }

      const data = await res.json();
      setProcessingResult(data);
    } catch (err) {
      setProcessingResult({ error: err.message });
    }
  }

  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <s-admin-action>
      <s-stack direction="block">
        {processingResult && (
          <s-text type="strong">Processing Result: {JSON.stringify(processingResult, null, 2)}</s-text>
        )}
      </s-stack>
      <s-button slot="primary-action" onClick={() => {
          console.log('saving');
          close();
        }}>Done</s-button>
      <s-button onClick={processImages}>Process Images</s-button>
      <s-button slot="secondary-actions" onClick={() => {
          console.log('closing');
          close();
      }}>Close</s-button>
    </s-admin-action>
  );
}