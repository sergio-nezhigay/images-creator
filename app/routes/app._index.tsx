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
type ActionType = "processImages";

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



// Union type for all possible action responses
type ActionResponse =
  | ImageProcessingSuccess
  | ImageProcessingError

  | { error: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    switch (actionType) {


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

  const imageFetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();

  // ===== CONSTANTS =====
  const TEST_IMAGE_URLS = [
    "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    "https://www.shutterstock.com/image-photo/facial-cosmetic-products-containers-on-600nw-2566963627.jpg"
  ];

  // ===== LOADING STATES =====


  const isProcessingImages =
    ["loading", "submitting"].includes(imageFetcher.state) &&
    imageFetcher.formMethod === "POST";

  // ===== SIDE EFFECTS =====
  // Toast for product creation


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


  const processImagesHandler = () => {
    const formData = new FormData();
    formData.append("actionType", "processImages");
    formData.append("imageUrls", JSON.stringify(TEST_IMAGE_URLS));
    imageFetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="Shopify app template">




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


    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
