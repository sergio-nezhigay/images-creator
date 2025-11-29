import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import { authenticate } from "../shopify.server";

// Health Check Types (GET request)
type HealthCheckResponse = {
  status: "ok";
  timestamp: string;
  environment: string;
  shopDomain?: string;
  sessionId?: string;
  message: string;
};

// Test Data Submission Types (POST request)
type TestDataRequest = {
  testField?: string;
  productIds?: string[];
  metadata?: Record<string, any>;
};

type TestDataSuccess = {
  actionType: "testData";
  received: TestDataRequest;
  processedAt: string;
  message: string;
};

type TestDataError = {
  actionType: "testData";
  error: string;
};

type ActionResponse = TestDataSuccess | TestDataError | { error: string };

/**
 * Health Check Endpoint (GET)
 *
 * Returns API status, shop information, and environment details.
 * Used by the Admin UI Extension to verify connectivity and CORS setup.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cors, session } = await authenticate.admin(request);

  console.log("[Health Check] GET /app/api/extension-data", {
    url: request.url,
    method: request.method,
    shop: session.shop,
  });

  const healthData: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    shopDomain: session.shop,
    sessionId: session.id.substring(0, 8) + "...",
    message: "Extension data API is working correctly",
  };

  return cors(Response.json(healthData));
};

/**
 * Test Data Submission Endpoint (POST)
 *
 * Accepts test data from the Admin UI Extension and echoes it back.
 * Used to verify POST requests and data transfer work correctly.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { cors, session } = await authenticate.admin(request);

  console.log("[Test Data] POST /app/api/extension-data", {
    shop: session.shop,
  });

  try {
    const body = await request.json();
    const actionType = body.actionType as string;

    if (actionType !== "testData") {
      return cors(
        Response.json({
          error: `Unknown action type: ${actionType}`,
        })
      );
    }

    const testData: TestDataRequest = {
      testField: body.testField,
      productIds: body.productIds,
      metadata: body.metadata,
    };

    console.log("[Test Data] Received:", testData);

    const response: TestDataSuccess = {
      actionType: "testData",
      received: testData,
      processedAt: new Date().toISOString(),
      message: `Successfully received test data from ${session.shop}`,
    };

    return cors(Response.json(response));

  } catch (error) {
    console.error("[Test Data] Error:", error);

    const errorResponse: TestDataError = {
      actionType: "testData",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };

    return cors(Response.json(errorResponse, { status: 500 }));
  }
};
