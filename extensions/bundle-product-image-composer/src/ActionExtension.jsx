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

  async function processAllProducts() {
    if (products.length === 0) {
      setProcessingResults([{ error: 'No products available to process' }]);
      return;
    }

    try {
      console.log('[Extension] Processing products:', products.length);

      const results = [];

      // Process each product separately
      for (const product of products) {
        console.log('[Extension] Processing product:', {
          productId: product.productId,
          productTitle: product.productTitle,
          imageCount: product.imageUrls.length
        });

        try {
          const res = await fetch("/app/api/image-process", {
            method: "POST",
            body: JSON.stringify({
              imageUrls: product.imageUrls
            })
          });

          if (!res.ok) {
            results.push({
              productId: product.productId,
              productTitle: product.productTitle,
              error: `Error: ${res.status}`
            });
            continue;
          }

          const data = await res.json();
          results.push({
            productId: product.productId,
            productTitle: product.productTitle,
            ...data
          });

          console.log('[Extension] Product processed:', {
            productId: product.productId,
            result: data
          });
        } catch (err) {
          console.error('[Extension] Error processing product:', err);
          results.push({
            productId: product.productId,
            productTitle: product.productTitle,
            error: err.message
          });
        }
      }

      setProcessingResults(results);
      console.log('[Extension] All products processed:', results.length);
    } catch (err) {
      console.error('[Extension] Processing error:', err);
      setProcessingResults([{ error: err.message }]);
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
        {!loadingImages && !imageError && products.length > 0 && (
          <s-stack direction="block">
            {products.map((product, index) => (
              <s-text key={product.productId}>
                {index + 1}. {product.productTitle} - {product.imageUrls.length} images
              </s-text>
            ))}
          </s-stack>
        )}

        {/* Processing results */}
        {processingResults.length > 0 && (
          <s-stack direction="block">
            <s-text type="strong">Combined Images:</s-text>
            {processingResults.map((result, index) => (
              <s-stack direction="block" key={result.productId || index}>
                <s-text type="strong">{result.productTitle}</s-text>
                {result.combinedImageUrl ? (
                  <s-link url={result.combinedImageUrl} target="_blank">
                    {result.combinedImageUrl}
                  </s-link>
                ) : (
                  <s-text tone="critical">Error: {result.error || 'No image URL'}</s-text>
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
        onClick={processAllProducts}
        disabled={loadingImages || products.length === 0}
      >
        Process All Products
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