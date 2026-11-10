const asyncHandler = require('express-async-handler');
const Lecture = require('../models/Lecture');
const Student = require('../models/Student');
const { getAdminScope } = require('../middleware/auth');

/**
 * Safely parses and validates a YouTube or Google Drive video URL
 * into a clean embeddable URL.
 */
function parseVideoEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  // 1. YouTube URLs
  if (
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be' ||
    host === 'www.youtube-nocookie.com'
  ) {
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0];
    } else if (parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
    } else if (parsed.pathname.startsWith('/live/')) {
      videoId = parsed.pathname.split('/live/')[1]?.split('/')[0] || '';
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
    }

    if (/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
      };
    }
    return null;
  }

  // 2. Google Drive URLs
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    let fileId = '';
    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    } else if (parsed.searchParams.get('id')) {
      fileId = parsed.searchParams.get('id');
    }

    if (/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
      return {
        provider: 'drive',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      };
    }
    return null;
  }

  return null;
}

const createLecture = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    courseModule,
    order,
    lectureDate,
    videoUrl,
    resourceUrl,
    campus,
    batch,
    isPublished,
  } = req.body;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error('Lecture title is required');
  }

  const videoInfo = parseVideoEmbedUrl(videoUrl);
  if (!videoInfo) {
    res.status(400);
    throw new Error('Please provide a valid YouTube or Google Drive video URL');
  }

  const lecture = await Lecture.create({
    title: title.trim(),
    description: (description || '').trim(),
    courseModule: (courseModule || 'General').trim(),
    order: Number(order) || 1,
    lectureDate: lectureDate ? new Date(lectureDate) : new Date(),
    videoUrl: videoUrl.trim(),
    videoProvider: videoInfo.provider,
    embedUrl: videoInfo.embedUrl,
    resourceUrl: (resourceUrl || '').trim(),
    campus: (campus || '').trim(),
    batch: (batch || '').trim(),
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    createdBy: req.admin._id,
  });

  res.status(201).json(lecture);
});

const getLecturesAdmin = asyncHandler(async (req, res) => {
  const { campus, batch, courseModule } = req.query;
  const query = { ...getAdminScope(req, 'createdBy') };
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;
  if (courseModule) query.courseModule = courseModule;

  const lectures = await Lecture.find(query)
    .sort({ order: 1, lectureDate: -1 })
    .lean();

  res.json(lectures);
});

const updateLecture = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const lecture = await Lecture.findOne({ _id: req.params.id, ...scope });
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  if (req.body.title !== undefined) lecture.title = req.body.title.trim();
  if (req.body.description !== undefined) lecture.description = req.body.description.trim();
  if (req.body.courseModule !== undefined) lecture.courseModule = req.body.courseModule.trim() || 'General';
  if (req.body.order !== undefined) lecture.order = Number(req.body.order) || 1;
  if (req.body.lectureDate !== undefined) {
    lecture.lectureDate = req.body.lectureDate ? new Date(req.body.lectureDate) : lecture.lectureDate;
  }
  if (req.body.videoUrl !== undefined && req.body.videoUrl.trim() !== lecture.videoUrl) {
    const videoInfo = parseVideoEmbedUrl(req.body.videoUrl);
    if (!videoInfo) {
      res.status(400);
      throw new Error('Please provide a valid YouTube or Google Drive video URL');
    }
    lecture.videoUrl = req.body.videoUrl.trim();
    lecture.videoProvider = videoInfo.provider;
    lecture.embedUrl = videoInfo.embedUrl;
  }
  if (req.body.resourceUrl !== undefined) lecture.resourceUrl = req.body.resourceUrl.trim();
  if (req.body.campus !== undefined) lecture.campus = req.body.campus.trim();
  if (req.body.batch !== undefined) lecture.batch = req.body.batch.trim();
  if (req.body.isPublished !== undefined) lecture.isPublished = Boolean(req.body.isPublished);

  const updated = await lecture.save();
  res.json(updated);
});

const deleteLecture = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const lecture = await Lecture.findOne({ _id: req.params.id, ...scope });
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }
  await Lecture.deleteOne({ _id: lecture._id });
  res.json({ message: 'Lecture deleted' });
});

// --- Student Lecture Endpoints ---

const getLecturesForStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = req.student?.studentId === studentId
    ? req.student
    : await Student.findOne({ studentId }).select('-passwordHash').lean();

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const lectures = await Lecture.find({
    createdBy: student.addedBy,
    isPublished: { $ne: false },
    $and: [
      { $or: [{ campus: '' }, { campus: student.campus }] },
      { $or: [{ batch: '' }, { batch: student.batch }] },
    ],
  })
    .sort({ order: 1, lectureDate: 1 })
    .lean();

  const mapped = lectures.map((lec) => {
    const watched = Array.isArray(lec.watchedBy) && lec.watchedBy.includes(student.studentId);
    const copy = { ...lec, isWatched: watched };
    delete copy.watchedBy;
    return copy;
  });

  res.json(mapped);
});

const toggleLectureWatched = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const studentId = req.student?.studentId || req.body?.studentId;
  if (!studentId) {
    res.status(400);
    throw new Error('Student ID is required');
  }

  const lecture = await Lecture.findById(id).select('watchedBy').lean();
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  const alreadyWatched = Array.isArray(lecture.watchedBy) && lecture.watchedBy.includes(studentId);
  const updateOp = alreadyWatched
    ? { $pull: { watchedBy: studentId } }
    : { $addToSet: { watchedBy: studentId } };

  await Lecture.updateOne({ _id: id }, updateOp);

  res.json({
    lectureId: id,
    isWatched: !alreadyWatched,
  });
});

module.exports = {
  createLecture,
  getLecturesAdmin,
  updateLecture,
  deleteLecture,
  getLecturesForStudent,
  toggleLectureWatched,
};
