const multer = require('multer');

const storage = multer.memoryStorage();

const createUpload = (allowedMimetypes, allowedExtensions, errorMessage, sizeLimitMB) => {
  const fileFilter = (req, file, cb) => {
    if (
      file.originalname.match(allowedExtensions) &&
      allowedMimetypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error(errorMessage), false);
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
  'application/zip',
  'application/x-zip-compressed',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];
const assignmentAllowedExtensions = /\.(zip|pdf|doc|docx|ppt|pptx)$/i;

const assignmentUpload = createUpload(
  assignmentAllowedMimetypes,
  assignmentAllowedExtensions,
  'Invalid file type! Allowed: zip, pdf, doc, docx, ppt, pptx',
  10 // 10 MB limit
);

const imageAllowedMimetypes = [
  'image/png',
  'image/jpeg',
  'image/webp'
];
const imageAllowedExtensions = /\.(png|jpg|jpeg|webp)$/i;

const ideImageUpload = createUpload(
  imageAllowedMimetypes,
  imageAllowedExtensions,
  'Invalid file type! Allowed: png, jpg, jpeg, webp',
  30 // 30 MB limit
);

module.exports = {
  assignmentUpload,
  ideImageUpload
};
