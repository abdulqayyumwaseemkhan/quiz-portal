import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Filter, Download, ArrowLeft, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import WebIDE from '../components/WebIDE/WebIDE';

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const AssignmentSubmissionsPage = () => {
  const { id } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState({ campus: '', batch: '' });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, mRes] = await Promise.all([
        API.get(`/assignments/${id}/submissions`),
        API.get('/admin/students/meta')
      ]);
      setSubmissions(sRes.data);
      setMeta(mRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/assignments/${id}/submissions`, { params: filter });
      setSubmissions(data);
    } catch (error) {
       console.error(error);
       toast.error('Filter failed');
    } finally {
        setLoading(false);
    }
  };

  if (activeVideo) {
    let embedLink = activeVideo.driveLink;
    if (embedLink && embedLink.includes('drive.google.com/file/d/')) {
      const fileId = embedLink.split('/file/d/')[1].split('/')[0];
      embedLink = `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black bg-opacity-90">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveVideo(null)}
              className="text-gray-400 font-bold hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} /> Back to Submissions
            </button>
            <h2 className="text-xl font-bold text-white">{activeVideo.assignmentTitle || 'Video Submission'}</h2>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center p-8 relative">
          {activeVideo.assignmentDetails && (
            <div className="absolute top-8 right-8 bg-gray-800 p-4 rounded-lg text-white max-w-sm shadow-xl z-10 opacity-80 hover:opacity-100 transition-opacity">
              <h3 className="font-bold text-sm mb-2 text-gray-300">Assignment Details</h3>
              <p className="text-sm whitespace-pre-wrap">{activeVideo.assignmentDetails}</p>
            </div>
          )}
          {embedLink ? (
             <iframe 
               src={embedLink} 
               width="100%" 
               height="100%" 
               allow="autoplay" 
               className="rounded-xl shadow-2xl max-w-5xl w-full h-[80vh] border-0"
             ></iframe>
          ) : (
             <div className="text-white font-bold">Invalid Google Drive Link provided.</div>
          )}
        </div>
      </div>
    );
  }

  if (activeWorkspace) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-transparent">
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#8da9c4]/30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveWorkspace(null)}
              className="text-gray-500 font-bold hover:text-[#13315c] transition-colors"
            >
              ← Back to Submissions
            </button>
            <h2 className="text-xl font-bold text-[#13315c]">{activeWorkspace.studentName}'s Workspace</h2>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <WebIDE 
            initialProjectData={activeWorkspace.projectData}
            readOnly={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#13315c] flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <Link to="/admin/manage-assignments" className="text-gray-500 hover:text-[#13315c] transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-extrabold text-[#13315c]">Assignment Submissions</h1>
          </div>
          <p className="text-gray-600 ml-10">Review and download student project files</p>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#8da9c4]/30 mb-8 flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Campus Filter</label>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <select 
                      className="input-field pl-10"
                      value={filter.campus}
                      onChange={(e) => setFilter({...filter, campus: e.target.value})}
                    >
                        <option value="">All Campuses</option>
                        {meta.campuses?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Batch Filter</label>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <select 
                      className="input-field pl-10"
                      value={filter.batch}
                      onChange={(e) => setFilter({...filter, batch: e.target.value})}
                    >
                        <option value="">All Batches</option>
                        {meta.batches?.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            </div>
            <button 
              onClick={handleFilter}
              className="btn-primary flex items-center gap-2 h-11 px-8 whitespace-nowrap"
            >
              Apply Filters
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#8da9c4]/30 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white text-gray-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Campus / Batch</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">File Info</th>
                <th className="px-6 py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-white transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#13315c]">{sub.studentName}</p>
                    <p className="text-xs text-gray-600">{sub.studentId}</p>
                  </td>
                  <td className="px-6 py-4">
                     <p className="font-semibold text-[#13315c]">{sub.campus || '-'}</p>
                     <p className="text-xs text-gray-600">{sub.batch || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                     {sub.isLate ? (
                         <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest">
                           <Clock size={12} /> Late
                         </span>
                     ) : (
                         <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest">
                           <CheckCircle size={12} /> On Time
                         </span>
                     )}
                     <p className="text-xs text-gray-500 font-medium mt-1">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                     </p>
                  </td>
                  <td className="px-6 py-4">
                    {sub.submissionType === 'ide' ? (
                      <div>
                        <p className="font-medium text-purple-400 line-clamp-1">Web IDE Workspace</p>
                        <p className="text-xs text-gray-600 font-mono">Cloud Project</p>
                      </div>
                    ) : sub.submissionType === 'document' ? (
                      <div>
                        {sub.assignmentTitle && <p className="font-bold text-[#13315c] line-clamp-1 mb-1">{sub.assignmentTitle}</p>}
                        {sub.driveLink && <p className="font-medium text-blue-500 line-clamp-1 text-xs mb-1">Drive Video Attached</p>}
                        {sub.fileUrl && (
                          <p className="text-xs text-gray-600 font-mono flex gap-1 items-center">
                             File: {sub.originalFileName} ({formatBytes(sub.fileSizeBytes)})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-[#13315c] line-clamp-1 max-w-[200px]" title={sub.originalFileName}>
                          {sub.originalFileName}
                        </p>
                        <p className="text-xs text-gray-600 font-mono">
                          {formatBytes(sub.fileSizeBytes)}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                     {sub.submissionType === 'ide' ? (
                       <button 
                         onClick={() => setActiveWorkspace(sub)}
                         className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-semibold rounded-lg transition-colors text-sm"
                       >
                         <BookOpen size={16} /> View Code
                       </button>
                     ) : sub.submissionType === 'document' ? (
                        <div className="flex flex-col items-end gap-2">
                          {sub.driveLink && (
                            <button 
                              onClick={() => setActiveVideo(sub)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-semibold rounded-lg transition-colors text-sm"
                            >
                              <BookOpen size={16} /> Play Video
                            </button>
                          )}
                          {sub.fileUrl && (
                            <a 
                              href={sub.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#8da9c4]/20 text-[#13315c] hover:bg-[#8da9c4]/20 font-semibold rounded-lg transition-colors text-sm"
                            >
                              <Download size={16} /> Document
                            </a>
                          )}
                        </div>
                     ) : (
                       <a 
                         href={sub.fileUrl} 
                         target="_blank" 
                         rel="noreferrer"
                         className="inline-flex items-center gap-2 px-4 py-2 bg-[#8da9c4]/20 text-[#13315c] hover:bg-[#8da9c4]/20 font-semibold rounded-lg transition-colors text-sm"
                       >
                         <Download size={16} /> Get File
                       </a>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {submissions.length === 0 && !loading && (
              <div className="p-16 text-center">
                  <Download className="mx-auto text-slate-700 mb-4" size={56} />
                  <p className="text-gray-500 font-medium">No submissions found</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssignmentSubmissionsPage;
