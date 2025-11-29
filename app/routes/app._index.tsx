import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { processImages } from "../services/imageProcessor.server";

// Action discriminator types
type ActionType = "createProduct" | "processImages";

// Image Processing Types
type ImageProcessingSuccess = {
  actionType: "processImages";
  combinedImageUrl: string;
  processedAt: string;
};

type ImageProcessingError = {
  actionType: "processImages";
  error: string;
};

// Product Creation Types
type ProductCreationSuccess = {
  actionType: "createProduct";
  product: any;
  variant: any;
};

// Union type for all possible action responses
type ActionResponse =
  | ImageProcessingSuccess
  | ImageProcessingError
  | ProductCreationSuccess
  | { error: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    switch (actionType) {
      case "createProduct": {
        // ===== EXISTING PRODUCT CREATION LOGIC =====
        const color = ["Red", "Orange", "Yellow", "Green"][
          Math.floor(Math.random() * 4)
        ];

        const response = await admin.graphql(
          `#graphql
            mutation populateProduct($product: ProductCreateInput!) {
              productCreate(product: $product) {
                product {
                  id
                  title
                  handle
                  status
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        price
                        barcode
                        createdAt
                      }
                    }
                  }
                }
              }
            }`,
          {
            variables: {
              product: {
                title: `${color} Snowboard`,
              },
            },
          },
        );

        const responseJson = await response.json();
        const product = responseJson.data!.productCreate!.product!;
        const variantId = product.variants.edges[0]!.node!.id!;

        const variantResponse = await admin.graphql(
          `#graphql
          mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants {
                id
                price
                barcode
                createdAt
              }
            }
          }`,
          {
            variables: {
              productId: product.id,
              variants: [{ id: variantId, price: "100.00" }],
            },
          },
        );

        const variantResponseJson = await variantResponse.json();

        return {
          actionType: "createProduct" as const,
          product: responseJson!.data!.productCreate!.product,
          variant:
            variantResponseJson!.data!.productVariantsBulkUpdate!
              .productVariants,
        };
      }

      case "processImages": {
        // ===== NEW IMAGE PROCESSING LOGIC =====

        // Extract imageUrls from formData
        const imageUrlsJson = formData.get("imageUrls");

        // Validate payload exists
        if (!imageUrlsJson || typeof imageUrlsJson !== "string") {
          return {
            actionType: "processImages" as const,
            error: "No image URLs provided",
          };
        }

        // Parse JSON array
        let imageUrls: string[];
        try {
          imageUrls = JSON.parse(imageUrlsJson);
        } catch {
          return {
            actionType: "processImages" as const,
            error: "Invalid image URLs format",
          };
        }

        // Additional validation
        if (!Array.isArray(imageUrls)) {
          return {
            actionType: "processImages" as const,
            error: "Image URLs must be an array",
          };
        }

        // Call service
        const result = await processImages(imageUrls);

        // Return success response
        return {
          actionType: "processImages" as const,
          ...result,
        };
      }

      default:
        return { error: "Unknown action type" };
    }
  } catch (error) {
    // Error handling with console.log per CLAUDE.md
    console.error("Action error:", error);

    return {
      actionType: actionType || "unknown",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};

export default function Index() {
  // ===== FETCHERS =====
  const productFetcher = useFetcher<typeof action>();
  const imageFetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();

  // ===== CONSTANTS =====
  const TEST_IMAGE_URLS = [
    "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  ];

  // ===== LOADING STATES =====
  const isCreatingProduct =
    ["loading", "submitting"].includes(productFetcher.state) &&
    productFetcher.formMethod === "POST";

  const isProcessingImages =
    ["loading", "submitting"].includes(imageFetcher.state) &&
    imageFetcher.formMethod === "POST";

  // ===== SIDE EFFECTS =====
  // Toast for product creation
  useEffect(() => {
    if (
      productFetcher.data?.actionType === "createProduct" &&
      productFetcher.data?.product?.id
    ) {
      shopify.toast.show("Product created");
    }
  }, [productFetcher.data, shopify]);

  // Toast for image processing
  useEffect(() => {
    if (imageFetcher.data?.actionType === "processImages") {
      if ("error" in imageFetcher.data) {
        shopify.toast.show(imageFetcher.data.error || "An error occurred", {
          isError: true,
        });
      } else {
        shopify.toast.show("Images processed successfully");
      }
    }
  }, [imageFetcher.data, shopify]);

  // ===== ACTION HANDLERS =====
  const generateProduct = () => {
    const formData = new FormData();
    formData.append("actionType", "createProduct");
    productFetcher.submit(formData, { method: "POST" });
  };

  const processImagesHandler = () => {
    const formData = new FormData();
    formData.append("actionType", "processImages");
    formData.append("imageUrls", JSON.stringify(TEST_IMAGE_URLS));
    imageFetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="Shopify app template">
      <s-button slot="primary-action" onClick={generateProduct}>
        Generate a product
      </s-button>

      <s-section heading="Congrats on creating a new Shopify app 🎉">
        <s-paragraph>
          This embedded app template uses{" "}
          <s-link
            href="https://shopify.dev/docs/apps/tools/app-bridge"
            target="_blank"
          >
            App Bridge
          </s-link>{" "}
          interface examples like an{" "}
          <s-link href="/app/additional">additional page in the app nav</s-link>
          , as well as an{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            Admin GraphQL
          </s-link>{" "}
          mutation demo, to provide a starting point for app development.
        </s-paragraph>
      </s-section>
      <s-section heading="Get started with products">
        <s-paragraph>
          Generate a product with GraphQL and get the JSON output for that
          product. Learn more about the{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
            target="_blank"
          >
            productCreate
          </s-link>{" "}
          mutation in our API references.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button
            onClick={generateProduct}
            {...(isCreatingProduct ? { loading: true } : {})}
          >
            Generate a product
          </s-button>
          {productFetcher.data?.actionType === "createProduct" &&
            productFetcher.data?.product && (
              <s-button
                onClick={() => {
                  shopify.intents.invoke?.("edit:shopify/Product", {
                    value: productFetcher.data?.product?.id,
                  });
                }}
                target="_blank"
                variant="tertiary"
              >
                Edit product
              </s-button>
            )}
        </s-stack>
        {productFetcher.data?.actionType === "createProduct" &&
          productFetcher.data?.product && (
            <s-section heading="productCreate mutation">
              <s-stack direction="block" gap="base">
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <pre style={{ margin: 0 }}>
                    <code>
                      {JSON.stringify(productFetcher.data.product, null, 2)}
                    </code>
                  </pre>
                </s-box>

                <s-heading>productVariantsBulkUpdate mutation</s-heading>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <pre style={{ margin: 0 }}>
                    <code>
                      {JSON.stringify(productFetcher.data.variant, null, 2)}
                    </code>
                  </pre>
                </s-box>
              </s-stack>
            </s-section>
          )}
      </s-section>

      <s-section heading="Image Processing">
        <s-paragraph>
          Process multiple images and combine them into a single image. This
          demo uses a placeholder service that returns a mock combined image
          URL.
        </s-paragraph>

        <s-stack direction="block" gap="base">
          <div>
            <strong>Test Image URLs</strong>
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="base">
                {TEST_IMAGE_URLS.map((url, index) => (
                  <s-text key={index}>
                    {index + 1}. {url}
                  </s-text>
                ))}
              </s-stack>
            </s-box>
          </div>

          <s-button
            onClick={processImagesHandler}
            {...(isProcessingImages ? { loading: true } : {})}
          >
            Process Images
          </s-button>

          {imageFetcher.data?.actionType === "processImages" && (
            <>
              {"error" in imageFetcher.data ? (
                <s-banner tone="critical">
                  <s-text>{imageFetcher.data.error}</s-text>
                </s-banner>
              ) : (
                <s-stack direction="block" gap="base">
                  <strong>Processing Result</strong>

                  {imageFetcher.data.metadata && (
                    <s-box
                      padding="base"
                      borderWidth="base"
                      borderRadius="base"
                      background="subdued"
                    >
                      <s-stack direction="block" gap="base">
                        <s-text>
                          <strong>API Used:</strong>{" "}
                          {imageFetcher.data.metadata.apiUsed}
                        </s-text>
                        <s-text>
                          <strong>Processing Method:</strong>{" "}
                          {imageFetcher.data.metadata.processingMethod}
                        </s-text>
                        <s-text>
                          <strong>Images Processed:</strong>{" "}
                          {imageFetcher.data.metadata.originalCount}
                        </s-text>
                      </s-stack>
                    </s-box>
                  )}

                  <s-box
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                    background="subdued"
                  >
                    <s-stack direction="block" gap="base">
                      <div>
                        <s-text>
                          <strong>Combined Image URL:</strong>
                        </s-text>
                        <s-link
                          href={imageFetcher.data.combinedImageUrl}
                          target="_blank"
                        >
                          {imageFetcher.data.combinedImageUrl}
                        </s-link>
                      </div>
                      <s-text>
                        <strong>Processed At:</strong>{" "}
                        {new Date(
                          imageFetcher.data.processedAt
                        ).toLocaleString()}
                      </s-text>

                      <div>
                        <s-text>
                          <strong>Preview:</strong>
                        </s-text>
                        <img
                          src={imageFetcher.data.combinedImageUrl}
                          alt="Combined result"
                          style={{
                            maxWidth: "100%",
                            height: "auto",
                            marginTop: "8px",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                    </s-stack>
                  </s-box>
                </s-stack>
              )}
            </>
          )}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="App template specs">
        <s-paragraph>
          <s-text>Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Interface: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
          >
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>API: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Next steps">
        <s-unordered-list>
          <s-list-item>
            Build an{" "}
            <s-link
              href="https://shopify.dev/docs/apps/getting-started/build-app-example"
              target="_blank"
            >
              example app
            </s-link>
          </s-list-item>
          <s-list-item>
            Explore Shopify&apos;s API with{" "}
            <s-link
              href="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
              target="_blank"
            >
              GraphiQL
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
