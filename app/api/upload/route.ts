import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { isAuthenticated } from "@/lib/auth";

// Map file signatures (magic numbers) to extensions
const FILE_SIGNATURES: Record<string, string> = {
  // Images
  'ffd8ff': 'jpg',      // JPEG
  '89504e47': 'png',    // PNG
  '47494638': 'gif',    // GIF
  '52494646': 'webp',   // WEBP (RIFF header)
  // Videos
  '66747970': 'mp4',    // MP4 (ftyp)
  '00000018': 'mp4',    // MP4 variant
  '00000020': 'mp4',    // MP4 variant
  '1a45dfa3': 'webm',   // WebM
};

/**
 * Validate file type by checking magic numbers (file signature)
 * More reliable than trusting MIME type from client
 */
function validateFileSignature(buffer: Buffer): string | null {
  // Check first 4 bytes for signature
  const signature = buffer.slice(0, 4).toString('hex');

  // Check for exact matches
  for (const [sig, ext] of Object.entries(FILE_SIGNATURES)) {
    if (signature.startsWith(sig)) {
      return ext;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for videos, 5MB for images)
    // Determine if it's a video based on MIME type hint (we'll validate signature later)
    const isVideoHint = file.type.startsWith('video/');
    const maxSize = isVideoHint ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for videos, 5MB for images
    const maxSizeLabel = isVideoHint ? '50MB' : '5MB';

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeLabel}.` },
        { status: 400 }
      );
    }

    // Convert file to buffer for signature validation
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate file type by checking magic numbers (server-side validation)
    const detectedExtension = validateFileSignature(buffer);
    if (!detectedExtension) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, WebM videos are allowed." },
        { status: 400 }
      );
    }

    // Validate file size against actual detected type
    const isVideo = ['mp4', 'webm'].includes(detectedExtension);
    const correctMaxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > correctMaxSize) {
      const correctMaxLabel = isVideo ? '50MB' : '5MB';
      return NextResponse.json(
        { error: `File too large. Maximum size for ${detectedExtension.toUpperCase()} is ${correctMaxLabel}.` },
        { status: 400 }
      );
    }

    // Generate secure filename with validated extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomString}.${detectedExtension}`;

    // Ensure filename contains no path separators (defense in depth)
    const safeFilename = path.basename(filename);

    // Save file to public/uploads directory
    const uploadPath = path.join(process.cwd(), "public", "uploads", safeFilename);
    await writeFile(uploadPath, buffer);

    // Return the URL
    const fileUrl = `/uploads/${safeFilename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
