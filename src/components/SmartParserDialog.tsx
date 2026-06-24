// ============================================================
//  SmartParserDialog.tsx
//  Modal shown when Smart Parser mode is on and the user
//  selects an Excel/CSV file.
//
//  On mount, fetches the question list from:
//    GET /api/smart-parser/questions
//
//  Renders each question as a text input in the order returned
//  by the backend, then submits answers in that same order to:
//    POST /api/smart-upload  (via the parent's onSubmit)
//
//  Props:
//    fileName  — name of the selected file (display only)
//    onSubmit  — called with ordered answers on form submit
//    onCancel  — called when user dismisses the dialog
// ============================================================

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader } from 'lucide-react';
import {
  fetchSmartParserQuestions,
  type SmartParserQuestion,
  type SmartParserAnswer,
} from '../utils/api';

interface Props {
  fileName: string;
  onSubmit: (answers: SmartParserAnswer[]) => Promise<void>;
  onCancel: () => void;
}

export default function SmartParserDialog({ fileName, onSubmit, onCancel }: Props) {
  const [questions,    setQuestions]    = useState<SmartParserQuestion[] | null>(null);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [answers,      setAnswers]      = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ── Fetch questions from backend on mount ──────────────────
  useEffect(() => {
    fetchSmartParserQuestions()
      .then(qs => {
        setQuestions(qs);
        setAnswers(qs.map(() => ''));
      })
      .catch(e => setFetchError((e as Error).message ?? 'Failed to load questions'));
  }, []);

  const setAnswer = (index: number, value: string) =>
    setAnswers(prev => prev.map((a, i) => (i === index ? value : a)));

  const canSubmit =
    !isSubmitting &&
    questions !== null &&
    questions.every((q, i) => !q.required || answers[i]?.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questions) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Build ordered answer array preserving question IDs
      const payload: SmartParserAnswer[] = questions.map((q, i) => ({
        id:     q.id,
        answer: answers[i] ?? '',
      }));
      await onSubmit(payload);
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Failed to submit answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card sp-dialog" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={17} style={{ color: 'var(--accent)' }} />
            <h2 className="modal-title">Smart Parser</h2>
          </div>
          <button className="icon-btn" onClick={onCancel} title="Close">
            <X size={16} />
          </button>
        </div>

        <p className="sp-dialog-intro">
          Answer a few quick questions to help the AI better understand{' '}
          <strong>{fileName}</strong>.
        </p>

        {/* ── Loading state ────────────────────────────────── */}
        {!questions && !fetchError && (
          <div className="sp-dialog-loading">
            <Loader size={16} className="sp-spinner" />
            Loading questions…
          </div>
        )}

        {/* ── Fetch error ──────────────────────────────────── */}
        {fetchError && (
          <p className="uploader-error" style={{ marginBottom: 16 }}>{fetchError}</p>
        )}

        {/* ── Dynamic question form ────────────────────────── */}
        {questions && (
          <form onSubmit={handleSubmit}>
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="sp-dialog-field"
                style={i === questions.length - 1 ? { marginBottom: 0 } : undefined}
              >
                <label className="sp-dialog-label">
                  {q.label}
                  {q.required && <span className="sp-required"> *</span>}
                </label>
                <input
                  className="sp-dialog-input"
                  type="text"
                  placeholder={q.placeholder ?? ''}
                  value={answers[i] ?? ''}
                  onChange={e => setAnswer(i, e.target.value)}
                  required={q.required}
                  autoFocus={i === 0}
                />
              </div>
            ))}

            {submitError && (
              <p className="uploader-error" style={{ marginBottom: 12 }}>{submitError}</p>
            )}

            <div className="sp-dialog-actions">
              <button
                type="button"
                className="text-btn"
                onClick={onCancel}
                style={{ textDecoration: 'none', padding: '9px 12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sp-submit-btn"
                disabled={!canSubmit}
              >
                {isSubmitting ? 'Uploading…' : 'Submit & Upload'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
