import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Upload, FolderPlus, FilePlus, X, Image as ImageIcon, FileCode, Edit2, Trash2, Monitor, Tablet, Smartphone, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import API from '../../api';

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

const REACT_DEFAULT_FILES = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>',
  },
  'styles.css': {
    name: 'styles.css',
    language: 'css',
    content: 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n\n.App {\n  text-align: center;\n}\n\nh1 {\n  color: #61dafb;\n}',
  },
  'App.jsx': {
    name: 'App.jsx',
    language: 'javascriptreact',
    content: 'import React, { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <div className="App">\n      <h1>Hello React!</h1>\n      <button onClick={() => setCount(c => c + 1)}>\n        Count is {count}\n      </button>\n    </div>\n  );\n}\n',
  },
  'index.jsx': {
    name: 'index.jsx',
    language: 'javascriptreact',
    content: 'import React from "react";\nimport { createRoot } from "react-dom/client";\n// App component is automatically available in this environment\n\nconst root = createRoot(document.getElementById("root"));\nroot.render(<App />);\n',
  },
};

export default function WebIDE({
  initialProjectData,
  onSubmit,
  readOnly = false,
  studentId,
  assignmentId,
  projectType = 'vanilla', // 'vanilla' or 'react'
}) {
  const draftKey = `ide_draft_${studentId}_${assignmentId}`;

  // Try parsing initialProjectData if it's a string, else use as object
  let initialData = projectType === 'react' ? REACT_DEFAULT_FILES : DEFAULT_FILES;
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
  } else if (!readOnly && studentId && assignmentId) {
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        initialData = JSON.parse(draft);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }

  // Auto-detect project type from files if not explicitly provided but initialData has .jsx
  const isReactProject = projectType === 'react' || Object.values(initialData).some(f => f.name.endsWith('.jsx'));

  const [files, setFiles] = useState(initialData);
  const [activeFile, setActiveFile] = useState('index.html');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState('default'); // 'hidden', 'default', 'full'
  const [deviceWidth, setDeviceWidth] = useState('100%'); // '100%', '768px', '375px'
  const iframeRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!readOnly && studentId && assignmentId && files) {
      localStorage.setItem(draftKey, JSON.stringify(files));
    }
  }, [files, readOnly, studentId, assignmentId, draftKey]);

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
    let html = files['index.html']?.content || (isReactProject ? '<div id="root"></div>' : '');
    let css = files['style.css']?.content || files['styles.css']?.content || '';
    
    // Create map of image URLs for replacement
    const imageUrls = {};
    Object.values(files).forEach(file => {
      if (file.isImage && file.url) {
        imageUrls[file.name] = file.url;
      }
    });

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    Object.keys(imageUrls).forEach(imgName => {
      const regex = new RegExp(escapeRegExp(imgName), 'g');
      html = html.replace(regex, imageUrls[imgName]);
      css = css.replace(regex, imageUrls[imgName]);
    });

    let combinedHtml = '';

    if (isReactProject) {
      let combinedJsx = `
// Automatically injected React imports to prevent duplicate declaration errors
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
`;
      Object.values(files).forEach(file => {
        if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
          let content = file.content;
          
          Object.keys(imageUrls).forEach(imgName => {
            const regex = new RegExp(escapeRegExp(imgName), 'g');
            content = content.replace(regex, imageUrls[imgName]);
          });
          
          // Strip local relative imports (e.g. import App from './App' or import './styles.css')
          content = content.replace(/import\s+.*?\s+from\s+['"][\.\/].*?['"];?/g, '');
          content = content.replace(/import\s+['"][\.\/].*?['"];?/g, '');
          
          // Strip ALL react and react-dom imports from student code to prevent duplicate identifier errors
          content = content.replace(/import\s+.*?\s+from\s+['"]react(-dom.*)?['"];?/g, '');

          // Strip export default and export const (everything becomes local to the single module)
          content = content.replace(/export\s+default\s+/g, '');
          content = content.replace(/export\s+(const|let|var|function|class)/g, '$1');
          
          combinedJsx += `\n/* --- ${file.name} --- */\n` + content;
        }
      });

      combinedHtml = `
        ${html}
        <style>${css}</style>
        
        <!-- Import Maps for native ES Modules in browser -->
        <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
              "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
              "react/jsx-dev-runtime": "https://esm.sh/react@18.2.0/jsx-dev-runtime",
              "react-router-dom": "https://esm.sh/react-router-dom@6.22.3",
              "react-icons/": "https://esm.sh/react-icons@5.0.1/"
            }
          }
        </script>
        
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        
        <!-- Global Error Handler -->
        <script>
          window.addEventListener('error', function(event) {
            document.body.innerHTML += '<div style="color:red; font-family:sans-serif; padding:20px; background:#1e1e1e; border-top:1px solid #ff3333; margin-top:20px;"><h3>Runtime Error:</h3><pre>' + event.message + '</pre></div>';
          });
        </script>

        <!-- Execute compiled JSX as a native module -->
        <script type="text/babel" data-type="module" data-presets="react,env">
${combinedJsx}
        <\/script>
      `;
    } else {
      let js = files['script.js']?.content || '';
      
      Object.keys(imageUrls).forEach(imgName => {
        const regex = new RegExp(escapeRegExp(imgName), 'g');
        js = js.replace(regex, imageUrls[imgName]);
      });

      combinedHtml = `
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
    }

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
    else if (name.endsWith('.jsx')) language = 'javascriptreact';

    setFiles((prev) => ({
      ...prev,
      [name]: { name, language, content: '' },
    }));
    setActiveFile(name);
  };

  const handleRenameFile = (e, oldName) => {
    e.stopPropagation();
    if (readOnly) return;

    if (oldName === 'index.html') {
      toast.error('Cannot rename the main index.html file');
      return;
    }

    const newName = prompt(`Enter new name for ${oldName}:`, oldName);
    if (!newName || newName === oldName) return;

    if (files[newName]) {
      toast.error('A file with this name already exists');
      return;
    }

    setFiles((prev) => {
      const newFiles = { ...prev };
      const fileObj = { ...newFiles[oldName], name: newName };
      
      if (!fileObj.isImage) {
         if (newName.endsWith('.html')) fileObj.language = 'html';
         else if (newName.endsWith('.css')) fileObj.language = 'css';
         else if (newName.endsWith('.jsx')) fileObj.language = 'javascriptreact';
         else fileObj.language = 'javascript';
      }

      newFiles[newName] = fileObj;
      delete newFiles[oldName];
      return newFiles;
    });

    if (activeFile === oldName) {
      setActiveFile(newName);
    }
  };

  const handleDeleteFile = (e, name) => {
    e.stopPropagation();
    if (readOnly) return;
    
    if (name === 'index.html') {
      toast.error('Cannot delete the main index.html file');
      return;
    }

    const confirm = window.confirm(`Are you sure you want to delete ${name}?`);
    if (!confirm) return;

    setFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[name];
      return newFiles;
    });

    if (activeFile === name) {
      setActiveFile('index.html');
    }
  };

  const handleImageUploadClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIMENSION = 2048;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas to Blob failed'));
              }
            },
            'image/webp',
            0.7
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageFileChange = async (e) => {
    if (readOnly) return;
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const imageCount = Object.values(files).filter(f => f.isImage).length;
    if (imageCount >= 15) {
      toast.error('Maximum of 15 images allowed per workspace');
      return;
    }

    const toastId = toast.loading('Compressing image...');
    try {
      const compressedFile = await compressImage(file);
      
      if (compressedFile.size > 2 * 1024 * 1024) {
        toast.error('Image is still larger than 2MB after compression. Please use a smaller image.', { id: toastId });
        return;
      }

      toast.loading('Uploading image...', { id: toastId });
      const formData = new FormData();
      formData.append('image', compressedFile);

      const res = await API.post('/student/ide/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const url = res.data.url;
      const fileName = compressedFile.name;
      
      setFiles((prev) => {
        const newFiles = {
          ...prev,
          [fileName]: { name: fileName, isImage: true, url },
        };
        return newFiles;
      });
      toast.success('Image uploaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to process or upload image', { id: toastId });
    }
  };

  const handleSubmit = async () => {
    if (readOnly || !onSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(files);
      if (studentId && assignmentId) {
        localStorage.removeItem(draftKey);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#eef4ed] text-[#13315c]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#8da9c4]/30 shadow-sm z-10">
        <div className="flex items-center space-x-6">
          <span className="font-black text-[#13315c] tracking-tight hidden sm:inline">Web IDE Workspace</span>
          <button 
            onClick={runCode}
            className="flex items-center space-x-2 px-4 py-1.5 bg-[#13315c] text-white hover:bg-opacity-90 rounded-lg text-sm font-bold transition-all shadow-sm"
          >
            <Play size={16} />
            <span>Run Code</span>
          </button>
          <button
            onClick={() => setPreviewMode(previewMode === 'hidden' ? 'default' : 'hidden')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-bold transition-all shadow-sm"
          >
            {previewMode === 'hidden' ? 'Show Result' : 'Hide Result'}
          </button>
        </div>
        {!readOnly && (
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="flex items-center space-x-2 px-4 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50"
           >
             <Save size={16} />
             <span>{isSubmitting ? 'Saving...' : 'Submit Workspace'}</span>
           </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`w-48 md:w-64 bg-gray-50 border-r border-[#8da9c4]/30 flex flex-col ${previewMode === 'full' ? 'hidden' : ''}`}>
          <div className="px-4 py-3 text-xs font-bold text-gray-500 tracking-widest uppercase flex justify-between items-center border-b border-[#8da9c4]/20">
            <span>Explorer</span>
            {!readOnly && (
              <div className="flex space-x-3">
                <button onClick={handleCreateFile} title="New File" className="hover:text-[#13315c] transition-colors"><FilePlus size={16} /></button>
                <button onClick={handleImageUploadClick} title="Upload Image" className="hover:text-[#13315c] transition-colors"><Upload size={16} /></button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {Object.values(files).map((file) => (
              <div 
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`group flex items-center justify-between px-4 py-2 cursor-pointer text-sm font-medium transition-colors ${activeFile === file.name ? 'bg-[#eef4ed] text-[#13315c] border-r-2 border-[#13315c]' : 'text-gray-600 hover:bg-gray-100 hover:text-[#13315c]'}`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {file.isImage ? <ImageIcon size={16} className="mr-3 flex-shrink-0 text-purple-500" /> : <FileCode size={16} className="mr-3 flex-shrink-0 text-blue-500" />}
                  <span className="truncate">{file.name}</span>
                </div>
                {!readOnly && file.name !== 'index.html' && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleRenameFile(e, file.name)} 
                      title="Rename File"
                      className="text-gray-400 hover:text-blue-500 transition-all p-1 rounded-md hover:bg-white/50"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteFile(e, file.name)} 
                      title="Delete File"
                      className="text-gray-400 hover:text-red-500 transition-all p-1 rounded-md hover:bg-white/50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white ${previewMode === 'full' ? 'hidden' : ''}`}>
          {files[activeFile] && files[activeFile].isImage ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
              <img src={files[activeFile].url} alt={files[activeFile].name} className="max-w-full max-h-full object-contain mb-6 border border-[#8da9c4]/30 rounded-xl bg-white shadow-sm" />
              <div className="bg-white border border-[#8da9c4]/30 px-4 py-2 rounded-lg text-sm text-[#13315c] select-all w-full max-w-xl overflow-x-auto whitespace-nowrap font-mono shadow-sm">
                {files[activeFile].url}
              </div>
              <p className="text-xs text-gray-500 mt-3 font-semibold">Copy the URL to use in your HTML/CSS.</p>
            </div>
          ) : (
            <Editor
              height="100%"
              theme="light"
              path={activeFile}
              language={files[activeFile]?.language || 'javascript'}
              value={files[activeFile]?.content || ''}
              onChange={handleEditorChange}
              options={{
                readOnly: readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                padding: { top: 16 },
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoIndent: 'full',
                formatOnPaste: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                snippetSuggestions: "inline",
                wordBasedSuggestions: true,
                parameterHints: { enabled: true }
              }}
            />
          )}
        </div>

        {/* Preview Area */}
        <div className={`${previewMode === 'hidden' ? 'hidden' : 'flex'} ${previewMode === 'full' ? 'w-full' : 'hidden md:flex w-1/3 lg:w-2/5'} bg-white border-l border-[#8da9c4]/30 flex-col`}>
          <div className="px-3 py-1.5 bg-[#f3f4f6] border-b border-gray-200 text-xs font-semibold text-gray-600 flex justify-between items-center">
            <span>Preview</span>
            <div className="flex space-x-2 items-center">
              <button onClick={() => setDeviceWidth('375px')} title="Mobile View" className={`hover:text-[#13315c] transition-colors p-1 rounded ${deviceWidth === '375px' ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}><Smartphone size={14} /></button>
              <button onClick={() => setDeviceWidth('768px')} title="Tablet View" className={`hover:text-[#13315c] transition-colors p-1 rounded ${deviceWidth === '768px' ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}><Tablet size={14} /></button>
              <button onClick={() => setDeviceWidth('100%')} title="Desktop View" className={`hover:text-[#13315c] transition-colors p-1 rounded ${deviceWidth === '100%' ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}><Monitor size={14} /></button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              {previewMode === 'full' ? (
                <button onClick={() => setPreviewMode('default')} title="Restore View" className="text-gray-400 hover:text-[#13315c] p-1"><Minimize2 size={14} /></button>
              ) : (
                <button onClick={() => setPreviewMode('full')} title="Full Screen Preview" className="text-gray-400 hover:text-[#13315c] p-1"><Maximize2 size={14} /></button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 flex justify-center items-start">
             <div style={{ width: deviceWidth, height: '100%', transition: 'width 0.3s ease', backgroundColor: 'white', borderLeft: deviceWidth !== '100%' ? '1px solid #ddd' : 'none', borderRight: deviceWidth !== '100%' ? '1px solid #ddd' : 'none', boxShadow: deviceWidth !== '100%' ? '0 0 10px rgba(0,0,0,0.1)' : 'none' }}>
                <iframe
                  ref={iframeRef}
                  title="Preview"
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts"
                />
             </div>
          </div>
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
