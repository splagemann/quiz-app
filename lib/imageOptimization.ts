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

  // PNG optimization
  pngCompressionLevel: 9, // Max compression (0-9)
  pngQuality: 90, // Quality for PNG to WebP conversion

  // Convert large PNGs to WebP for better compression
  convertPngToWebp: true,
  pngToWebpThreshold: 500 * 1024, // Convert PNGs larger than 500KB to WebP

  // GIF options
  gifColors: 256, // Maximum colors for GIF
};

/**
 * Optimize an image buffer by resizing and compressing
 * @param buffer - Original image buffer
 * @param extension - File extension (jpg, png, gif, webp)
 * @returns Object with optimized buffer and final extension
 */
export async function optimizeImage(
  buffer: Buffer,
  extension: string
): Promise<{ buffer: Buffer; extension: string }> {
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
      const jpegBuffer = await image
        .jpeg({
          quality: config.jpegQuality,
          progressive: true,
          mozjpeg: true, // Use mozjpeg for better compression
        })
        .toBuffer();
      return { buffer: jpegBuffer, extension: 'jpg' };

    case 'png':
      // For large PNGs, convert to WebP for much better compression
      if (config.convertPngToWebp && buffer.length > config.pngToWebpThreshold) {
        const webpBuffer = await image
          .webp({
            quality: config.pngQuality,
            effort: 6, // Higher effort = better compression (0-6)
          })
          .toBuffer();

        // Only use WebP if it's actually smaller
        if (webpBuffer.length < buffer.length) {
          return { buffer: webpBuffer, extension: 'webp' };
        }
      }

      // Otherwise, optimize as PNG
      const pngBuffer = await image
        .png({
          compressionLevel: config.pngCompressionLevel,
          adaptiveFiltering: true,
          palette: metadata.channels && metadata.channels <= 3, // Use palette for RGB images
        })
        .toBuffer();

      // Only return optimized PNG if it's smaller than original
      return {
        buffer: pngBuffer.length < buffer.length ? pngBuffer : buffer,
        extension: 'png',
      };

    case 'webp':
      const webpOptBuffer = await image
        .webp({
          quality: config.webpQuality,
        })
        .toBuffer();
      return { buffer: webpOptBuffer, extension: 'webp' };

    case 'gif':
      // For GIFs, we need to be careful to preserve animation
      // Sharp doesn't fully support animated GIFs, so we'll just optimize static ones
      // For animated GIFs, return the original buffer
      if (metadata.pages && metadata.pages > 1) {
        // Animated GIF - return original
        return { buffer, extension: 'gif' };
      }

      // Static GIF - convert to PNG for better compression
      const gifToPngBuffer = await image
        .png({
          compressionLevel: config.pngCompressionLevel,
          adaptiveFiltering: true,
        })
        .toBuffer();
      return { buffer: gifToPngBuffer, extension: 'png' };

    default:
      // Unsupported format - return original buffer
      return { buffer, extension };
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
