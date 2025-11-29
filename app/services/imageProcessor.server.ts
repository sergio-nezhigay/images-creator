/**
 * Image Processing Service - Cloudinary Grid Composition
 *
 * Processes multiple image URLs and combines them into a single grid image
 * using Cloudinary's upload and transformation APIs.
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
    cols = 2;
    rows = 2;
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

  const cellWidth = 1024;
  const cellHeight = 1024;
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
 * Processes multiple image URLs and combines them into a single grid image
 *
 * @param imageUrls - Array of valid image URLs to process
 * @returns Promise resolving to combined image URL and processing timestamp
 * @throws Error if imageUrls is empty or contains invalid URLs
 *
 * ENVIRONMENT VARIABLES:
 * - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Your Cloudinary API key
 * - CLOUDINARY_API_SECRET: Your Cloudinary API secret
 */
export async function processImages(
  imageUrls: string[]
): Promise<ProcessImageResult> {
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

  // Validate Cloudinary credentials
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration missing. Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
  }

  // Configure Cloudinary
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
