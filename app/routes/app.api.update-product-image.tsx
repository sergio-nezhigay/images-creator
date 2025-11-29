import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Request type
type UpdateProductImageRequest = {
  productId: string;
  imageUrl: string;
  altText: string;
};

// Response types
type UpdateProductImageSuccess = {
  productId: string;
  success: true;
  mediaCount: number;
};

type UpdateProductImageError = {
  productId: string;
  success: false;
  error: string;
};

// GraphQL response type
type GraphQLProductUpdateResponse = {
  data: {
    productUpdate: {
      product: {
        id: string;
        media: {
          nodes: Array<{
            alt: string;
            mediaContentType: string;
            preview: {
              status: string;
            };
          }>;
        };
      } | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
};

/**
 * Health Check Endpoint (GET)
 *
 * Returns API status for CORS preflight requests.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cors } = await authenticate.admin(request);

  console.log("[Update Product Image] GET /app/api/update-product-image", {
    url: request.url,
    method: request.method,
  });

  return cors(
    Response.json({
      status: "ok",
      message: "Update product image API ready",
    })
  );
};

/**
 * Update Product Image Endpoint (POST)
 *
 * Accepts product ID and image URL, then updates the product with the image.
 * Prepends the image to product media (becomes featured image).
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, cors } = await authenticate.admin(request);

  try {
    const body = await request.json();
    const { productId, imageUrl, altText } = body as UpdateProductImageRequest;

    // Validate input
    if (!productId || !imageUrl || !altText) {
      return cors(
        Response.json(
          {
            productId: productId || "unknown",
            success: false,
            error: "Missing required fields: productId, imageUrl, or altText",
          } as UpdateProductImageError,
          { status: 400 }
        )
      );
    }

    // Validate GID format
    const validGidPattern = /^gid:\/\/shopify\/Product\/\d+$/;
    if (!validGidPattern.test(productId)) {
      return cors(
        Response.json(
          {
            productId,
            success: false,
            error: `Invalid product ID format: ${productId}`,
          } as UpdateProductImageError,
          { status: 400 }
        )
      );
    }

    // Validate image URL format
    try {
      new URL(imageUrl);
    } catch {
      return cors(
        Response.json(
          {
            productId,
            success: false,
            error: `Invalid image URL format: ${imageUrl}`,
          } as UpdateProductImageError,
          { status: 400 }
        )
      );
    }

    console.log("[Update Product Image] Updating product:", {
      productId,
      imageUrl,
      altText,
    });

    // Execute productUpdate mutation
    const response = await admin.graphql(
      `#graphql
        mutation UpdateProductMedia($productId: ID!, $imageUrl: String!, $altText: String!) {
          productUpdate(
            product: { id: $productId },
            media: [{
              originalSource: $imageUrl,
              alt: $altText,
              mediaContentType: IMAGE
            }]
          ) {
            product {
              id
              media(first: 5) {
                nodes {
                  alt
                  mediaContentType
                  preview {
                    status
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: { productId, imageUrl, altText },
      }
    );

    const data = (await response.json()) as GraphQLProductUpdateResponse;

    // Check for GraphQL user errors
    const userErrors = data.data?.productUpdate?.userErrors || [];
    if (userErrors.length > 0) {
      const errorMessages = userErrors.map((e) => e.message).join(", ");
      console.error("[Update Product Image] User errors:", userErrors);
      return cors(
        Response.json(
          {
            productId,
            success: false,
            error: `Product update failed: ${errorMessages}`,
          } as UpdateProductImageError,
          { status: 400 }
        )
      );
    }

    const product = data.data?.productUpdate?.product;
    if (!product) {
      console.error("[Update Product Image] No product in response");
      return cors(
        Response.json(
          {
            productId,
            success: false,
            error: "Product update returned no product data",
          } as UpdateProductImageError,
          { status: 500 }
        )
      );
    }

    const mediaCount = product.media?.nodes?.length || 0;

    console.log("[Update Product Image] Success:", {
      productId,
      mediaCount,
    });

    const result: UpdateProductImageSuccess = {
      productId,
      success: true,
      mediaCount,
    };

    return cors(Response.json(result));
  } catch (error) {
    console.error("[Update Product Image] Error:", error);
    return cors(
      Response.json(
        {
          productId: "unknown",
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        } as UpdateProductImageError,
        { status: 500 }
      )
    );
  }
};
