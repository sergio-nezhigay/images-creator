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

import { v2 as cloudinary } from 'cloudinary';

export type ProcessImageResult = {
  combinedImageUrl: string;
  processedAt: string;
  metadata?: {
    originalCount: number;
    processingMethod: string;
    apiUsed?: string;
  };
};

interface GridLayout {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  positions: Array<{ x: number; y: number }>;
}

/**
 * Calculates optimal grid layout for given number of images
 */
function calculateGridLayout(imageCount: number): GridLayout {
  let cols: number;
  let rows: number;

  if (imageCount === 1) {
    cols = 1;
    rows = 1;
  } else if (imageCount === 2) {
    cols = 2;
    rows = 1;
  } else if (imageCount === 3) {
    cols = 3;
    rows = 1;
  } else if (imageCount === 4) {
    cols = 2;
    rows = 2;
  } else if (imageCount <= 6) {
    cols = 3;
    rows = 2;
  } else if (imageCount <= 9) {
    cols = 3;
    rows = 3;
  } else {
    cols = Math.ceil(Math.sqrt(imageCount));
    rows = Math.ceil(imageCount / cols);
  }

  const cellWidth = 400;
  const cellHeight = 400;
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < imageCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: col * cellWidth,
      y: row * cellHeight,
    });
  }

  return {
    rows,
    cols,
    cellWidth,
    cellHeight,
    canvasWidth,
    canvasHeight,
    positions,
  };
}

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

  // ===== CLOUDINARY: Real Image Composition with Grid Layout =====

  if (apiMode === "cloudinary") {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary configuration missing. Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    try {
      console.log(`Uploading ${imageUrls.length} images to Cloudinary...`);

      // Upload all images in parallel
      const uploadPromises = imageUrls.map((url, index) =>
        cloudinary.uploader.upload(url, {
          folder: "image-processing",
          public_id: `grid_${Date.now()}_${index}`,
          resource_type: "image",
        })
      );

      const uploads = await Promise.all(uploadPromises);
      const publicIds = uploads.map((u) => u.public_id);

      console.log(`Uploaded ${publicIds.length} images:`, publicIds);

      // Calculate grid layout
      const layout = calculateGridLayout(imageUrls.length);
      console.log(
        `Grid layout: ${layout.cols}x${layout.rows} (${layout.canvasWidth}x${layout.canvasHeight})`
      );

      // Build transformation chain
      const baseImageId = publicIds[0];

      const transformations: any[] = [
        {
          width: layout.cellWidth,
          height: layout.cellHeight,
          crop: "fill",
          gravity: "auto",
        },
      ];

      // Add overlays for remaining images
      for (let i = 1; i < publicIds.length; i++) {
        const position = layout.positions[i];

        transformations.push({
          overlay: publicIds[i].replace(/\//g, ":"),
          width: layout.cellWidth,
          height: layout.cellHeight,
          crop: "fill",
          gravity: "north_west",
          x: position.x,
          y: position.y,
        });
      }

      // Generate composed image URL
      const combinedUrl = cloudinary.url(baseImageId, {
        transformation: transformations,
        width: layout.canvasWidth,
        height: layout.canvasHeight,
      });

      console.log(`Cloudinary composed image URL: ${combinedUrl}`);

      return {
        combinedImageUrl: combinedUrl,
        processedAt: new Date().toISOString(),
        metadata: {
          originalCount: imageUrls.length,
          processingMethod: `cloudinary-grid-${layout.cols}x${layout.rows}`,
          apiUsed: "Cloudinary",
        },
      };
    } catch (error) {
      console.error("Cloudinary API error:", error);
      throw new Error(
        `Cloudinary processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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
