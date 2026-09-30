'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Scale,
  Calendar,
  Image as ImageIcon,
  Utensils,
  Dumbbell,
  History,
  Upload,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  X,
  AlertCircle,
  CreditCard,
  Check,
  Activity,
  Eye,
  RefreshCw,
  Droplets,
  Flame,
  Award,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Target,
  LineChart
} from 'lucide-react';

interface UserDashboardProps {
  user: {
    id: string;
    name: string;
    role: string;
    age?: number | string;
    initial_weight?: number | string;
    height?: number | string;
    target_weight?: number | string;
  };
  onLogout: () => void;
}

const FITNESS_TIPS = [
  {
    id: 1,
    title: 'Optimal Hydration Target',
    tag: 'Nutrition',
    icon: Droplets,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    text: 'Drink at least 3.5 to 4 Liters of water daily. Proper hydration boosts metabolic rate by up to 30% and accelerates recovery.'
  },
  {
    id: 2,
    title: 'Protein Intake Rule',
    tag: 'Muscle Recovery',
    icon: Utensils,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    text: 'Aim for 1.8g to 2.2g of protein per kg of body weight. Distribute your protein evenly across 3-4 meals to maximize protein synthesis.'
  },
  {
    id: 3,
    title: 'Sleep & Muscle Growth',
    tag: 'Recovery',
    icon: Sparkles,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    text: 'Get 7-8 hours of uninterrupted sleep every night. Over 80% of human growth hormone is released during deep REM sleep.'
  },
  {
    id: 4,
    title: 'Progressive Overload',
    tag: 'Training',
    icon: Dumbbell,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    text: 'Focus on gradual progress: add 1 rep or slightly increase resistance each session to continuously stimulate muscle hypertrophy.'
  }
];

export default function UserDashboard({ user, onLogout }: UserDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'diet' | 'workout' | 'history'>('log');

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [logDate, setLogDate] = useState(getTodayStr());
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Water Tracker local state
  const [waterGlasses, setWaterGlasses] = useState(6);
  const [tipIndex, setTipIndex] = useState(0);

  // Payment state
  const [paymentReminder, setPaymentReminder] = useState<any>(null);

  const fetchDashboard = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);

      const res = await fetch(`/api/user/dashboard?userId=${encodeURIComponent(user.id)}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }

      const resPay = await fetch(`/api/user/payments?userId=${encodeURIComponent(user.id)}`);
      const dataPay = await resPay.json();
      if (resPay.ok) {
        setPaymentReminder(dataPay.reminder || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true);
    const interval = setInterval(() => {
      fetchDashboard(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Keep log form clean by default so user can immediately type new weight and pick new image
  const clearLogForm = () => {
    setWeight('');
    setNotes('');
    setImagePreview(null);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = () => resolve(event.target?.result as string);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image file size must be under 15MB' });
        return;
      }
      try {
        const compressed = await compressImage(file);
        setImagePreview(compressed);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to process selected image' });
      }
    }
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || isNaN(Number(weight))) {
      setMessage({ type: 'error', text: 'Please enter a valid weight in kg' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          logDate,
          weight: parseFloat(weight),
          notes,
          imageUrl: imagePreview || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit log');

      setMessage({ type: 'success', text: result.message || 'Daily log saved successfully!' });
      setWeight('');
      setNotes('');
      setImagePreview(null);
      await fetchDashboard(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Loading Client Dashboard...</p>
        </div>
      </div>
    );
  }

  const logs = data?.logs || [];
  const latestLog = logs.length > 0 ? logs[0] : null;
  const firstLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const totalChange = latestLog && firstLog ? (latestLog.weight - firstLog.weight).toFixed(1) : '0';

  // Chronological logs for trend graph (oldest to newest)
  const chronoLogs = [...logs].reverse();
  const maxW = chronoLogs.length > 0 ? Math.max(...chronoLogs.map((l: any) => Number(l.weight))) : 100;
  const minW = chronoLogs.length > 0 ? Math.min(...chronoLogs.map((l: any) => Number(l.weight))) : 50;

  const activeTip = FITNESS_TIPS[tipIndex];
  const TipIcon = activeTip.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">{user.name}</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Client Workspace
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Coach Afroz Khan Fitness Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>{logs.length > 0 ? `${logs.length} Day Streak` : 'Get Started'}</span>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 active:scale-95"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Payment Alert Banner if Exists */}
        {(() => {
          const activePayment = paymentReminder || data?.paymentReminder;
          if (!activePayment) return null;

          return (
            <div
              className={`p-5 rounded-3xl border shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                activePayment.status === 'PAID'
                  ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200 text-emerald-950'
                  : 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    activePayment.status === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Membership Fee & Payment Reminder
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        activePayment.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {activePayment.status === 'PAID' ? '✓ PAID' : '⌛ PENDING'}
                    </span>
                  </div>
                  <p className="text-sm font-bold mt-1 text-slate-900">
                    Amount: <strong className="text-indigo-600 text-base">₹{activePayment.amount}</strong> • Due Date:{' '}
                    <strong className="text-slate-900">{activePayment.due_date}</strong>
                  </p>
                  {activePayment.notes && (
                    <p className="text-xs text-slate-600 mt-1 italic">"{activePayment.notes}"</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span
                  className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase shadow-xs ${
                    activePayment.status === 'PAID'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {activePayment.status === 'PAID' ? '✓ Fee Cleared' : 'Payment Due'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Onboarding Profile Metrics & Target Goal Progress Banner */}
        {(() => {
          const currentUser = (data?.user || user) as any;
          const oldestLog = logs.length > 0 ? logs[logs.length - 1] : null;

          return (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    Transformation Target & Body Stats
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1.5 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <span>Goal to Achieve: {currentUser?.target_weight ? `${currentUser.target_weight} kg` : 'Target set by Coach'}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto text-center">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Height</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">{currentUser?.height ? `${currentUser.height} cm` : 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Start Weight</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">{currentUser?.initial_weight ? `${currentUser.initial_weight} kg` : (oldestLog ? `${oldestLog.weight} kg` : 'N/A')}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Current Weight</span>
                    <span className="text-xs font-bold text-indigo-600 mt-0.5 block">{latestLog ? `${latestLog.weight} kg` : 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target Goal</span>
                    <span className="text-xs font-bold text-emerald-600 mt-0.5 block">{currentUser?.target_weight ? `${currentUser.target_weight} kg` : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Goal Progress Bar */}
              {currentUser?.target_weight && (currentUser?.initial_weight || oldestLog?.weight) && latestLog?.weight && (
                <div className="pt-2 border-t border-slate-100">
                  {(() => {
                    const initW = Number(currentUser.initial_weight || oldestLog.weight);
                    const targetW = Number(currentUser.target_weight);
                    const currW = Number(latestLog.weight);
                    const totalDist = Math.abs(initW - targetW);
                    const achievedDist = Math.abs(initW - currW);
                    const pct = totalDist > 0 ? Math.min(Math.max(Math.round((achievedDist / totalDist) * 100), 0), 100) : 0;
                    
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-600">Goal Progress to {currentUser.target_weight} kg</span>
                          <span className="text-indigo-600 font-bold">{pct}% Achieved</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500 shadow-xs"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}

        {/* KPI Metrics Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Current Weight</span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {latestLog ? `${latestLog.weight} kg` : 'Not logged'}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Total Progress Logs</span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{logs.length} entries</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                Number(totalChange) <= 0
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}
            >
              {Number(totalChange) <= 0 ? (
                <TrendingDown className="w-6 h-6" />
              ) : (
                <TrendingUp className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Net Weight Loss / Gain</span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {Number(totalChange) > 0 ? `+${totalChange}` : totalChange} kg
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'log'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Daily Weight & Photo Log</span>
          </button>

          <button
            onClick={() => setActiveTab('diet')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'diet'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>My Diet Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('workout')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'workout'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>My Workout Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Progress History ({logs.length})</span>
          </button>
        </div>

        {/* TAB 1: DAILY WEIGHT & PHOTO LOG + GRAPH & TIPS */}
        {activeTab === 'log' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Log Form + Weight Trend Graph */}
            <div className="lg:col-span-2 space-y-6">
              {/* Daily Weight & Photo Log Form */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-indigo-600" />
                      <span>Log Daily Weight & Progress Photo</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Track your daily body weight and progress photos for Coach Afroz to analyze your transformation!
                    </p>
                  </div>

                  {(weight || imagePreview || notes) && (
                    <button
                      type="button"
                      onClick={clearLogForm}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset Form</span>
                    </button>
                  )}
                </div>

                {message && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 ${
                      message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitLog} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Log Date</label>
                      <input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Weight (in kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 72.5"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Upload Progress Photo (Optional)
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all relative overflow-hidden">
                        {imagePreview ? (
                          <div className="relative w-full h-full">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover rounded-2xl"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setImagePreview(null);
                              }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 shadow-md"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                            <Upload className="w-8 h-8 mb-2 text-indigo-600" />
                            <p className="mb-1 text-xs text-slate-700 font-semibold">
                              Click to upload daily progress photo
                            </p>
                            <p className="text-[10px] text-slate-400">PNG, JPG or WEBP (MAX. 5MB)</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Daily Notes / Energy Level (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Felt energetic, completed 10k steps and hit protein target!"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Daily Log</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* VISUAL WEIGHT TREND GRAPH & ANALYTICS */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">Weight Loss & Transformation Trend</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100">
                    {chronoLogs.length} Data Points
                  </span>
                </div>

                {chronoLogs.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                    <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      No weight logs recorded yet. Log your weight above to generate your transformation chart!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Weight Stats Summary Row */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Start Weight</span>
                        <span className="text-sm font-bold text-slate-800 mt-0.5 block">{firstLog?.weight} kg</span>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Latest Weight</span>
                        <span className="text-sm font-bold text-indigo-600 mt-0.5 block">{latestLog?.weight} kg</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Delta</span>
                        <span className={`text-sm font-bold mt-0.5 block ${Number(totalChange) <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {Number(totalChange) > 0 ? `+${totalChange}` : totalChange} kg
                        </span>
                      </div>
                    </div>

                    {/* SVG Line Graph */}
                    <div className="relative h-48 w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                      <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
                        <div className="border-b border-dashed border-slate-400 w-full" />
                        <div className="border-b border-dashed border-slate-400 w-full" />
                        <div className="border-b border-dashed border-slate-400 w-full" />
                      </div>

                      {/* Visual Data Bars & Points */}
                      <div className="relative z-10 h-full w-full flex items-end justify-between gap-2 pt-6 pb-2">
                        {chronoLogs.map((log: any, idx: number) => {
                          const w = Number(log.weight);
                          const range = Math.max(maxW - minW, 1);
                          const heightPercent = Math.max(Math.min(((w - minW) / range) * 70 + 20, 95), 15);

                          return (
                            <div key={log.id || idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                              {/* Tooltip on Hover */}
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-20">
                                {log.log_date}: {log.weight} kg
                              </div>

                              {/* Weight Bar */}
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full max-w-[24px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg group-hover:from-indigo-500 group-hover:to-indigo-300 transition-all shadow-xs"
                              />

                              {/* Date Label */}
                              <span className="text-[9px] font-mono text-slate-400 mt-1 font-semibold truncate max-w-[36px]">
                                {log.log_date.split('-').slice(1).join('/')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Coach Afroz Fitness Tips + Health Trackers */}
            <div className="space-y-6">
              {/* COACH AFROZ'S FITNESS TIPS CAROUSEL */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Coach Afroz's Daily Tips</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTipIndex((prev) => (prev === 0 ? FITNESS_TIPS.length - 1 : prev - 1))}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-500 px-1">
                      {tipIndex + 1}/{FITNESS_TIPS.length}
                    </span>
                    <button
                      onClick={() => setTipIndex((prev) => (prev === FITNESS_TIPS.length - 1 ? 0 : prev + 1))}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Active Tip Card */}
                <div className={`p-4 rounded-2xl border ${activeTip.bgColor} ${activeTip.borderColor} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/80 ${activeTip.textColor} border border-slate-200`}>
                      {activeTip.tag}
                    </span>
                    <TipIcon className={`w-4 h-4 ${activeTip.textColor}`} />
                  </div>

                  <h4 className="text-xs font-bold text-slate-900">{activeTip.title}</h4>
                  <p className="text-xs leading-relaxed text-slate-700">{activeTip.text}</p>
                </div>
              </div>

              {/* DAILY WATER INTAKE TRACKER */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Daily Water Tracker</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600">{waterGlasses}/10 Glasses</span>
                </div>

                <div className="flex items-center justify-between gap-1.5 py-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setWaterGlasses(i + 1)}
                      className={`h-8 flex-1 rounded-lg border transition-all ${
                        i < waterGlasses
                          ? 'bg-blue-500 border-blue-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 border-slate-200 text-slate-300 hover:bg-blue-50'
                      }`}
                      title={`Glass ${i + 1}`}
                    >
                      💧
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                  <span>Target: 3.5 Liters</span>
                  <button
                    onClick={() => setWaterGlasses((prev) => Math.min(prev + 1, 10))}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>+ Add 1 Glass</span>
                  </button>
                </div>
              </div>

              {/* TRANSFORMATION MOTIVATION BADGE */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Personal Goal Progress</span>
                </div>
                <h4 className="text-base font-bold">Stay Consistent, Trust The Process!</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  Log your weight every morning after waking up for the most accurate body composition trend.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY DIET PLAN */}
        {activeTab === 'diet' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Assigned Diet & Nutrition Plan</h3>
                <p className="text-xs text-slate-500">Customized meal routine created by Coach Afroz Khan.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-mono">
              {data?.plan?.diet_plan || 'No diet plan assigned yet by admin.'}
            </div>
          </div>
        )}

        {/* TAB 3: MY WORKOUT PLAN */}
        {activeTab === 'workout' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Assigned Workout & Training Plan</h3>
                <p className="text-xs text-slate-500">Customized exercise routine created by Coach Afroz Khan.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-mono">
              {data?.plan?.workout_plan || 'No workout plan assigned yet by admin.'}
            </div>
          </div>
        )}

        {/* TAB 4: PROGRESS HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Your Past Logged Weight & Photos</h3>
            {logs.length === 0 ? (
              <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-slate-500">No logs recorded yet. Start logging above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {log.log_date}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          {log.weight} kg
                        </span>
                      </div>

                      {log.image_url ? (
                        <div
                          onClick={() => setSelectedPhoto(log.image_url)}
                          className="relative group rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer h-52 mb-3"
                        >
                          <img
                            src={log.image_url}
                            alt={`Progress ${log.log_date}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" /> Enlarge
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs mb-3">
                          No photo for this log
                        </div>
                      )}

                      {log.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox Photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md p-4 flex items-center justify-center animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedPhoto} alt="Progress Photo Full" className="max-w-full max-h-[85vh] object-contain rounded-3xl" />
          </div>
        </div>
      )}
    </div>
  );
}
