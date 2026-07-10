import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, ArrowLeft, HelpCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ManageQuestionsPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    type: 'mcq',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, qsRes] = await Promise.all([
          API.get(`/quizzes/${quizId}`),
          API.get(`/quizzes/${quizId}/questions`)
        ]);
        setQuiz(qRes.data);
        setQuestions(qsRes.data);
      } catch (error) {
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, [quizId]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      if (newQuestion.type === 'mcq' && !newQuestion.correctAnswer) {
        return toast.error('Please select the correct answer');
      }
      const { data } = await API.post(`/quizzes/${quizId}/questions`, newQuestion);
      setQuestions([...questions, data]);
      setShowAdd(false);
      setNewQuestion({
        questionText: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1
      });
      toast.success('Question added');
    } catch (error) {
      toast.error('Failed to add question');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this question?')) {
      try {
        await API.delete(`/quizzes/questions/${id}`);
        setQuestions(questions.filter(q => q._id !== id));
        toast.success('Question removed');
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const handleOptionChange = (idx, val) => {
    const opts = [...newQuestion.options];
    opts[idx] = val;
    setNewQuestion({ ...newQuestion, options: opts });
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <header className="flex justify-between items-end mb-10">
          <div>
            <span className="text-primary-600 font-bold uppercase tracking-widest text-sm">Managing Content For</span>
            <h1 className="text-3xl font-black text-slate-100 mt-1">{quiz?.title}</h1>
            <p className="text-slate-400">{questions.length} Questions Added So Far</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className={`btn-primary flex items-center gap-2 px-6 ${showAdd ? 'bg-red-500 hover:bg-red-600' : ''}`}
          >
            {showAdd ? 'Cancel' : <><Plus size={20} /> Add Question</>}
          </button>
        </header>

        {showAdd && (
          <form onSubmit={handleAddQuestion} className="card bg-slate-900 p-8 mb-10 border-2 border-primary-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-300 mb-2">Question Text</label>
                <textarea
                  className="input-field h-24"
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Question Type</label>
                <select 
                  className="input-field" 
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value, correctAnswer: '' })}
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="short">Short Answer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Marks</label>
                <input
                  type="number"
                  className="input-field"
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            {newQuestion.type === 'mcq' ? (
              <div className="space-y-4 mb-6">
                <label className="block text-sm font-bold text-slate-300">Options (Select the correct one)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                        checked={newQuestion.correctAnswer === opt && opt !== ''}
                        onChange={() => setNewQuestion({...newQuestion, correctAnswer: opt})}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${i+1}`}
                        className="input-field"
                        value={opt}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-2">Correct Answer (Exact Match)</label>
                <input
                  type="text"
                  className="input-field"
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                  required
                />
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3">Save Question</button>
          </form>
        )}

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q._id} className="card relative group hover:border-primary-300 transition-all border-l-4 border-l-primary-600">
               <button 
                  onClick={() => handleDelete(q._id)}
                  className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>

                <div className="flex items-start gap-4">
                  <div className="bg-primary-500/10 text-primary-700 w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{q.type}</span>
                       <span className="text-slate-500 text-xs font-medium">{q.marks} Marks</span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-200 pr-10">{q.questionText}</h4>
                    
                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${q.correctAnswer === opt ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                             {q.correctAnswer === opt ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                             {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short' && (
                       <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 font-medium">
                          Correct Answer: {q.correctAnswer}
                       </div>
                    )}
                  </div>
                </div>
            </div>
          ))}

          {questions.length === 0 && !showAdd && (
            <div className="text-center py-20 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700">
               <HelpCircle size={48} className="mx-auto text-slate-600 mb-4" />
               <p className="text-slate-400 font-medium text-lg">Empty Quiz</p>
               <p className="text-slate-500">Click the button above to add your first question.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageQuestionsPage;
