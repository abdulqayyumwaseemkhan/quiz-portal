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
      <div className="student-portal min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-64 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="student-portal min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <XCircle size={38} className="text-[var(--status-danger)] mb-3" />
        <h1 className="text-xl font-bold mb-1">Result Not Found</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Could not locate the requested assessment record.
        </p>
        <Link to="/quizzes" className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          <Home size={15} /> Back to Quizzes
        </Link>
      </div>
    );
  }

  if (result.quizId && !result.quizId.resultsReleased) {
    return (
      <div className="student-portal min-h-screen">
        <StudentNavbar student={student} />
        <main className="lg:pl-60">
          <div className="flex items-center justify-center p-6 min-h-[calc(100vh-64px)]">
            <div className="max-w-lg w-full card p-8 text-center">
              <div className="w-12 h-12 rounded-md academic-badge-warning border flex items-center justify-center mx-auto mb-4">
                <Award size={26} />
              </div>
              <h1 className="text-xl font-bold mb-2">Submission Recorded</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Thank you, <strong>{result.studentName}</strong>. Your assessment attempt has been saved.
              </p>
              <div className="p-4 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] mb-6">
                {result.message ||
                  'Detailed scores and solutions will be visible once released by your instructor.'}
              </div>
              <Link
                to="/quizzes"
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Home size={15} /> Return to Quizzes
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;

  return (
    <div className="student-portal min-h-screen pb-16">
      <StudentNavbar student={student} />
      <main className="lg:pl-60">
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
          <div className="card text-center p-6 sm:p-8 mb-8">
            <div className="flex justify-center mb-4">
              <div
                className={`p-3.5 rounded-md border ${
                  isPassed ? 'academic-badge-success' : 'academic-badge-danger'
                }`}
              >
                <Trophy size={32} />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">
              {result.quizId?.title || 'Assessment Result'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {result.studentName} ({result.studentId})
            </p>

            {result.gradingStatus === 'pending_manual_grading' && (
              <div className="mb-6 p-4 rounded-md academic-badge-warning border text-xs text-left leading-relaxed">
                <strong>Evaluation in Progress:</strong> This assessment includes written or coding responses awaiting instructor review. Your final grade will update automatically once graded.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-md bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Score</p>
                <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">
                  {result.score} / {result.totalPossibleMarks}
                </p>
              </div>
              <div className="p-4 rounded-md bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">
                  Percentage
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{
                    color: isPassed ? 'var(--status-success)' : 'var(--status-danger)',
                  }}
                >
                  {result.percentage}%
                </p>
              </div>
              <div className="p-4 rounded-md bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">
                  Standing
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{
                    color: isPassed ? 'var(--status-success)' : 'var(--status-danger)',
                  }}
                >
                  {isPassed ? 'PASSED' : 'NEEDS REVIEW'}
                </p>
              </div>
            </div>

            <Link
              to="/quizzes"
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <Home size={15} /> Back to Quizzes
            </Link>
          </div>

          <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
            <FileText size={18} className="text-[var(--accent)]" /> Question-by-Question Review
          </h2>

          <div className="space-y-4">
            {result.answers?.map((item, idx) => (
              <div
                key={idx}
                className="card p-5 border-l-4"
                style={{
                  borderLeftColor: item.isCorrect
                    ? 'var(--status-success)'
                    : 'var(--status-danger)',
                }}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <h4 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                    <span className="text-xs text-[var(--text-secondary)] block mb-0.5">
                      Question {idx + 1}
                    </span>
                    {item.questionId?.questionText}
                  </h4>
                  {item.isCorrect ? (
                    <span className="academic-badge academic-badge-success shrink-0">
                      <CheckCircle2 size={13} /> Correct
                    </span>
                  ) : (
                    <span className="academic-badge academic-badge-danger shrink-0">
                      <XCircle size={13} /> Incorrect
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-md bg-[var(--bg-muted)] border border-[var(--border)]">
                  <div>
                    <p className="text-[var(--text-secondary)] font-semibold uppercase mb-1">
                      Your Response
                    </p>
                    {item.questionId?.type === 'code' ? (
                      <pre className="font-mono text-xs p-3 rounded bg-[#1B222B] text-[#E6EBF1] border border-[#35414E] whitespace-pre-wrap overflow-x-auto max-h-48">
                        {item.answer || '(No code submitted)'}
                      </pre>
                    ) : (
                      <p
                        className="font-semibold"
                        style={{
                          color: item.isCorrect
                            ? 'var(--status-success)'
                            : item.isCorrect === null
                            ? 'var(--status-warning)'
                            : 'var(--status-danger)',
                        }}
                      >
                        {item.answer || 'No Answer'}
                      </p>
                    )}
                  </div>
                  {!item.isCorrect &&
                    item.questionId?.correctAnswer &&
                    item.questionId?.type === 'mcq' && (
                      <div>
                        <p className="text-[var(--text-secondary)] font-semibold uppercase mb-1">
                          Correct Answer
                        </p>
                        <p
                          className="font-semibold"
                          style={{ color: 'var(--status-success)' }}
                        >
                          {item.questionId.correctAnswer}
                        </p>
                      </div>
                    )}
                  {item.marksObtained !== undefined && (
                    <div className="sm:col-span-2 pt-2 border-t border-[var(--border)] flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)]">Marks Awarded:</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {item.marksObtained} / {item.questionId?.marks || 1}
                      </span>
                    </div>
                  )}
                  {item.teacherRemarks && (
                    <div className="sm:col-span-2 p-2.5 rounded academic-badge-info border text-xs">
                      <strong>Instructor Remarks:</strong> {item.teacherRemarks}
                    </div>
                  )}
                </div>

                {item.questionId?.explanation && (
                  <p className="mt-3 text-xs text-[var(--text-secondary)] bg-[var(--accent-subtle)] p-3 rounded-md">
                    <strong>Explanation:</strong> {item.questionId.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultPage;
