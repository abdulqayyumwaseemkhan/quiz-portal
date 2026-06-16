const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(zip|pdf|doc|docx|ppt|pptx|png|jpg|jpeg)$/i;
  const allowedMimetypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg'
  ];

  if (
    file.originalname.match(allowedExtensions) &&
    allowedMimetypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Allowed: zip, pdf, doc, docx, ppt, pptx, png, jpg, jpeg'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

module.exports = upload;
