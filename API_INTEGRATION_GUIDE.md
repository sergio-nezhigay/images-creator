# API Integration Guide

This guide shows how to use environment variables and 3rd party APIs in your Shopify app backend.

## How Backend Routes Work in React Router

Your Shopify app uses React Router v7, which provides a unique way to create backend endpoints:

1. **Routes are files** in `app/routes/` - each file is both frontend UI and backend API
2. **`action` function** = backend handler (runs on server when form is submitted)
3. **`loader` function** = backend data fetcher (runs on server before page loads)
4. **Component function** = frontend UI (renders in browser)

### Example Flow:
```
User clicks button
  → Frontend calls action via useFetcher()
  → Backend action() runs on server
  → Can access env vars, call APIs, use databases
  → Returns JSON response
  → Frontend receives response in fetcher.data
```

## Current Implementation: Image Processing API

### Default Mode (No Setup Required)

The app currently uses **demo mode** which calls Lorem Picsum (free image API):

```bash
# No env vars needed - just run:
npm run dev
```

Then click "Process Images" - you'll see:
- A real API call to Lorem Picsum
- An actual image generated and displayed
- Metadata showing which API was used

### Using Environment Variables

Environment variables in Shopify apps can be set in multiple ways:

#### Option 1: During Development (Shopify CLI)

```bash
# The Shopify CLI automatically manages these:
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_APP_URL=...
```

#### Option 2: Custom Environment Variables

For your custom APIs, you can set env vars:

**Windows (PowerShell):**
```powershell
$env:IMAGE_API_MODE="demo"
npm run dev
```

**Mac/Linux:**
```bash
IMAGE_API_MODE="demo" npm run dev
```

**In shopify.app.toml** (persistent):
```toml
[env]
IMAGE_API_MODE = "demo"
```

#### Option 3: Deployment (Fly.io)

```bash
# Set secrets on Fly.io:
fly secrets set IMAGE_API_MODE=cloudinary
fly secrets set CLOUDINARY_API_KEY=your_key
fly secrets set CLOUDINARY_API_SECRET=your_secret
```

## Available API Modes

### 1. Demo Mode (Default - FREE)

Uses Lorem Picsum for testing. No signup required!

```bash
# No env var needed, or explicitly set:
IMAGE_API_MODE="demo"
```

**What it does:**
- Generates a random placeholder image
- Shows you how to call external APIs
- Returns a real image URL you can view

**Code location:** `app/services/imageProcessor.server.ts:69`

### 2. Cloudinary Mode (Commented Example)

For real image processing with Cloudinary:

**Setup:**
1. Sign up at https://cloudinary.com (free tier available)
2. Get your credentials from dashboard
3. Set environment variables:
   ```bash
   IMAGE_API_MODE="cloudinary"
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```
4. Uncomment the Cloudinary code in `imageProcessor.server.ts:123-176`
5. Install package: `npm install cloudinary`

**What it does:**
- Uploads images to Cloudinary
- Combines them using image transformations
- Returns URL of combined image

### 3. ImgBB Mode (Example)

For simple image uploads:

**Setup:**
1. Sign up at https://imgbb.com
2. Get API key from https://api.imgbb.com/
3. Set environment variables:
   ```bash
   IMAGE_API_MODE="imgbb"
   IMGBB_API_KEY="your_api_key"
   ```

**What it does:**
- Uploads first image to ImgBB
- Returns hosted image URL
- (Note: ImgBB doesn't combine images, this is just upload demo)

**Code location:** `app/services/imageProcessor.server.ts:185-234`

### 4. Custom API (Example Template)

Call your own image processing service:

**Setup:**
1. Set environment variables:
   ```bash
   IMAGE_API_MODE="custom"
   CUSTOM_IMAGE_API_URL="https://your-api.com/process"
   CUSTOM_IMAGE_API_KEY="your_api_key"
   ```
2. Uncomment custom API code in `imageProcessor.server.ts:238-281`

**Code location:** `app/services/imageProcessor.server.ts:238`

## Testing the Integration

### Test 1: Demo Mode (Works Now!)

```bash
npm run dev
```

1. Open your app
2. Scroll to "Image Processing" section
3. Click "Process Images"
4. You should see:
   - Loading spinner on button
   - Success toast: "Images processed successfully"
   - API info: "Lorem Picsum (Free Demo API)"
   - A real placeholder image displayed

### Test 2: Check Console Logs

The backend logs to your terminal:

```bash
Processing 3 images using mode: demo
Generated demo image URL: https://picsum.photos/seed/1234567890/800/600
```

This shows your backend is running and making API calls!

### Test 3: Try Different Modes

**Windows PowerShell:**
```powershell
$env:IMAGE_API_MODE="cloudinary"
npm run dev
```

You'll get an error (expected) saying Cloudinary env vars are missing. This proves:
- Environment variables are working ✓
- Backend is reading them ✓
- Error handling is working ✓

## How to Add Your Own API

### Example: Adding a New Image Service

1. **Add your API mode** to `imageProcessor.server.ts`:

```typescript
if (apiMode === "myapi") {
  const apiKey = process.env.MY_API_KEY;

  if (!apiKey) {
    throw new Error("MY_API_KEY environment variable is required");
  }

  try {
    const response = await fetch("https://myapi.com/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        images: imageUrls,
        // ... your API parameters
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      combinedImageUrl: data.resultUrl,
      processedAt: new Date().toISOString(),
      metadata: {
        originalCount: imageUrls.length,
        processingMethod: "myapi-processing",
        apiUsed: "My API Service",
      },
    };
  } catch (error) {
    console.error("My API error:", error);
    throw new Error(
      `Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
```

2. **Set environment variables:**

```bash
IMAGE_API_MODE="myapi"
MY_API_KEY="your_key_here"
```

3. **Test it:**

```bash
npm run dev
# Click "Process Images" button
# Check console logs for API calls
```

## Common Patterns

### Pattern 1: API with Headers

```typescript
const response = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.API_KEY}`,
    "X-Custom-Header": "value",
  },
  body: JSON.stringify(payload),
});
```

### Pattern 2: FormData Upload

```typescript
const formData = new FormData();
formData.append("file", imageBlob);
formData.append("key", process.env.API_KEY);

const response = await fetch(apiUrl, {
  method: "POST",
  body: formData,
});
```

### Pattern 3: Error Handling

```typescript
try {
  const response = await fetch(apiUrl, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error("API call failed:", error);
  throw error; // Will show in UI as error banner
}
```

### Pattern 4: Timeout Protection

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

try {
  const response = await fetch(apiUrl, {
    signal: controller.signal,
    ...options,
  });
  clearTimeout(timeoutId);

  return await response.json();
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    throw new Error('API request timed out after 30 seconds');
  }
  throw error;
}
```

## Accessing Env Vars in Your Code

### In Server Files (*.server.ts)

```typescript
// ✅ Works - server-side code
const apiKey = process.env.MY_API_KEY;
```

### In Route Actions/Loaders

```typescript
// ✅ Works - runs on server
export const action = async ({ request }) => {
  const apiKey = process.env.MY_API_KEY;
  // ... use it
};
```

### In Frontend Components

```typescript
// ❌ NEVER DO THIS - exposes secrets to browser!
const apiKey = process.env.MY_API_KEY; // undefined or exposed!

// ✅ Do this instead - call backend action
const fetcher = useFetcher();
fetcher.submit(data, { method: "POST" });
// Backend action uses env vars securely
```

## Security Best Practices

### ✅ DO:
- Store API keys in environment variables
- Access env vars only in server-side code (`.server.ts`, actions, loaders)
- Use `.gitignore` to exclude `.env` files
- Use Shopify CLI or deployment platform for env vars in production

### ❌ DON'T:
- Hard-code API keys in your code
- Access `process.env` in frontend components
- Commit `.env` files to git
- Log sensitive values with `console.log()`

## Debugging

### Check Env Vars Are Set

Add to your action:

```typescript
console.log("IMAGE_API_MODE:", process.env.IMAGE_API_MODE);
console.log("API keys set:", {
  cloudinary: !!process.env.CLOUDINARY_API_KEY,
  imgbb: !!process.env.IMGBB_API_KEY,
  // ... others
});
```

### Monitor API Calls

The service already logs:

```typescript
console.log(`Processing ${imageUrls.length} images using mode: ${apiMode}`);
console.log(`Generated demo image URL: ${combinedImageUrl}`);
```

Check your terminal where `npm run dev` is running!

### Test API Responses

```typescript
const data = await response.json();
console.log("API response:", JSON.stringify(data, null, 2));
```

## Next Steps

1. **Test demo mode**: Run `npm run dev` and click "Process Images"
2. **Try an API**: Sign up for Cloudinary or ImgBB, uncomment code, add env vars
3. **Build your own**: Follow the custom API pattern to integrate your service
4. **Deploy**: Set env vars on Fly.io with `fly secrets set KEY=value`

## Questions?

- The backend code is in: `app/services/imageProcessor.server.ts`
- The frontend UI is in: `app/routes/app._index.tsx`
- Environment variables for Shopify: https://shopify.dev/docs/apps/tools/cli/environments

Your backend in React Router is just a function that runs on the server - you can do ANYTHING a Node.js server can do! Database queries, API calls, file uploads, image processing, etc.
