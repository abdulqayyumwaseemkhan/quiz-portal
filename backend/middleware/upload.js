const multer = require('multer');

const storage = multer.memoryStorage();

const createUpload = (allowedMimetypes, allowedExtensions, errorMessage, sizeLimitMB) => {
  const fileFilter = (req, file, cb) => {
    const extMatches = Boolean(file.originalname && file.originalname.match(allowedExtensions));
    const mimeMatches =
      allowedMimetypes.includes(file.mimetype) ||
      // Windows browsers frequently send application/octet-stream for .zip / office archives
      (extMatches && file.mimetype === 'application/octet-stream');

    if (extMatches && mimeMatches) {
      cb(null, true);
    } else {
      const err = new Error(errorMessage);
      err.statusCode = 400;
      cb(err, false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: sizeLimitMB * 1024 * 1024,
    },
  });
};

const assignmentAllowedMimetypes = [
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  // Documents & Text
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Spreadsheets & Data
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  // Images & Design Assets
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  // Short Media Clips
  'video/mp4',
  'video/webm',
];

const assignmentAllowedExtensions =
  /\.(zip|pdf|doc|docx|txt|ppt|pptx|xls|xlsx|csv|png|jpg|jpeg|webp|svg|gif|mp4|webm)$/i;

const assignmentUpload = createUpload(
  assignmentAllowedMimetypes,
  assignmentAllowedExtensions,
  'Unsupported file format! Allowed: zip, pdf, doc/docx, ppt/pptx, xls/xlsx, csv, png/jpg/webp/svg, mp4/webm.',
  4 // 4 MB limit (Vercel Serverless Function payload cap is 4.5MB)
);

const imageAllowedMimetypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const imageAllowedExtensions = /\.(png|jpg|jpeg|webp|gif|svg)$/i;

const ideImageUpload = createUpload(
  imageAllowedMimetypes,
  imageAllowedExtensions,
  'Invalid image format! Allowed: png, jpg, jpeg, webp, gif, svg',
  4
);

module.exports = {
  assignmentUpload,
  ideImageUpload,
};
