import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import { Search, Package, Tag, Hash, DollarSign, Scale, AlignLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const ProductDetailsPage = () => {
  const { barcodeParam } = useParams();
  const navigate = useNavigate();
  const [barcodeInput, setBarcodeInput] = useState(barcodeParam || '');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input field automatically so a physical scanner can type into it immediately
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    if (barcodeParam) {
      fetchProductDetails(barcodeParam);
    }
  }, [barcodeParam]);

  const fetchProductDetails = async (barcode) => {
    if (!barcode) return;
    
    setLoading(true);
    setProduct(null);
    try {
      const response = await API.get(`/barcodes/${barcode}`);
      setProduct(response.data);
      toast.success('Product details loaded');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        toast.error('Product not found for this barcode');
      } else {
        toast.error('Failed to fetch product details');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      navigate(`/product/${barcodeInput.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="text-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center space-x-3 mb-2"
          >
            <div className="p-3 bg-blue-600 rounded-full shadow-lg">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Product Scanner
            </h1>
          </motion.div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Scan a barcode or enter it manually to see product details
          </p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-gray-700"
        >
          <form onSubmit={handleSearch} className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scan Barcode Here
            </label>
            <div className="flex gap-4">
              <input 
                ref={inputRef}
                type="text" 
                value={barcodeInput} 
                onChange={(e) => setBarcodeInput(e.target.value)} 
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow text-lg" 
                placeholder="Waiting for scanner input..." 
                autoFocus
              />
              <button 
                type="submit" 
                disabled={loading || !barcodeInput.trim()}
                className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-70 transition-all font-medium flex items-center shadow-md"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {product && !loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Package className="w-6 h-6 mr-2 text-blue-500" />
                {product.productName}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Tag className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brand</p>
                      <p className="text-base text-gray-900 dark:text-white">{product.brandName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Hash className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SKU</p>
                      <p className="text-base text-gray-900 dark:text-white">{product.sku || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Info className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                      <p className="text-base text-gray-900 dark:text-white">{product.category || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <DollarSign className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{product.price || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Scale className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Weight</p>
                      <p className="text-base text-gray-900 dark:text-white">{product.weight || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex items-start">
                  <AlignLeft className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
                    <p className="text-base text-gray-900 dark:text-white mt-1 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
