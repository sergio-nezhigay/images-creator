/**
 * Image Processing Service
 *
 * ==============================================================
 * 3RD PARTY API EXAMPLE IMPLEMENTATION
 * ==============================================================
 * This implementation demonstrates how to:
 * 1. Use environment variables for API configuration
 * 2. Call external APIs from your backend
 * 3. Handle API responses and errors
 *
 * The example uses Lorem Picsum (free, no auth) for testing,
 * but includes commented examples for real services.
 * ==============================================================
 */

export type ProcessImageResult = {
  combinedImageUrl: string;
  processedAt: string;
  metadata?: {
    originalCount: number;
    processingMethod: string;
    apiUsed?: string;
  };
};

/**
 * Processes multiple image URLs and combines them into a single image
 *
 * @param imageUrls - Array of valid image URLs to process
 * @returns Promise resolving to combined image URL and processing timestamp
 * @throws Error if imageUrls is empty or contains invalid URLs
 *
 * ENVIRONMENT VARIABLES:
 * - IMAGE_API_MODE: "demo" | "cloudinary" | "imgbb" (default: "demo")
 * - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Your Cloudinary API key
 * - CLOUDINARY_API_SECRET: Your Cloudinary API secret
 * - IMGBB_API_KEY: Your imgBB API key
 */
export async function processImages(
  imageUrls: string[]
): Promise<ProcessImageResult> {
  // ===== VALIDATION (Keep this in real implementation) =====

  // Validate input exists
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error("No image URLs provided");
  }

  // Validate URL format for each URL
  for (const url of imageUrls) {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  // ===== ENVIRONMENT VARIABLE USAGE =====

  // Get API mode from environment (defaults to "demo" for testing)
  const apiMode = process.env.IMAGE_API_MODE || "demo";

  console.log(`Processing ${imageUrls.length} images using mode: ${apiMode}`);

  // ===== DEMO MODE: Free API Example (Lorem Picsum) =====

  if (apiMode === "demo") {
    // Using Lorem Picsum - a free placeholder image service
    // This demonstrates calling a 3rd party API without authentication

    try {
      // Create a collage URL using Lorem Picsum's random image feature
      // In a real scenario, you'd upload images to the service first

      // For demo: create a grid of random images from Lorem Picsum
      const width = 800;
      const height = 600;
      const seed = Date.now(); // Use timestamp as seed for reproducible results

      // Lorem Picsum URL with seed for consistency
      const combinedImageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

      console.log(`Generated demo image URL: ${combinedImageUrl}`);

      // Note: Lorem Picsum generates images on-demand, so we don't need to verify
      // The image will be created when the browser requests it

      return {
        combinedImageUrl,
        processedAt: new Date().toISOString(),
        metadata: {
          originalCount: imageUrls.length,
          processingMethod: "demo-collage",
          apiUsed: "Lorem Picsum (Free Demo API)",
        },
      };
    } catch (error) {
      console.error("Demo API error:", error);
      throw new Error(
        `Failed to process with demo API: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // ===== CLOUDINARY EXAMPLE (Commented - Requires API Key) =====

  if (apiMode === "cloudinary") {
    // CLOUDINARY SETUP:
    // 1. Sign up at https://cloudinary.com (free tier available)
    // 2. Get your cloud name, API key, and secret
    // 3. Set environment variables:
    //    - CLOUDINARY_CLOUD_NAME=your_cloud_name
    //    - CLOUDINARY_API_KEY=your_api_key
    //    - CLOUDINARY_API_SECRET=your_api_secret
    // 4. Install: npm install cloudinary

    /*
    import { v2 as cloudinary } from 'cloudinary';

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    try {
      // Upload images to Cloudinary
      const uploadPromises = imageUrls.map((url) =>
        cloudinary.uploader.upload(url, {
          folder: 'image-processing',
        })
      );

      const uploads = await Promise.all(uploadPromises);
      const publicIds = uploads.map((u) => u.public_id);

      // Create a combined image using transformations
      const baseImage = publicIds[0];
      const overlayTransformations = publicIds.slice(1).map((id, index) => ({
        overlay: id.replace(/\//g, ':'),
        width: 400,
        height: 400,
        x: (index + 1) * 400,
        crop: 'fill',
      }));

      const combinedUrl = cloudinary.url(baseImage, {
        transformation: [
          { width: 400, height: 400, crop: 'fill' },
          ...overlayTransformations,
        ],
      });

      console.log(`Cloudinary combined URL: ${combinedUrl}`);

      return {
        combinedImageUrl: combinedUrl,
        processedAt: new Date().toISOString(),
        metadata: {
          originalCount: imageUrls.length,
          processingMethod: 'cloudinary-overlay',
          apiUsed: 'Cloudinary',
        },
      };
    } catch (error) {
      console.error('Cloudinary API error:', error);
      throw new Error(`Cloudinary processing failed: ${error.message}`);
    }
    */

    throw new Error(
      "Cloudinary mode requires CLOUDINARY_* environment variables to be set"
    );
  }

  // ===== IMGBB EXAMPLE (Commented - Requires API Key) =====

  if (apiMode === "imgbb") {
    // IMGBB SETUP:
    // 1. Sign up at https://imgbb.com (free tier available)
    // 2. Get your API key from https://api.imgbb.com/
    // 3. Set environment variable: IMGBB_API_KEY=your_api_key

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      throw new Error("IMGBB_API_KEY environment variable is required");
    }

    try {
      // ImgBB API example - upload first image
      // Note: ImgBB doesn't do image combining, this is just for upload demonstration
      const firstImageUrl = imageUrls[0];

      const formData = new FormData();
      formData.append("key", apiKey);
      formData.append("image", firstImageUrl);

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ImgBB API error: ${response.statusText}`);
      }

      const data = await response.json();

      console.log("ImgBB upload successful:", data);

      return {
        combinedImageUrl: data.data.url,
        processedAt: new Date().toISOString(),
        metadata: {
          originalCount: imageUrls.length,
          processingMethod: "imgbb-upload",
          apiUsed: "ImgBB",
        },
      };
    } catch (error) {
      console.error("ImgBB API error:", error);
      throw new Error(
        `ImgBB processing failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // ===== CUSTOM API EXAMPLE =====

  /*
  // Example calling your own image processing service
  const customApiUrl = process.env.CUSTOM_IMAGE_API_URL;
  const customApiKey = process.env.CUSTOM_IMAGE_API_KEY;

  if (!customApiUrl) {
    throw new Error('CUSTOM_IMAGE_API_URL environment variable is required');
  }

  try {
    const response = await fetch(customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customApiKey}`,
      },
      body: JSON.stringify({
        images: imageUrls,
        operation: 'combine',
        format: 'jpg',
        quality: 90,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      combinedImageUrl: data.resultUrl,
      processedAt: new Date().toISOString(),
      metadata: {
        originalCount: imageUrls.length,
        processingMethod: 'custom-api',
        apiUsed: 'Custom Service',
      },
    };
  } catch (error) {
    console.error('Custom API error:', error);
    throw new Error(`Custom API processing failed: ${error.message}`);
  }
  */

  // ===== FALLBACK =====

  throw new Error(
    `Unknown IMAGE_API_MODE: ${apiMode}. Valid options: demo, cloudinary, imgbb`
  );
}
