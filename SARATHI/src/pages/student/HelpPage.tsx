import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Send,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { apiClient } from '../../services/apiClient';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Assessments',
    question: 'How does the AI Diagnostic Assessment work?',
    answer:
      'The assessment evaluates your technical competencies across targeted roles (Full Stack, AI/ML, Cloud/DevOps, Cybersecurity). It consists of interactive diagnostic questions and practical real-world tasks. Your answers are auto-evaluated against verified rubrics.'
  },
  {
    id: 'faq-2',
    category: 'Skill Passport',
    question: 'What makes the Skill Passport verifiable by recruiters?',
    answer:
      'Unlike traditional self-declared resumes, each skill entry in your Sarathi Skill Passport is backed by demonstrable proof: validated GitHub repository links, automated test scores, and recruiter verification reviews. Recruiters can inspect public passports via unique tamper-evident URLs.'
  },
  {
    id: 'faq-3',
    category: 'Roadmaps',
    question: 'How do learning roadmaps update as I complete milestones?',
    answer:
      'Your roadmap progress syncs automatically with our SQLite database. As you check off items or complete linked learning resources from our curated catalog, your stage percentages and overall role readiness score increment in real-time.'
  },
  {
    id: 'faq-4',
    category: 'GitHub Import',
    question: 'Can I import my projects directly from GitHub?',
    answer:
      'Yes! In the Projects portal, enter any public GitHub repository URL (e.g., github.com/username/project). Sarathi will fetch the repository title, description, detected language stack, and stars to pre-fill your project evidence.'
  },
  {
    id: 'faq-5',
    category: 'Recruiter Applications',
    question: 'How do employers discover my profile?',
    answer:
      'When your readiness score meets job criteria or when you submit direct applications, your profile and verified passport become visible to partner recruiters. You can track your status in real-time through the Application Funnel in Analytics.'
  }
];

export const HelpPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');
  const [category, setCategory] = useState<'bug_report' | 'feature_request' | 'content_issue' | 'general'>('general');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setSubmitError('Please provide details for your feedback.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiClient.post('/api/feedback', {
        category,
        rating,
        message: message.trim(),
        pageUrl: window.location.pathname
      });
      setSubmitSuccess(true);
      setMessage('');
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Help Center & Student Feedback"
        description="Browse frequently asked questions or submit recommendations directly to the platform engineering team."
        badge={
          <Badge variant="purple" icon={<HelpCircle className="w-3.5 h-3.5" />}>
            SUPPORT & FAQ
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* FAQ ACCORDION (2 COLUMNS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#0B1B43] text-lg">Frequently Asked Questions</h3>
            <span className="text-xs text-[#405B8B] font-semibold">{FAQ_LIST.length} Guides</span>
          </div>

          <div className="space-y-3">
            {FAQ_LIST.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-[#E0E7F2] transition-all overflow-hidden shadow-xs hover:border-[#087BFA]"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#087BFA]">
                        {faq.category}
                      </span>
                      <h4 className="font-bold text-sm text-[#0B1B43]">{faq.question}</h4>
                    </div>
                    <div className="p-1 rounded-lg bg-[#F4F7FC] text-[#405B8B]">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-[#405B8B] leading-relaxed border-t border-[#F1F5F9]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK FORM (1 COLUMN) */}
        <Card className="p-6 space-y-4 lg:sticky lg:top-24 border border-[#E0E7F2]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-[#603DF5]">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B1B43] text-base">Direct Feedback</h3>
              <p className="text-xs text-[#405B8B]">Help us improve Sarathi</p>
            </div>
          </div>

          {submitSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-800">Thank you for your feedback!</p>
              <p className="text-[11px] text-emerald-700">Your comments have been delivered to our product team.</p>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#0B1B43] block mb-1">Feedback Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                >
                  <option value="general">General Feedback</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="content_issue">Content or Question Issue</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0B1B43] block mb-1">Experience Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-lg p-1 transition-transform hover:scale-110 cursor-pointer ${
                        star <= rating ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-[#405B8B] ml-2">{rating}/5</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0B1B43] block mb-1">Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share bugs, suggestions, or feature requests..."
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-xs text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] placeholder:text-slate-400"
                  maxLength={1000}
                />
              </div>

              {submitError && (
                <p className="text-xs text-red-600 font-medium">{submitError}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Send Feedback
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
