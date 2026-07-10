import React, { useState } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { Download, Printer, RefreshCw, Barcode, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const BarcodeGeneratorPage = () => {
  const [formData, setFormData] = useState({
    productName: '',
    brandName: '',
    category: '',
    sku: '',
    barcode: '',
    price: '',
    weight: '',
    description: '',
    type: 'code128',
    barcolor: '#000000',
    textcolor: '#000000'
  });

  const [loading, setLoading] = useState(false);
  const [barcodeImage, setBarcodeImage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!formData.productName) {
      toast.error('Product Name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/barcodes/generate', formData, {
        responseType: 'blob' // Important for receiving image
      });
      
      const imageUrl = URL.createObjectURL(response.data);
      setBarcodeImage(imageUrl);
      
      toast.success('Barcode generated successfully!');
    } catch (error) {
      toast.error('Failed to generate barcode');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!barcodeImage) return;
    const link = document.createElement('a');
    link.href = barcodeImage;
    link.download = `barcode-${formData.productName.replace(/\s+/g, '-').toLowerCase() || 'product'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!barcodeImage) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Print Barcode</title></head>
        <body style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; margin:0; font-family:sans-serif;">
          <h2>${formData.productName}</h2>
          <p>SKU: ${formData.sku} | Price: ${formData.price}</p>
          <img src="${barcodeImage}" style="max-width:100%; max-height:50vh; margin-top:20px;" onload="window.print();window.close()" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReset = () => {
    setFormData({
      productName: '',
      brandName: '',
      category: '',
      sku: '',
      barcode: '',
      price: '',
      weight: '',
      description: '',
      type: 'code128',
      barcolor: '#000000',
      textcolor: '#000000'
    });
    setBarcodeImage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center space-x-3 mb-2"
          >
            <div className="p-3 bg-blue-600 rounded-full shadow-lg">
              <Barcode className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Barcode Generator
            </h1>
          </motion.div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Create high-quality, print-ready product barcodes instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Section */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
          >
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                Product Details
              </h2>
              
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name *</label>
                    <input type="text" name="productName" value={formData.productName} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="e.g. Wireless Mouse" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Brand Name</label>
                    <input type="text" name="brandName" value={formData.brandName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="e.g. Logitech" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="e.g. Electronics" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SKU</label>
                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="e.g. LOGI-WM-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barcode Number (Optional)</label>
                    <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="Leave blank to auto-generate" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price</label>
                      <input type="text" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="$29.99" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weight</label>
                      <input type="text" name="weight" value={formData.weight} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="0.5 kg" />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" placeholder="Product details..."></textarea>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Barcode Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barcode Type</label>
                      <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="code128">Code 128</option>
                        <option value="code39">Code 39</option>
                        <option value="ean13">EAN-13</option>
                        <option value="upca">UPC-A</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barcode Color</label>
                      <div className="flex items-center space-x-2">
                        <input type="color" name="barcolor" value={formData.barcolor} onChange={handleChange} className="h-10 w-10 rounded cursor-pointer border-0 p-0" />
                        <span className="text-sm text-gray-500">{formData.barcolor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Color</label>
                      <div className="flex items-center space-x-2">
                        <input type="color" name="textcolor" value={formData.textcolor} onChange={handleChange} className="h-10 w-10 rounded cursor-pointer border-0 p-0" />
                        <span className="text-sm text-gray-500">{formData.textcolor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
                  <button type="button" onClick={handleReset} className="flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </button>
                  <button type="submit" disabled={loading} className="flex items-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Barcode className="w-4 h-4 mr-2" />
                    )}
                    Generate Barcode
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Preview Section */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 sticky top-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Live Preview
                </h2>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center min-h-[300px] relative">
                  {loading ? (
                    <div className="flex flex-col items-center space-y-3 text-blue-500">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Generating...</span>
                    </div>
                  ) : barcodeImage ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Using checkered background to show transparency clearly */}
                      <div className="w-full bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-center" style={{ backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
                        <img src={barcodeImage} alt="Generated Barcode" className="max-w-full h-auto object-contain" style={{ maxHeight: '150px' }} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button onClick={handleDownload} className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </button>
                        <button onClick={handlePrint} className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600">
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center text-gray-400 dark:text-gray-500">
                      <Barcode className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Fill the form and click Generate to see preview</p>
                    </div>
                  )}
                </div>

                {/* Additional Info summary */}
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Format:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 uppercase">{formData.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Output:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">PNG (Transparent)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`font-medium ${barcodeImage ? 'text-green-500' : 'text-gray-400'}`}>
                      {barcodeImage ? 'Ready to use' : 'Waiting...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default BarcodeGeneratorPage;
