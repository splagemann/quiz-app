import sharp from 'sharp';

/**
 * Configuration for image optimization
 */
export const IMAGE_OPTIMIZATION_CONFIG = {
  // Maximum dimensions (maintains aspect ratio)
  maxWidth: 1920,
  maxHeight: 1080,

  // Quality settings (1-100)
  jpegQuality: 80,
  webpQuality: 80,
  pngCompressionLevel: 8,

  // GIF options
  gifColors: 256, // Maximum colors for GIF
};

/**
 * Optimize an image buffer by resizing and compressing
 * @param buffer - Original image buffer
 * @param extension - File extension (jpg, png, gif, webp)
 * @returns Optimized image buffer
 */
export async function optimizeImage(
  buffer: Buffer,
  extension: string
): Promise<Buffer> {
  const config = IMAGE_OPTIMIZATION_CONFIG;

  // Initialize Sharp with the buffer
  let image = sharp(buffer);

  // Get image metadata to check dimensions
  const metadata = await image.metadata();

  // Resize if image exceeds max dimensions (maintains aspect ratio)
  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > config.maxWidth || metadata.height > config.maxHeight)
  ) {
    image = image.resize(config.maxWidth, config.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Apply format-specific optimization
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return await image
        .jpeg({
          quality: config.jpegQuality,
          progressive: true,
          mozjpeg: true, // Use mozjpeg for better compression
        })
        .toBuffer();

    case 'png':
      return await image
        .png({
          compressionLevel: config.pngCompressionLevel,
          progressive: true,
        })
        .toBuffer();

    case 'webp':
      return await image
        .webp({
          quality: config.webpQuality,
        })
        .toBuffer();

    case 'gif':
      // For GIFs, we need to be careful to preserve animation
      // Sharp doesn't fully support animated GIFs, so we'll just optimize static ones
      // For animated GIFs, return the original buffer
      if (metadata.pages && metadata.pages > 1) {
        // Animated GIF - return original
        return buffer;
      }

      // Static GIF - convert to PNG for better compression
      return await image
        .png({
          compressionLevel: config.pngCompressionLevel,
        })
        .toBuffer();

    default:
      // Unsupported format - return original buffer
      return buffer;
  }
}

/**
 * Check if a file extension is an image that can be optimized
 * @param extension - File extension
 * @returns true if the file is an optimizable image
 */
export function isOptimizableImage(extension: string): boolean {
  const optimizableExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  return optimizableExtensions.includes(extension.toLowerCase());
}
