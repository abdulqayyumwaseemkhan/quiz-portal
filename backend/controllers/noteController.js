const asyncHandler = require('express-async-handler');
const Note = require('../models/Note');
const Student = require('../models/Student');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const uploadToCloudinary = (buffer, folder, originalFilename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        resource_type: 'auto', 
        folder,
        public_id: originalFilename.split('.')[0] + '-' + Date.now(),
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};

const getExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const createNote = asyncHandler(async (req, res) => {
  const { lectureNumber, lectureTitle, description, campus, batch } = req.body;
  
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded or invalid file type');
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, 'quiz-portal/notes', req.file.originalname);
  const fileType = getExtension(req.file.originalname);

  const note = await Note.create({
    lectureNumber: Number(lectureNumber),
    lectureTitle,
    description,
    fileUrl: uploadResult.secure_url,
    filePublicId: uploadResult.public_id,
    originalFileName: req.file.originalname,
    fileType,
    campus: campus || '',
    batch: batch || '',
    uploadedBy: req.admin._id,
  });

  res.status(201).json(note);
});

const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({}).sort({ lectureNumber: 1 });
  res.json(notes);
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }

  try {
    await cloudinary.uploader.destroy(note.filePublicId, { resource_type: 'raw' });
    // Also try image just in case auto mapped it differently
    await cloudinary.uploader.destroy(note.filePublicId, { resource_type: 'image' });
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset ${note.filePublicId}`, err);
  }

  await note.deleteOne();
  res.json({ message: 'Note deleted' });
});

const getNotesForStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ studentId });
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const notes = await Note.find({
    uploadedBy: student.addedBy,
    $and: [
      { $or: [{ campus: '' }, { campus: student.campus }] },
      { $or: [{ batch: '' }, { batch: student.batch }] }
    ]
  }).sort({ lectureNumber: 1 });

  res.json(notes);
});

module.exports = {
  createNote,
  getNotes,
  deleteNote,
  getNotesForStudent,
};
