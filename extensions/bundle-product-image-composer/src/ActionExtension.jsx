import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const { close, data} = shopify;
  console.log({data});

  const [products, setProducts] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageError, setImageError] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [processingResults, setProcessingResults] = useState([]);

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
          productsWithImages: responseData.products.length,
          metadata: responseData.metadata
        });

        if (responseData.products.length === 0) {
          setImageError('No images found in selected bundle products. Please ensure products have bundle components with featured images.');
          setLoadingImages(false);
          return;
        }

        setProducts(responseData.products);
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

  async function generateAndUpdateBundles() {
    if (products.length === 0) {
      setProcessingResults([{ error: 'No products available to process' }]);
      return;
    }

    try {
      setProcessing(true);
      setProcessingResults([]);
      setProcessedCount(0);

      console.log('[Extension] Processing products:', products.length);

      const results = [];

      // Process each product separately
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productNum = i + 1;

        console.log('[Extension] Processing product:', {
          productId: product.productId,
          productTitle: product.productTitle,
          imageCount: product.imageUrls.length
        });

        try {
          // Step 1: Generate composite image
          setCurrentStep(`Generating composite ${productNum} of ${products.length}...`);

          const processRes = await fetch("/app/api/image-process", {
            method: "POST",
            body: JSON.stringify({
              imageUrls: product.imageUrls
            })
          });

          if (!processRes.ok) {
            results.push({
              productId: product.productId,
              productTitle: product.productTitle,
              success: false,
              error: `Failed to generate composite: ${processRes.status}`
            });
            setProcessedCount(productNum);
            continue;
          }

          const processData = await processRes.json();
          const combinedImageUrl = processData.combinedImageUrl;

          if (!combinedImageUrl) {
            results.push({
              productId: product.productId,
              productTitle: product.productTitle,
              success: false,
              error: 'No composite image URL returned'
            });
            setProcessedCount(productNum);
            continue;
          }

          console.log('[Extension] Composite generated:', combinedImageUrl);

          // Step 2: Update product with composite image
          setCurrentStep(`Updating product ${productNum} of ${products.length}...`);

          const altText = `${product.productTitle} Bundle Components`;

          const updateRes = await fetch("/app/api/update-product-image", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.productId,
              imageUrl: combinedImageUrl,
              altText: altText
            })
          });

          if (!updateRes.ok) {
            results.push({
              productId: product.productId,
              productTitle: product.productTitle,
              success: false,
              combinedImageUrl: combinedImageUrl,
              error: `Failed to update product: ${updateRes.status}`
            });
            setProcessedCount(productNum);
            continue;
          }

          const updateData = await updateRes.json();

          if (updateData.success) {
            results.push({
              productId: product.productId,
              productTitle: product.productTitle,
              success: true,
              combinedImageUrl: combinedImageUrl,
              mediaCount: updateData.mediaCount
            });
          } else {
            results.push({
              productId: product.productId,
              productTitle: product.productTitle,
              success: false,
              combinedImageUrl: combinedImageUrl,
              error: updateData.error || 'Update failed'
            });
          }

          setProcessedCount(productNum);
          console.log('[Extension] Product updated:', {
            productId: product.productId,
            success: updateData.success
          });
        } catch (err) {
          console.error('[Extension] Error processing product:', err);
          results.push({
            productId: product.productId,
            productTitle: product.productTitle,
            success: false,
            error: err.message
          });
          setProcessedCount(productNum);
        }
      }

      setProcessingResults(results);
      setCurrentStep('');
      console.log('[Extension] All products processed:', results.length);
    } catch (err) {
      console.error('[Extension] Processing error:', err);
      setProcessingResults([{ error: err.message }]);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <s-admin-action>
      <s-stack direction="block">
        {/* Loading state */}
        {loadingImages && (
          <s-text type="address">Loading bundle component images...</s-text>
        )}

        {/* Error loading images */}
        {imageError && (
          <s-banner tone="critical">
            <s-text>{imageError}</s-text>
          </s-banner>
        )}

        {/* Success: Show fetched products and images count */}
        {!loadingImages && !imageError && products.length > 0 && (
          <s-banner tone="success">
            <s-text>
              Found {products.length} bundle product{products.length > 1 ? 's' : ''} with{' '}
              {products.reduce((sum, p) => sum + p.imageUrls.length, 0)} total component images
            </s-text>
          </s-banner>
        )}

        {/* Show products details */}
        {!loadingImages && !imageError && products.length > 0 && !processing && processingResults.length === 0 && (
          <s-stack direction="block">
            <s-text type="subdued">Ready to process:</s-text>
            {products.map((product, index) => (
              <s-text key={product.productId}>
                • {product.productTitle} ({product.imageUrls.length} component images)
              </s-text>
            ))}
          </s-stack>
        )}

        {/* Processing progress */}
        {processing && currentStep && (
          <s-banner tone="info">
            <s-text>{currentStep}</s-text>
            {processedCount > 0 && (
              <s-text type="subdued">
                Completed: {processedCount} of {products.length}
              </s-text>
            )}
          </s-banner>
        )}

        {/* Processing results */}
        {processingResults.length > 0 && (
          <s-stack direction="block">
            <s-text type="strong">Results:</s-text>
            {processingResults.map((result, index) => (
              <s-stack direction="block" key={result.productId || index}>
                {result.success ? (
                  <>
                    <s-text>✅ {result.productTitle}</s-text>
                    <s-text type="subdued">Composite image saved to product</s-text>
                    {result.combinedImageUrl && (
                      <s-link url={result.combinedImageUrl} target="_blank">
                        View composite image
                      </s-link>
                    )}
                  </>
                ) : (
                  <>
                    <s-text tone="critical">❌ {result.productTitle}</s-text>
                    <s-text tone="critical" type="subdued">Error: {result.error || 'Unknown error'}</s-text>
                    {result.combinedImageUrl && (
                      <s-link url={result.combinedImageUrl} target="_blank">
                        View composite image (not saved)
                      </s-link>
                    )}
                  </>
                )}
              </s-stack>
            ))}
          </s-stack>
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
        onClick={generateAndUpdateBundles}
        disabled={loadingImages || products.length === 0 || processing}
      >
        {processing ? 'Processing...' : 'Generate & Update Bundle Images'}
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