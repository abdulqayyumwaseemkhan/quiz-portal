import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api';
import { Trophy, CheckCircle2, XCircle, Home, FileText, Award } from 'lucide-react';
import StudentNavbar from '../components/StudentNavbar';

const ResultPage = () => {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await API.get(`/student/result/${resultId}`);
        setResult(data);
      } catch (error) {
        console.error('Error fetching result:', error);
      } finally {
        setLoading(false);
      }
    };
    if (resultId) fetchResult();
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto">
        <div className="h-64 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <XCircle size={40} className="text-rose-600 mb-3" />
        <h1 className="text-xl font-bold mb-1">Result Not Found</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Could not locate the requested quiz result.
        </p>
        <Link to="/quizzes" className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
          <Home size={16} /> Back to Quizzes
        </Link>
      </div>
    );
  }

  if (result.quizId && !result.quizId.resultsReleased) {
    return (
      <div className="min-h-screen">
        <StudentNavbar student={student} />
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
          <div className="max-w-lg w-full card p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Submission Recorded</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Thank you, <strong>{result.studentName}</strong>. Your quiz attempt has been saved.
            </p>
            <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] text-xs font-medium mb-6">
              {result.message || 'Detailed scores and solutions will be visible once released by your instructor.'}
            </div>
            <Link to="/quizzes" className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
              <Home size={16} /> Back to Quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;

  return (
    <div className="min-h-screen pb-20 md:pb-12">
      <StudentNavbar student={student} />
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
        <div className="card text-center p-6 sm:p-8 mb-8">
          <div className="flex justify-center mb-4">
            <div
              className={`p-4 rounded-full ${
                isPassed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
              }`}
            >
              <Trophy size={40} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{result.quizId?.title || 'Quiz Result'}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {result.studentName} ({result.studentId})
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Score</p>
              <p className="text-2xl font-bold mt-1">
                {result.score} / {result.totalPossibleMarks}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Percentage</p>
              <p className={`text-2xl font-bold mt-1 ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.percentage}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Status</p>
              <p className={`text-2xl font-bold mt-1 ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPassed ? 'PASSED' : 'FAILED'}
              </p>
            </div>
          </div>

          <Link to="/quizzes" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm">
            <Home size={16} /> Back to Quizzes
          </Link>
        </div>

        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <FileText size={20} /> Question Review
        </h2>

        <div className="space-y-4">
          {result.answers?.map((item, idx) => (
            <div
              key={idx}
              className={`card p-5 border-l-4 ${
                item.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <h4 className="text-sm sm:text-base font-semibold">
                  <span className="text-xs text-[var(--text-muted)] block mb-0.5">
                    Question {idx + 1}
                  </span>
                  {item.questionId?.questionText}
                </h4>
                {item.isCorrect ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                    <CheckCircle2 size={14} /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                    <XCircle size={14} /> Incorrect
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                <div>
                  <p className="text-[var(--text-secondary)] font-semibold uppercase mb-1">Your Answer</p>
                  <p className={`font-bold ${item.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.answer || 'No Answer'}
                  </p>
                </div>
                {!item.isCorrect && item.questionId?.correctAnswer && (
                  <div>
                    <p className="text-[var(--text-secondary)] font-semibold uppercase mb-1">Correct Answer</p>
                    <p className="font-bold text-emerald-600">{item.questionId.correctAnswer}</p>
                  </div>
                )}
              </div>

              {item.questionId?.explanation && (
                <p className="mt-3 text-xs text-[var(--text-secondary)] bg-[var(--accent-subtle)] p-2.5 rounded-lg">
                  <strong>Explanation:</strong> {item.questionId.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
