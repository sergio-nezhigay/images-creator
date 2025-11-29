import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Request type
type FetchBundleImagesRequest = {
  productIds: string[]; // Array of GIDs like 'gid://shopify/Product/123'
};

// Response types
type ComponentImage = {
  productId: string;
  productTitle: string;
  componentProductId: string;
  componentProductTitle: string;
  imageUrl: string;
  altText: string | null;
};

type ProductImages = {
  productId: string;
  productTitle: string;
  componentImages: ComponentImage[];
  imageUrls: string[]; // URLs for this product only
};

type FetchBundleImagesSuccess = {
  products: ProductImages[]; // Grouped by product
  metadata: {
    requestedProducts: number;
    productsFound: number;
    componentsFound: number;
    imagesFound: number;
  };
};

type FetchBundleImagesError = {
  error: string;
};

// GraphQL response type
type GraphQLBundleComponentsResponse = {
  data: {
    product: {
      id: string;
      title: string;
      bundleComponents: {
        edges: Array<{
          node: {
            componentProduct: {
              id: string;
              title: string;
              featuredMedia?: {
                image?: {
                  url: string;
                  altText: string | null;
                };
              };
            };
          };
        }>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
};

/**
 * Health Check Endpoint (GET)
 *
 * Returns API status for CORS preflight requests.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cors } = await authenticate.admin(request);

  console.log("[Fetch Bundle Images] GET /app/api/fetch-bundle-images", {
    url: request.url,
    method: request.method,
  });

  return cors(
    Response.json({
      status: "ok",
      message: "Fetch bundle images API ready",
    })
  );
};

/**
 * Fetch Bundle Component Images Endpoint (POST)
 *
 * Accepts product IDs and returns featured images from bundle components.
 * Silently skips non-bundle products and components without images.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, cors } = await authenticate.admin(request);

  try {
    const body = await request.json();
    const { productIds } = body as FetchBundleImagesRequest;

    // Validate input
    if (!productIds || !Array.isArray(productIds)) {
      return cors(
        Response.json(
          { error: "productIds must be an array" } as FetchBundleImagesError,
          { status: 400 }
        )
      );
    }

    if (productIds.length === 0) {
      return cors(
        Response.json(
          { error: "productIds array is empty" } as FetchBundleImagesError,
          { status: 400 }
        )
      );
    }

    // Validate GID format
    const validGidPattern = /^gid:\/\/shopify\/Product\/\d+$/;
    for (const id of productIds) {
      if (!validGidPattern.test(id)) {
        return cors(
          Response.json(
            {
              error: `Invalid product ID format: ${id}`,
            } as FetchBundleImagesError,
            { status: 400 }
          )
        );
      }
    }

    console.log("[Fetch Bundle Images] Request:", {
      productIds,
      count: productIds.length,
    });

    // Fetch images from each product
    const productsWithImages: ProductImages[] = [];
    let productsFound = 0;
    let componentsFound = 0;
    let totalImagesFound = 0;

    for (const productId of productIds) {
      const response = await admin.graphql(
        `#graphql
          query GetBundleComponentImages($productId: ID!) {
            product(id: $productId) {
              id
              title
              bundleComponents(first: 10) {
                edges {
                  node {
                    componentProduct {
                      id
                      title
                      featuredMedia {
                        ... on MediaImage {
                          image {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        {
          variables: { productId },
        }
      );

      const data = (await response.json()) as GraphQLBundleComponentsResponse;

      if (data.errors) {
        console.error("[Fetch Bundle Images] GraphQL Errors:", data.errors);
        continue; // Skip this product
      }

      const product = data.data?.product;
      if (!product) {
        console.log("[Fetch Bundle Images] Product not found:", productId);
        continue; // Skip this product
      }

      productsFound++;

      const components = product.bundleComponents?.edges || [];
      console.log("[Fetch Bundle Images] Found components:", {
        productId,
        productTitle: product.title,
        componentCount: components.length,
      });

      // Collect images for this specific product
      const productImages: ComponentImage[] = [];

      for (const edge of components) {
        componentsFound++;
        const componentProduct = edge.node.componentProduct;
        const featuredMedia = componentProduct.featuredMedia;

        // Skip components without featured image (per user requirement)
        if (!featuredMedia || !featuredMedia.image) {
          continue;
        }

        productImages.push({
          productId: product.id,
          productTitle: product.title,
          componentProductId: componentProduct.id,
          componentProductTitle: componentProduct.title,
          imageUrl: featuredMedia.image.url,
          altText: featuredMedia.image.altText,
        });
      }

      // Only add product if it has images
      if (productImages.length > 0) {
        const imageUrls = productImages.map((img) => img.imageUrl);
        totalImagesFound += imageUrls.length;

        productsWithImages.push({
          productId: product.id,
          productTitle: product.title,
          componentImages: productImages,
          imageUrls,
        });

        console.log("[Fetch Bundle Images] Product images collected:", {
          productId: product.id,
          productTitle: product.title,
          imageCount: imageUrls.length,
        });
      }
    }

    console.log("[Fetch Bundle Images] Total extracted:", {
      productsWithImages: productsWithImages.length,
      totalImages: totalImagesFound,
    });

    const result: FetchBundleImagesSuccess = {
      products: productsWithImages,
      metadata: {
        requestedProducts: productIds.length,
        productsFound,
        componentsFound,
        imagesFound: totalImagesFound,
      },
    };

    return cors(Response.json(result));
  } catch (error) {
    console.error("[Fetch Bundle Images] Error:", error);
    return cors(
      Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        } as FetchBundleImagesError,
        { status: 500 }
      )
    );
  }
};
