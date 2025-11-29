import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { processImages } from "../services/imageProcessor.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cors } = await authenticate.admin(request);

  try {
    const body = await request.json();
    const { imageUrls } = body;

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return cors(
        Response.json(
          { error: "Invalid request: imageUrls must be an array" },
          { status: 400 }
        )
      );
    }

    const result = await processImages(imageUrls);

    return cors(Response.json(result));
  } catch (error) {
    console.error("[Image Processing] Error:", error);
    return cors(
      Response.json(
        {
          error:
            error instanceof Error ? error.message : "An unknown error occurred",
        },
        { status: 500 }
      )
    );
  }
};

export const loader = async ({ request }: ActionFunctionArgs) => {
    const { cors } = await authenticate.admin(request);
    return cors(Response.json({ status: "ok", message: "Image processing API ready" }));
};
