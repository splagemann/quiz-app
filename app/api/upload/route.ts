import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { isAuthenticated } from "@/lib/auth";

// Map file signatures (magic numbers) to extensions
const FILE_SIGNATURES: Record<string, string> = {
  'ffd8ff': 'jpg',      // JPEG
  '89504e47': 'png',    // PNG
  '47494638': 'gif',    // GIF
  '52494646': 'webp',   // WEBP (RIFF header)
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

    // Validate file size first (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
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
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." },
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
    const imageUrl = `/uploads/${safeFilename}`;

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
