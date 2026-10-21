import React from 'react';
import { X, Shield, Cpu, AlertTriangle } from 'lucide-react';

interface IntegrityScoreModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrityScoreModelModal: React.FC<IntegrityScoreModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Anti-Cheat Risk Model Architecture</h2>
              <p className="text-xs text-slate-500">Explainable logistic regression with 8 normalized signals</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600">
          {/* Formula Callout */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono space-y-1.5 border border-slate-800">
            <div className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">Mathematical Formulation</div>
            <div className="text-sm text-white font-bold">x = &sum;(w_i &times; f_i) - 3.2</div>
            <div className="text-sm text-emerald-400 font-bold">Risk Score = round( 100 / ( 1 + e^(-x) ) )</div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              Logistic sigmoid mapping: Low (&lt;35), Medium (35–64), High (&ge;65)
            </div>
          </div>

          {/* Features Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calibrated Feature Weights (Model v1.0.0)</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Feature</th>
                    <th className="px-2 py-2">Weight</th>
                    <th className="px-3 py-2">Definition / Normalization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">similarity</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">2.4</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      Max Jaccard similarity of 5-token shingles vs up to 500 recent submissions of the same question (90 days).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">pasteRatio</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">1.6</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      min(pastedChars / finalCodeLength, 1.0). Ratio of pasted text relative to submitted solution.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">paste</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">1.4</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      min(pasteCount / 5, 1.0). Frequency of paste actions detected during test session.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">fast</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">1.2</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      clamp(-zScore / 3, 0, 1). Unusually fast solve time compared to peer distribution (&ge;10 peers required).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">camera</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">1.0</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      Share of session duration where webcam feed was absent, obstructed, or multiple faces were detected.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">blurTime</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">0.8</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      min(blurSeconds / 120, 1.0). Cumulative seconds candidate spent away from the active browser window.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">blur</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">0.8</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      min(tabSwitchCount / 10, 1.0). Frequency of tab switches and focus lost events.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">firstTry</td>
                    <td className="px-2 py-2 font-bold text-indigo-600">0.6</td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      1.0 if all tests passed on the first run AND fast &gt; 0.5; otherwise 0.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold">Human-in-the-Loop Safeguard:</strong> The risk score serves strictly as an advisory triage mechanism. Automated test scores and candidate skill credentials are never automatically altered by the model. Only an authorized administrator can confirm a violation and optionally invalidate test scores.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
