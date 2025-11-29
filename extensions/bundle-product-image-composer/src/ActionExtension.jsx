import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const {i18n, close, data, extension: {target}} = shopify;
  console.log({data});

  // State for fetched image URLs
  const [imageUrls, setImageUrls] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageError, setImageError] = useState(null);

  // State for processing result
  const [processingResult, setProcessingResult] = useState(null);

  // Fetch images from selected bundle products on mount
  useEffect(() => {
    async function loadImages() {
      const selected = data.selected || [];

      if (selected.length === 0) {
        setImageError('Please select at least one bundle product');
        setLoadingImages(false);
        return;
      }

      const productIds = selected.map(item => item.id);

      try {
        setLoadingImages(true);
        setImageError(null);

        console.log('[Extension] Fetching images for products:', productIds);

        const res = await fetch('/app/api/fetch-bundle-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds })
        });

        if (!res.ok) {
          const errorData = await res.json();
          setImageError(errorData.error || `Error: ${res.status}`);
          setLoadingImages(false);
          return;
        }

        const responseData = await res.json();

        console.log('[Extension] Fetched images:', {
          count: responseData.imageUrls.length,
          metadata: responseData.metadata
        });

        if (responseData.imageUrls.length === 0) {
          setImageError('No images found in selected bundle products. Please ensure products have bundle components with featured images.');
          setLoadingImages(false);
          return;
        }

        setImageUrls(responseData.imageUrls);
        setImageError(null);
      } catch (err) {
        console.error('[Extension] Error fetching images:', err);
        setImageError(err.message);
      } finally {
        setLoadingImages(false);
      }
    }

    loadImages();
  }, [data.selected]);

  async function processImages() {
    if (imageUrls.length === 0) {
      setProcessingResult({ error: 'No images available to process' });
      return;
    }

    try {
      setProcessingResult({ status: 'processing' });

      console.log('[Extension] Processing images:', imageUrls.length);

      const res = await fetch("/app/api/image-process", {
        method: "POST",
        body: JSON.stringify({
          imageUrls: imageUrls  // Use fetched URLs instead of hardcoded
        })
      });

      if (!res.ok) {
        setProcessingResult({ error: `Error: ${res.status}` });
        return;
      }

      const data = await res.json();
      console.log('[Extension] Processing result:', data);
      setProcessingResult(data);
    } catch (err) {
      console.error('[Extension] Processing error:', err);
      setProcessingResult({ error: err.message });
    }
  }

  return (
    <s-admin-action>
      <s-stack direction="block">
        {/* Loading state */}
        {loadingImages && (
          <s-text type="subdued">Loading bundle component images...</s-text>
        )}

        {/* Error loading images */}
        {imageError && (
          <s-banner tone="critical">
            <s-text>{imageError}</s-text>
          </s-banner>
        )}

        {/* Success: Show fetched images count */}
        {!loadingImages && !imageError && imageUrls.length > 0 && (
          <s-banner tone="success">
            <s-text>Found {imageUrls.length} images from bundle components</s-text>
          </s-banner>
        )}

        {/* Processing result */}
        {processingResult && (
          <s-text type="strong">
            Processing Result: {JSON.stringify(processingResult, null, 2)}
          </s-text>
        )}
      </s-stack>

      <s-button
        slot="primary-action"
        onClick={() => {
          console.log('saving');
          close();
        }}
      >
        Done
      </s-button>

      <s-button
        onClick={processImages}
        disabled={loadingImages || imageUrls.length === 0}
      >
        Process Images
      </s-button>

      <s-button
        slot="secondary-actions"
        onClick={() => {
          console.log('closing');
          close();
        }}
      >
        Close
      </s-button>
    </s-admin-action>
  );
}