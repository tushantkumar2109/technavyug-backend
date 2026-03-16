import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const storage = multer.memoryStorage();

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only MP4, WebM, and MOV are allowed."),
      false,
    );
  }
};

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG are allowed.",
      ),
      false,
    );
  }
};

export const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).single("video");

export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("image");

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Cloudinary folder name
 * @param {string} resourceType - "video" or "image"
 * @returns {Promise<{url: string, publicId: string, duration?: number}>}
 */
export const uploadToCloudinary = (buffer, folder, resourceType = "video") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: `technavyug/${folder}`,
        chunk_size: 6_000_000,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration ? Math.round(result.duration) : 0,
        });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Delete a resource from Cloudinary by public_id.
 * @param {string} publicId
 * @param {string} resourceType - "video" or "image"
 */
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "video",
) => {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};
