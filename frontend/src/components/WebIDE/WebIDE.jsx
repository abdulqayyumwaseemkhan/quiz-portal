import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Upload, FolderPlus, FilePlus, X, Image as ImageIcon, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const DEFAULT_FILES = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n  <!-- Styles will be injected automatically -->\n</head>\n<body>\n  <h1>Hello World</h1>\n  \n  <!-- Scripts will be injected automatically -->\n</body>\n</html>',
  },
  'style.css': {
    name: 'style.css',
    language: 'css',
    content: 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n\nh1 {\n  color: #3b82f6;\n}',
  },
  'script.js': {
    name: 'script.js',
    language: 'javascript',
    content: 'console.log("Ready!");\n',
  },
};

export default function WebIDE({
  initialProjectData,
  onSubmit,
  readOnly = false,
}) {
  // Try parsing initialProjectData if it's a string, else use as object
  let initialData = DEFAULT_FILES;
  if (initialProjectData) {
    if (typeof initialProjectData === 'string') {
      try {
        initialData = JSON.parse(initialProjectData);
      } catch (e) {
        console.error("Failed to parse initialProjectData", e);
      }
    } else {
      initialData = initialProjectData;
    }
  }

  const [files, setFiles] = useState(initialData);
  const [activeFile, setActiveFile] = useState('index.html');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const iframeRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleEditorChange = (value) => {
    if (readOnly) return;
    setFiles((prev) => ({
      ...prev,
      [activeFile]: {
        ...prev[activeFile],
        content: value,
      },
    }));
  };

  const runCode = () => {
    if (!iframeRef.current) return;
    const html = files['index.html']?.content || '';
    const css = files['style.css']?.content || '';
    const js = files['script.js']?.content || '';

    // Create a complete HTML document with injected CSS and JS
    const combinedHtml = `
      ${html}
      <style>${css}</style>
      <script>
        try {
          ${js}
        } catch (err) {
          console.error(err);
        }
      <\/script>
    `;

    const blob = new Blob([combinedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    iframeRef.current.src = url;
  };

  // Run code on initial load if we have data (especially for readOnly admin mode)
  useEffect(() => {
    if (initialProjectData) {
      setTimeout(runCode, 500); // Wait for iframe to be ready
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectData]);

  const handleCreateFile = () => {
    if (readOnly) return;
    const name = prompt('Enter file name (e.g., custom.js):');
    if (!name) return;
    if (files[name]) {
      toast.error('File already exists');
      return;
    }
    
    let language = 'javascript';
    if (name.endsWith('.html')) language = 'html';
    else if (name.endsWith('.css')) language = 'css';

    setFiles((prev) => ({
      ...prev,
      [name]: { name, language, content: '' },
    }));
    setActiveFile(name);
  };

  const handleImageUploadClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (e) => {
    if (readOnly) return;
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const toastId = toast.loading('Uploading image...');
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Assumes token is stored in localStorage
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/student/ide/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const url = res.data.url;
      const fileName = file.name;
      
      setFiles((prev) => ({
        ...prev,
        [fileName]: { name: fileName, isImage: true, url },
      }));
      toast.success('Image uploaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  const handleSubmit = async () => {
    if (readOnly || !onSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(files);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-gray-200">Web IDE Workspace</span>
          <button 
            onClick={runCode}
            className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
          >
            <Play size={16} />
            <span>Run Code</span>
          </button>
        </div>
        {!readOnly && (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSubmitting ? 'Saving...' : 'Submit Workspace'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 md:w-64 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
          <div className="p-2 text-xs font-semibold text-gray-400 tracking-wider uppercase flex justify-between items-center">
            <span>Explorer</span>
            {!readOnly && (
              <div className="flex space-x-2">
                <button onClick={handleCreateFile} title="New File" className="hover:text-white"><FilePlus size={14} /></button>
                <button onClick={handleImageUploadClick} title="Upload Image" className="hover:text-white"><Upload size={14} /></button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.values(files).map((file) => (
              <div 
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`flex items-center px-4 py-1.5 cursor-pointer text-sm ${activeFile === file.name ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200'}`}
              >
                {file.isImage ? <ImageIcon size={14} className="mr-2 text-purple-400" /> : <FileCode size={14} className="mr-2 text-blue-400" />}
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {files[activeFile] && files[activeFile].isImage ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1e1e1e]">
              <img src={files[activeFile].url} alt={files[activeFile].name} className="max-w-full max-h-full object-contain mb-4 border border-gray-600 rounded" />
              <div className="bg-[#2d2d2d] px-4 py-2 rounded text-sm text-gray-300 select-all w-full max-w-xl overflow-x-auto whitespace-nowrap">
                {files[activeFile].url}
              </div>
              <p className="text-xs text-gray-500 mt-2">Copy the URL to use in your HTML/CSS.</p>
            </div>
          ) : (
            <Editor
              height="100%"
              theme="vs-dark"
              path={activeFile}
              language={files[activeFile]?.language || 'javascript'}
              value={files[activeFile]?.content || ''}
              onChange={handleEditorChange}
              options={{
                readOnly: readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          )}
        </div>

        {/* Preview Area */}
        <div className="hidden md:flex w-1/3 lg:w-2/5 bg-white border-l border-[#3c3c3c] flex-col">
          <div className="px-3 py-1.5 bg-[#f3f4f6] border-b border-gray-200 text-xs font-semibold text-gray-600 flex justify-between items-center">
            <span>Preview</span>
          </div>
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full flex-1 border-none bg-white"
            sandbox="allow-scripts"
          />
        </div>
      </div>
      
      {/* Hidden file input for image upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageFileChange} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
}
