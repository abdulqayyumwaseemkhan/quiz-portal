import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const ManageCampusesPage = () => {
  const [campuses, setCampuses] = useState([]);
  const [newCampus, setNewCampus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCampuses = async () => {
    try {
      const { data } = await API.get('/admin/campuses');
      setCampuses(data);
    } catch (error) {
      toast.error('Failed to load campuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  const handleAddCampus = async (e) => {
    e.preventDefault();
    if (!newCampus.trim()) return;
    
    try {
      const { data } = await API.post('/admin/campuses', { name: newCampus.trim() });
      setCampuses([...campuses, data]);
      setNewCampus('');
      toast.success('Campus added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add campus');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this campus?')) {
      try {
        await API.delete(`/admin/campuses/${id}`);
        setCampuses(campuses.filter(c => c._id !== id));
        toast.success('Campus deleted');
      } catch (error) {
        toast.error('Failed to delete campus');
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-10">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-slate-100 tracking-tight">Manage Campuses</h1>
          <p className="text-slate-400 font-medium mt-1">Add or remove explicit campus entries for the system</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <form onSubmit={handleAddCampus} className="bg-slate-900 p-8 rounded-2xl shadow-xl shadow-black/50 border border-slate-800">
              <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                 <MapPin className="text-primary-600" size={24} /> Add New Campus
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Campus Name</label>
                  <input
                    type="text"
                    placeholder="e.g. North Campus"
                    className="input-field"
                    value={newCampus}
                    onChange={(e) => setNewCampus(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                  <Plus size={20} /> Add Campus
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-2xl shadow-xl shadow-black/50 border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-lg font-bold text-slate-200">Existing Campuses</h2>
                <span className="bg-primary-500/10 text-primary-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{campuses.length} Campuses</span>
              </div>
              <div className="p-6">
                {loading ? (
                  <p className="text-slate-400 text-center py-8">Loading...</p>
                ) : campuses.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 font-medium">No explicit campuses found. Add one to get started.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campuses.map(campus => (
                      <div key={campus._id} className="flex justify-between items-center p-4 rounded-xl border border-slate-800 hover:border-primary-200 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-600">
                              <MapPin size={20} />
                           </div>
                           <span className="font-bold text-slate-200">{campus.name}</span>
                        </div>
                        <button 
                          onClick={() => handleDelete(campus._id)}
                          className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Campus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageCampusesPage;
