When developing Shopify app routes for use with Shopify extensions (such as Admin UI Extensions, Checkout UI Extensions, or Customer Account Extensions) in local development, CORS (Cross-Origin Resource Sharing) errors are common because your extension is served from a Shopify CDN domain (like extensions.shopifycdn.com), while your app backend is running on localhost or a tunnel URL.

Common Approach to Avoid CORS Errors
The recommended approach is to use the CORS helper provided by Shopify's app framework when returning responses from your app routes. This ensures that the correct CORS headers are set so that requests from Shopify's extension domains are allowed.

Example: Using the cors Helper in a Route
If you are using the Shopify React Router or Remix app template, you should wrap your response with the cors function returned from the authenticate.admin, authenticate.public.checkout, or authenticate.public.customerAccount methods, depending on your extension type.

For Admin UI Extensions
js
Copy
1
2
3
4
5
6
7
8
9
10
11
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { cors } = await authenticate.admin(request);

  // Your logic here, e.g., fetch data
  const data = { message: "Hello from backend!" };

  // Wrap your response with cors
  return cors(Response.json(data));
};
This ensures that requests from your extension (hosted on Shopify's CDN) will not be blocked by CORS.
For Checkout or Customer Account Extensions
Use the corresponding authenticate method:

js
Copy
1
2
3
4
5
6
7
8
9
10
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { cors } = await authenticate.public.checkout(request);
  // or
  // const { cors } = await authenticate.public.customerAccount(request);

  const data = { message: "Checkout extension data" };
  return cors(Response.json(data));
};
This pattern is the same for both Remix and React Router templates.
Additional Local Development Tips
Use HTTPS: Shopify extensions require your backend to be served over HTTPS. Use Shopify CLI's tunnel (Cloudflare) or another HTTPS tunnel (like ngrok).
Allowed Origins: The CORS helper automatically sets the correct Access-Control-Allow-Origin headers for Shopify extension domains.
Do not set CORS headers manually unless you have a very custom setup. The helper is designed to handle Shopify's requirements.
Summary
Always wrap your route responses with the cors helper returned from the appropriate authenticate method.
This is required for any route that will be called from a Shopify extension, especially in local development.
This approach works for all extension types (Admin, Checkout, Customer Account).
References:

Connect UI extensions to your app's backend
Authenticate Admin (React Router)
Authenticate Public Checkout (Remix)
Authenticate Public Customer Account (Remix)
Was this answer useful?

Yes

No
i use fetch from admin shopify extension . my target = "admin.product-index.selection-action.render". need to fetch my shopify app route
To fetch data from your Shopify app backend route using fetch from an Admin UI Extension (such as with the target "admin.product-index.selection-action.render"), you need to ensure your backend route is CORS-compatible with Shopify's extension domains.

Key steps:

Use the CORS helper in your app backend route:

In your app backend (Remix or React Router), wrap your response with the cors helper from the authenticate.admin method. This ensures the correct CORS headers are set for requests coming from Shopify's extension CDN.
Example (Remix or React Router backend):

js
Copy
1
2
3
4
5
6
7
8
9
10
11
   import { authenticate } from "../shopify.server";

   export const loader = async ({ request }) => {
     const { cors } = await authenticate.admin(request);

     // Your backend logic here
     const data = { message: "Hello from backend!" };

     // Wrap your response with cors
     return cors(Response.json(data));
   };
Call your app route from the extension using fetch:
In your extension code, use fetch to call your app's backend route (which should be exposed via a tunnel or HTTPS in local dev).
Example:
js
Copy
1
2
3
4
5
6
7
8
9
   const response = await fetch("https://your-app-url.com/api/your-route", {
     method: "POST", // or "GET"
     headers: {
       "Content-Type": "application/json",
       // Add any required headers, such as authentication if needed
     },
     body: JSON.stringify({ key: "value" }),
   });
   const data = await response.json();
Ensure your app is served over HTTPS:
Shopify extensions require HTTPS for backend routes. Use Shopify CLI's tunnel or another HTTPS tunnel (like ngrok) during local development.
Summary:

Always wrap your backend route responses with the cors helper from authenticate.admin.
Use fetch in your extension to call your backend route.
Make sure your backend is accessible via HTTPS.
This approach will allow your Admin UI Extension (including "admin.product-index.selection-action.render") to fetch data from your app backend without CORS issues. If you skip the cors helper, you will get CORS errors in the browser.