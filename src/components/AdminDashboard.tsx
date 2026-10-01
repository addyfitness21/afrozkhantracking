'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Users,
  Settings,
  Utensils,
  Dumbbell,
  UserPlus,
  Key,
  Trash2,
  Scale,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Eye,
  MessageSquare,
  CreditCard,
  Send,
  ArrowLeft,
  Calendar,
  Search,
  Plus,
  Clock,
  ChevronRight,
  Filter,
  Activity,
  ShieldCheck,
  Lock,
  User,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { authFetch } from '@/lib/clientAuth';


interface AdminDashboardProps {
  user: { id: string; name: string; role: string };
  onLogout: () => void;
}

function calculateBMI(weightKg?: number | string | null, heightCm?: number | string | null) {
  if (!weightKg || !heightCm) return null;
  const w = parseFloat(String(weightKg));
  const h = parseFloat(String(heightCm));
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
  
  const heightM = h / 100;
  const bmi = w / (heightM * heightM);
  
  let category = 'Normal';
  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  
  if (bmi < 18.5) {
    category = 'Underweight';
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (bmi < 25) {
    category = 'Normal';
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (bmi < 30) {
    category = 'Overweight';
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    category = 'Obese';
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  }
  
  return {
    value: bmi.toFixed(1),
    numeric: bmi,
    category,
    colorClass
  };
}

function calculateBMR(
  weightKg?: number | string | null, 
  heightCm?: number | string | null, 
  ageYears?: number | string | null,
  gender?: string | null
) {
  if (!weightKg || !heightCm || !ageYears) return null;
  const w = parseFloat(String(weightKg));
  const h = parseFloat(String(heightCm));
  const a = parseInt(String(ageYears), 10);
  if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) return null;

  const isFemale = gender && gender.toUpperCase() === 'FEMALE';
  const bmr = (10 * w) + (6.25 * h) - (5 * a) + (isFemale ? -161 : 5);
  const rounded = Math.round(bmr);
  
  return {
    value: rounded,
    text: `${rounded} kcal/day`
  };
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  // Navigation: 'grid' (all client cards first) OR 'detail' (viewing selected client page)
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  
  // Tabs within client detail view: 'logs' | 'photos' | 'plans' | 'payments' | 'settings'
  const [detailTab, setDetailTab] = useState<'logs' | 'photos' | 'plans' | 'payments' | 'settings'>('logs');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected client detail state
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [clientPlan, setClientPlan] = useState<{ diet_plan: string; workout_plan: string }>({ diet_plan: '', workout_plan: '' });
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<any>(null);

  // Edit selected client credentials states inside client detail view
  const [editClientId, setEditClientId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPass, setEditClientPass] = useState('');
  const [editClientAge, setEditClientAge] = useState('');
  const [editClientInitialWeight, setEditClientInitialWeight] = useState('');
  const [editClientHeight, setEditClientHeight] = useState('');
  const [editClientTargetWeight, setEditClientTargetWeight] = useState('');
  const [editClientGender, setEditClientGender] = useState('MALE');
  const [savingClientCreds, setSavingClientCreds] = useState(false);

  // Date filter for progress photos
  const [dateFilter, setDateFilter] = useState('');

  // Add New Client Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserAge, setNewUserAge] = useState('');
  const [newUserInitialWeight, setNewUserInitialWeight] = useState('');
  const [newUserHeight, setNewUserHeight] = useState('');
  const [newUserTargetWeight, setNewUserTargetWeight] = useState('');
  const [newUserGender, setNewUserGender] = useState('MALE');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');

  // Track the real admin ID as it changes over time (survives password/ID changes)
  const [currentAdminId, setCurrentAdminId] = useState<string>('__ADMIN_ROLE__');

  // Admin Self Settings Modal state
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [adminSelfId, setAdminSelfId] = useState(user.id);
  const [adminSelfName, setAdminSelfName] = useState(user.name);
  const [adminSelfPass, setAdminSelfPass] = useState('');
  const [savingAdminSelf, setSavingAdminSelf] = useState(false);

  // Plan editing state
  const [dietPlanText, setDietPlanText] = useState('');
  const [workoutPlanText, setWorkoutPlanText] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Payment Reminder state
  const [payAmount, setPayAmount] = useState('');
  const [payDueDate, setPayDueDate] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payStatus, setPayStatus] = useState('PENDING');
  const [savingPayment, setSavingPayment] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; date: string; weight?: number; notes?: string } | null>(null);

  // Helper: always find the admin account from the latest usersList (by role, since ID can change)
  const getAdminFromList = (list: any[]) => list.find((u: any) => u.role === 'ADMIN') || null;

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        const list = data.users || [];
        setUsersList(list);
        // Find real admin from list and keep currentAdminId in sync
        const admin = getAdminFromList(list);
        if (admin) {
          setCurrentAdminId(admin.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open settings modal and always pre-populate from the real admin in usersList
  const handleOpenAdminSettingsModal = () => {
    const admin = getAdminFromList(usersList);
    if (admin) {
      setAdminSelfId(admin.id);
      setAdminSelfName(admin.name);
      setAdminSelfPass(admin.password || '');
    } else {
      // Fallback to JWT user if list not loaded yet
      setAdminSelfId(user.id);
      setAdminSelfName(user.name);
      setAdminSelfPass('');
    }
    setShowAdminSettingsModal(true);
  };

  // Initial user fetch & polling every 4s for real-time user updates
  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchClientDetails = async (uid: string, showLoader = false) => {
    if (!uid) return;
    try {
      if (showLoader) setClientLoading(true);

      // 1. Fetch logs & plans
      const resLogs = await authFetch(`/api/admin/client-logs?userId=${uid}`);
      const dataLogs = await resLogs.json();
      if (resLogs.ok) {
        const client = dataLogs.client || null;
        setSelectedClientData(client);
        
        // ONLY update form input fields on explicit initial load to prevent background polling from wiping user inputs while typing
        if (client && showLoader) {
          setEditClientId(client.id);
          setEditClientName(client.name);
          setEditClientPass(client.password || '');
          setEditClientAge(client.age ? String(client.age) : '');
          setEditClientInitialWeight(client.initial_weight ? String(client.initial_weight) : '');
          setEditClientHeight(client.height ? String(client.height) : '');
          setEditClientTargetWeight(client.target_weight ? String(client.target_weight) : '');
          setEditClientGender(client.gender || 'MALE');
        }

        setClientLogs(dataLogs.logs || []);
        setClientPlan(dataLogs.plan || { diet_plan: '', workout_plan: '' });
        
        if (showLoader) {
          setDietPlanText(dataLogs.plan?.diet_plan || '');
          setWorkoutPlanText(dataLogs.plan?.workout_plan || '');
        }
      }

      // 2. Fetch Chat messages
      const resChat = await authFetch(`/api/chat?userId=${uid}`);
      const dataChat = await resChat.json();
      if (resChat.ok) {
        setChatMessages(dataChat.messages || []);
      }

      // 3. Fetch Payment Reminder
      const resPay = await authFetch(`/api/admin/payments?userId=${uid}`);
      const dataPay = await resPay.json();
      if (resPay.ok && dataPay.reminder && showLoader) {
        setPayAmount(String(dataPay.reminder.amount || ''));
        setPayDueDate(dataPay.reminder.due_date || '');
        setPayNotes(dataPay.reminder.notes || '');
        setPayStatus(dataPay.reminder.status || 'PENDING');
      }
    } catch (err) {
      console.error('Failed to fetch client details:', err);
    } finally {
      if (showLoader) setClientLoading(false);
    }
  };

  // Real-time polling for selected client photos & chat messages every 3 seconds
  useEffect(() => {
    if (!selectedUserId || viewMode !== 'detail') return;

    fetchClientDetails(selectedUserId, true);

    const interval = setInterval(() => {
      fetchClientDetails(selectedUserId, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUserId, viewMode]);

  const handleOpenClientDetail = (uid: string, tab: 'logs' | 'photos' | 'plans' | 'payments' | 'settings' = 'logs') => {
    setSelectedUserId(uid);
    setDetailTab(tab);
    setViewMode('detail');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newUserPass.trim() || !newUserName.trim()) {
      showToast('error', 'All user fields are required');
      return;
    }

    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          id: newUserId.trim(),
          password: newUserPass.trim(),
          name: newUserName.trim(),
          age: newUserAge ? parseInt(newUserAge, 10) : null,
          initial_weight: newUserInitialWeight ? parseFloat(newUserInitialWeight) : null,
          height: newUserHeight ? parseFloat(newUserHeight) : null,
          target_weight: newUserTargetWeight ? parseFloat(newUserTargetWeight) : null,
          gender: newUserGender,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      showToast('success', data.message || 'User created successfully!');
      setNewUserId('');
      setNewUserPass('');
      setNewUserName('');
      setNewUserAge('');
      setNewUserInitialWeight('');
      setNewUserHeight('');
      setNewUserTargetWeight('');
      setNewUserGender('MALE');
      setShowAddUserModal(false);
      await fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Error creating user');
    }
  };

  const handleUpdateAdminSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSelfId.trim() || !adminSelfName.trim() || !adminSelfPass.trim()) {
      showToast('error', 'Admin ID, Name, and Password are required');
      return;
    }

    // Always use the real current admin ID from the live list, not stale JWT
    const realAdmin = getAdminFromList(usersList);
    const trueCurId = realAdmin?.id || currentAdminId || user.id;

    setSavingAdminSelf(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCredentials',
          currentUserId: trueCurId,
          newUserId: adminSelfId.trim(),
          newName: adminSelfName.trim(),
          newPassword: adminSelfPass.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update admin credentials');

      const newId = data.newUserId || adminSelfId.trim();
      setCurrentAdminId(newId);

      const updatedUser = { id: newId, name: adminSelfName.trim(), role: 'ADMIN' };
      try {
        localStorage.setItem('fitpulse_user', JSON.stringify(updatedUser));
      } catch (e) {}

      showToast('success', 'Admin settings updated successfully!');
      setShowAdminSettingsModal(false);
      await fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating admin credentials');
    } finally {
      setSavingAdminSelf(false);
    }
  };

  const handleUpdateClientCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !editClientId.trim() || !editClientName.trim() || !editClientPass.trim()) {
      showToast('error', 'User ID, Name, and Password are required');
      return;
    }

    setSavingClientCreds(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCredentials',
          currentUserId: selectedUserId,
          newUserId: editClientId.trim(),
          newName: editClientName.trim(),
          newPassword: editClientPass.trim(),
          newAge: editClientAge ? parseInt(editClientAge, 10) : null,
          newInitialWeight: editClientInitialWeight ? parseFloat(editClientInitialWeight) : null,
          newHeight: editClientHeight ? parseFloat(editClientHeight) : null,
          newTargetWeight: editClientTargetWeight ? parseFloat(editClientTargetWeight) : null,
          newGender: editClientGender,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update client credentials');

      showToast('success', `Client credentials updated!`);
      const targetId = data.newUserId || editClientId.trim();
      setSelectedUserId(targetId);
      await fetchUsers();
      await fetchClientDetails(targetId, true);
    } catch (err: any) {
      showToast('error', err.message || 'Error updating client credentials');
    } finally {
      setSavingClientCreds(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!uid) return;
    if (!confirm(`Are you sure you want to delete client ID ${uid}?`)) return;

    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          userId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      showToast('success', `User ID ${uid} deleted successfully.`);
      setUsersList((prev) => prev.filter((u) => String(u.id).trim() !== String(uid).trim()));
      if (selectedUserId === uid) {
        setSelectedUserId('');
        setViewMode('grid');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error deleting user');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast('error', 'Please select a client first');
      return;
    }

    setSavingPlan(true);

    try {
      const res = await authFetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          dietPlan: dietPlanText,
          workoutPlan: workoutPlanText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save plan');

      showToast('success', `Diet & Workout plan assigned for ${selectedClientData?.name || selectedUserId}!`);
    } catch (err: any) {
      showToast('error', err.message || 'Error saving plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || !selectedUserId) return;

    setSendingMsg(true);
    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          message: newMsgText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setChatMessages((prev) => [...prev, data.message]);
      setNewMsgText('');
    } catch (err: any) {
      showToast('error', err.message || 'Error sending chat');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !payAmount || !payDueDate) {
      showToast('error', 'Amount and Due Date are required');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await authFetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          amount: parseFloat(payAmount),
          dueDate: payDueDate,
          notes: payNotes,
          status: payStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save payment reminder');

      showToast('success', 'Payment reminder saved!');
    } catch (err: any) {
      showToast('error', err.message || 'Error saving payment');
    } finally {
      setSavingPayment(false);
    }
  };

  // EXCLUDE Admin accounts from Client Cards Roster
  const clientUsersOnly = usersList.filter((u) => u.role === 'USER');

  const filteredClients = clientUsersOnly.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      String(u.id).toLowerCase().includes(q)
    );
  });

  // Extract all uploaded progress photos for the gallery
  const photosList = clientLogs.filter((log) => Boolean(log.image_url));

  const filteredLogs = clientLogs.filter((log) => {
    if (!dateFilter) return true;
    return log.log_date?.includes(dateFilter);
  });

  const totalLogsCount = clientUsersOnly.reduce((acc, u) => acc + (u.total_logs || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">{getAdminFromList(usersList)?.name || user.name || 'Coach Afroz Khan'}</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Admin Panel
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Client Management & Training Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAdminSettingsModal}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 active:scale-95"
            title="Admin Settings & Credentials"
          >
            <Settings className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Client</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 active:scale-95"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ========================================================= */}
        {/* MODE 1: CLIENT CARDS GRID VIEW                            */}
        {/* ========================================================= */}
        {viewMode === 'grid' && (
          <div className="space-y-6">
            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Total Clients</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{clientUsersOnly.length}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Activity Logs</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{totalLogsCount}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Active Roster</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{clientUsersOnly.length} Clients</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Admin ID</div>
                  <div className="text-xs font-bold text-indigo-600 mt-1 font-mono">{user.id}</div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search client by name or ID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium self-end sm:self-center">
                <span>Showing <strong className="text-slate-900">{filteredClients.length}</strong> clients</span>
              </div>
            </div>

            {/* CLIENT CARDS GRID */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-xs font-medium">Loading Client Roster...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 shadow-xs">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Clients Found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or click "Add Client" to create a user.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredClients.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleOpenClientDetail(u.id, 'photos')}
                    className="group bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-400 rounded-3xl p-5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-600" />

                    <div>
                      {/* Client Header Info */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {u.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200 font-semibold">
                                ID: {u.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats Metrics Box */}
                      {(() => {
                        const initW = u.initial_weight;
                        const currentW = u.latest_weight || u.initial_weight;
                        const initialBmi = calculateBMI(initW, u.height);
                        const initialBmr = calculateBMR(initW, u.height, u.age, u.gender);
                        const currentBmi = calculateBMI(currentW, u.height);
                        const currentBmr = calculateBMR(currentW, u.height, u.age, u.gender);
                        return (
                          <div className="space-y-2 my-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Age</span>
                                <span className="text-xs font-bold text-indigo-600 mt-0.5 block">
                                  {u.age ? `${u.age} yrs` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Height</span>
                                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                                  {u.height ? `${u.height} cm` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target Goal</span>
                                <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                                  {u.target_weight ? `${u.target_weight} kg` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Latest Weight</span>
                                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                                  {u.latest_weight ? `${u.latest_weight} kg` : (u.initial_weight ? `${u.initial_weight} kg` : 'No log')}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-indigo-50/60 p-2.5 rounded-2xl border border-indigo-100 text-center">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-indigo-700 block">BMI (Init → Curr)</span>
                                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                                  {initialBmi ? initialBmi.value : 'N/A'} → {currentBmi ? `${currentBmi.value} (${currentBmi.category})` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-indigo-700 block">BMR (Init → Curr)</span>
                                <span className="text-xs font-bold text-indigo-900 mt-0.5 block">
                                  {initialBmr ? initialBmr.value : 'N/A'} → {currentBmr ? currentBmr.text : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Footer Info Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[11px] font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {u.last_log_date ? `Logged ${u.last_log_date}` : 'No activity'}
                      </span>

                      <span className="text-indigo-600 group-hover:text-indigo-700 font-bold text-[11px] flex items-center gap-1">
                        <span>View Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2: CLIENT WORKSPACE / DETAIL VIEW                    */}
        {/* ========================================================= */}
        {viewMode === 'detail' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Back Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToGrid}
                className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all border border-slate-200 shadow-xs active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600" />
                <span>← Back to Client Cards</span>
              </button>

              <button
                onClick={() => fetchClientDetails(selectedUserId, true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 shadow-xs active:scale-95"
                title="Refresh photos and chat"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${clientLoading ? 'animate-spin' : ''}`} />
                <span>Sync Real-Time Data</span>
              </button>
            </div>

            {/* Selected Client Card Header */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-600/20 shrink-0">
                    {selectedClientData?.name ? selectedClientData.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {selectedClientData?.name || `Client ${selectedUserId}`}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Client ID: <strong className="text-slate-800">{selectedUserId}</strong> • Joined {selectedClientData?.created_at ? new Date(selectedClientData.created_at).toLocaleDateString() : 'Active'}
                    </p>
                  </div>
                </div>

                {(() => {
                  const initW = selectedClientData?.initial_weight;
                  const currentW = (clientLogs.length > 0 && clientLogs[0].weight) ? clientLogs[0].weight : selectedClientData?.initial_weight;
                  const initialBMI = calculateBMI(initW, selectedClientData?.height);
                  const initialBMR = calculateBMR(initW, selectedClientData?.height, selectedClientData?.age, selectedClientData?.gender);
                  const headerBMI = calculateBMI(currentW, selectedClientData?.height);
                  const headerBMR = calculateBMR(currentW, selectedClientData?.height, selectedClientData?.age, selectedClientData?.gender);

                  return (
                    <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Age</div>
                        <div className="text-sm font-bold text-indigo-600 mt-0.5">
                          {selectedClientData?.age ? `${selectedClientData.age} yrs` : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Height</div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {selectedClientData?.height ? `${selectedClientData.height} cm` : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Start Weight</div>
                        <div className="text-sm font-bold text-slate-700 mt-0.5">
                          {selectedClientData?.initial_weight ? `${selectedClientData.initial_weight} kg` : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Target Goal</div>
                        <div className="text-sm font-bold text-emerald-600 mt-0.5">
                          {selectedClientData?.target_weight ? `${selectedClientData.target_weight} kg` : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Current Weight</div>
                        <div className="text-sm font-bold text-indigo-600 mt-0.5">
                          {clientLogs.length > 0 && clientLogs[0].weight ? `${clientLogs[0].weight} kg` : (selectedClientData?.initial_weight ? `${selectedClientData.initial_weight} kg` : 'N/A')}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-bold text-indigo-700">Initial BMI</div>
                        <div className="text-sm font-bold text-slate-700 mt-0.5">
                          {initialBMI ? `${initialBMI.value} (${initialBMI.category})` : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-bold text-indigo-700">Current BMI</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {headerBMI ? `${headerBMI.value} (${headerBMI.category})` : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-bold text-indigo-700">Initial BMR</div>
                        <div className="text-sm font-bold text-indigo-700 mt-0.5">
                          {initialBMR ? initialBMR.text : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3 border-r border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-bold text-indigo-700">Current BMR</div>
                        <div className="text-sm font-bold text-indigo-900 mt-0.5">
                          {headerBMR ? headerBMR.text : 'N/A'}
                        </div>
                      </div>

                      <div className="text-center px-3">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Photos</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {photosList.length}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center justify-start sm:justify-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto pb-1">
                <button
                  onClick={() => setDetailTab('logs')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                    detailTab === 'logs'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>Weight Logs & Entries ({clientLogs.length})</span>
                </button>

                <button
                  onClick={() => setDetailTab('photos')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                    detailTab === 'photos'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Uploaded Progress Photos ({photosList.length})</span>
                </button>

                <button
                  onClick={() => setDetailTab('plans')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                    detailTab === 'plans'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Diet & Workout Plan</span>
                </button>

                <button
                  onClick={() => setDetailTab('payments')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                    detailTab === 'payments'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Payment Reminders</span>
                </button>

                <button
                  onClick={() => setDetailTab('settings')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                    detailTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>Account & Password</span>
                </button>
              </div>
            </div>

            {/* TAB 1: ALL CLIENT WEIGHT LOGS & ENTRIES TABLE */}
            {detailTab === 'logs' && (
              <div className="space-y-6">
                {/* Date Filter & Info Bar */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <span>Client Daily Weight Logged Entries History ({filteredLogs.length} entries)</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    {dateFilter && (
                      <button
                        onClick={() => setDateFilter('')}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Weight Logs Table */}
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 shadow-xs">
                    <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">No Weight Entries Found</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {dateFilter
                        ? `No weight logs found for date ${dateFilter}`
                        : 'This client has not logged any daily weight entries yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                            <th className="py-3.5 px-5">Entry Date</th>
                            <th className="py-3.5 px-5">Logged Weight</th>
                            <th className="py-3.5 px-5">Vs Initial Weight</th>
                            <th className="py-3.5 px-5">BMI</th>
                            <th className="py-3.5 px-5">BMR Rate</th>
                            <th className="py-3.5 px-5">Progress Photo</th>
                            <th className="py-3.5 px-5">Client Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                          {filteredLogs.map((log) => {
                            const initW = selectedClientData?.initial_weight ? parseFloat(selectedClientData.initial_weight) : null;
                            const currentW = log.weight ? parseFloat(log.weight) : null;
                            const diff = (currentW && initW) ? (currentW - initW).toFixed(1) : null;
                            const initialBMI = calculateBMI(initW, selectedClientData?.height);
                            const initialBMR = calculateBMR(initW, selectedClientData?.height, selectedClientData?.age, selectedClientData?.gender);
                            const entryBMI = calculateBMI(currentW, selectedClientData?.height);
                            const entryBMR = calculateBMR(currentW, selectedClientData?.height, selectedClientData?.age, selectedClientData?.gender);

                            return (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-5 font-bold text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span>{log.log_date}</span>
                                  </div>
                                </td>

                                <td className="py-4 px-5">
                                  {log.weight ? (
                                    <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 inline-flex items-center gap-1.5">
                                      <Scale className="w-3.5 h-3.5 text-indigo-600" />
                                      {log.weight} kg
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Not recorded</span>
                                  )}
                                </td>

                                <td className="py-4 px-5">
                                  {diff !== null ? (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      parseFloat(diff) <= 0 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                      {parseFloat(diff) > 0 ? `+${diff}` : diff} kg
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                <td className="py-4 px-5">
                                  {entryBMI ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] text-slate-400">Init: {initialBMI ? initialBMI.value : '—'}</span>
                                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${entryBMI.colorClass}`}>
                                        {entryBMI.value} ({entryBMI.category})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                <td className="py-4 px-5">
                                  {entryBMR ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] text-slate-400">Init: {initialBMR ? initialBMR.value : '—'}</span>
                                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                                        {entryBMR.text}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                <td className="py-4 px-5">
                                  {log.image_url ? (
                                    <button
                                      onClick={() =>
                                        setPreviewPhoto({
                                          url: log.image_url,
                                          date: log.log_date,
                                          weight: log.weight,
                                          notes: log.notes
                                        })
                                      }
                                      className="flex items-center gap-2 group text-indigo-600 hover:text-indigo-700 font-semibold"
                                    >
                                      <img
                                        src={log.image_url}
                                        alt="Photo"
                                        className="w-10 h-10 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform"
                                      />
                                      <span className="text-xs underline flex items-center gap-1">
                                        <Maximize2 className="w-3 h-3" /> View Photo
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">No photo attached</span>
                                  )}
                                </td>

                                <td className="py-4 px-5">
                                  {log.notes ? (
                                    <span className="italic text-slate-600">{log.notes}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DATE-WISE UPLOADED PROGRESS PHOTOS GALLERY */}
            {detailTab === 'photos' && (
              <div className="space-y-6">
                {/* Date Filter & Info Bar */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Date-Wise Uploaded Progress Photos Gallery</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    {dateFilter && (
                      <button
                        onClick={() => setDateFilter('')}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Photos Grid */}
                {clientLoading ? (
                  <div className="py-16 text-center text-slate-500">
                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold">Loading client progress photos...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 shadow-xs">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">No Date-Wise Uploaded Photos</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {dateFilter
                        ? `No logs or photos found for date ${dateFilter}`
                        : 'This client has not uploaded any progress photos or logs yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-xs"
                      >
                        <div>
                          {/* Log Date Badge */}
                          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{log.log_date}</span>
                            </div>

                            {log.weight && (
                              <div className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                                <Scale className="w-3 h-3 text-emerald-600" />
                                <span>{log.weight} kg</span>
                              </div>
                            )}
                          </div>

                          {/* Uploaded Image Preview */}
                          {log.image_url ? (
                            <div
                              onClick={() =>
                                setPreviewPhoto({
                                  url: log.image_url,
                                  date: log.log_date,
                                  weight: log.weight,
                                  notes: log.notes
                                })
                              }
                              className="relative group rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer h-60 mb-3 shadow-xs"
                            >
                              <img
                                src={log.image_url}
                                alt={`Progress photo for ${log.log_date}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs backdrop-blur-xs">
                                <Maximize2 className="w-5 h-5" />
                                <span>View Full Photo</span>
                              </div>
                              <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-white/95 text-[10px] text-slate-800 font-mono font-bold shadow-xs border border-slate-200">
                                Date: {log.log_date}
                              </span>
                            </div>
                          ) : (
                            <div className="h-28 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs mb-3">
                              Weight logged ({log.weight} kg) - No photo attached
                            </div>
                          )}

                          {/* Notes */}
                          {log.notes && (
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Client Notes:</span>
                              <p className="italic">{log.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}



            {/* TAB 3: ASSIGN DIET & WORKOUT PLAN */}
            {detailTab === 'plans' && (
              <form onSubmit={handleSavePlan} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-indigo-600" />
                    <span>Assign Training & Nutrition Plan for {selectedClientData?.name || selectedUserId}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Updates will be immediately visible on this client's dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Diet Plan Section */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-emerald-600" /> Diet & Nutrition Plan
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDietPlanText(
                            `• Breakfast: 3 Egg whites, 1 Whole egg, Oats with almond milk\n• Lunch: 150g Grilled Chicken Breast, 1 cup Brown Rice, Steamed Veggies\n• Snack: 1 Scoop Whey Protein, 10 Almonds\n• Dinner: 150g Fish / Tofu, Large Green Salad with Olive Oil`
                          )
                        }
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        + Insert Template
                      </button>
                    </label>
                    <textarea
                      rows={10}
                      value={dietPlanText}
                      onChange={(e) => setDietPlanText(e.target.value)}
                      placeholder="Enter detailed diet plan..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>

                  {/* Workout Plan Section */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Dumbbell className="w-4 h-4 text-indigo-600" /> Workout & Fitness Routine
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkoutPlanText(
                            `• Monday: Chest & Triceps (Bench Press 4x10, Incline Dumbbell Press 3x12)\n• Tuesday: Back & Biceps (Lat Pulldown 4x10, Barbell Rows 3x12)\n• Wednesday: Active Recovery / Light Cardio (30 min walk)\n• Thursday: Legs & Abs (Squats 4x10, Leg Press 3x12)\n• Friday: Shoulders & Arms (Overhead Press 4x10, Lateral Raises 4x15)`
                          )
                        }
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        + Insert Template
                      </button>
                    </label>
                    <textarea
                      rows={10}
                      value={workoutPlanText}
                      onChange={(e) => setWorkoutPlanText(e.target.value)}
                      placeholder="Enter detailed workout plan..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPlan}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingPlan ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save & Assign Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: PAYMENT REMINDERS */}
            {detailTab === 'payments' && (
              <form onSubmit={handleSavePayment} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 max-w-2xl mx-auto">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <span>Manage Payment Reminder for {selectedClientData?.name || selectedUserId}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Set fee amount, due date, and payment status.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (₹ / $)</label>
                    <input
                      type="number"
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={payDueDate}
                      onChange={(e) => setPayDueDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Status</label>
                  <select
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PENDING">PENDING (Unpaid)</option>
                    <option value="PAID">PAID (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes / Payment Description</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Monthly Personal Training Fee"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingPayment ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Payment Reminder</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: CLIENT ACCOUNT & PASSWORD SETTINGS */}
            {detailTab === 'settings' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <form onSubmit={handleUpdateClientCredentials} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Key className="w-5 h-5 text-indigo-600" />
                      <span>Edit Credentials for {selectedClientData?.name || selectedUserId}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Change this client's User ID, Name, Age, or Password.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">User ID</label>
                      <input
                        type="text"
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client Full Name</label>
                      <input
                        type="text"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Age (Years)</label>
                        <input
                          type="number"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          value={editClientAge}
                          onChange={(e) => setEditClientAge(e.target.value)}
                          placeholder="e.g. 25"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
                        <select
                          value={editClientGender}
                          onChange={(e) => setEditClientGender(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Weight (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          value={editClientInitialWeight}
                          onChange={(e) => setEditClientInitialWeight(e.target.value)}
                          placeholder="e.g. 75.0"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Height (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          value={editClientHeight}
                          onChange={(e) => setEditClientHeight(e.target.value)}
                          placeholder="e.g. 175.0"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Weight Goal (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          value={editClientTargetWeight}
                          onChange={(e) => setEditClientTargetWeight(e.target.value)}
                          placeholder="e.g. 65.0"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                      <input
                        type="text"
                        value={editClientPass}
                        onChange={(e) => setEditClientPass(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedUserId)}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Delete Account</span>
                    </button>

                    <button
                      type="submit"
                      disabled={savingClientCreds}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {savingClientCreds ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Update Credentials</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md p-4 flex items-center justify-center animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl p-2 flex flex-col items-center">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhoto.url} alt="Progress Photo Full Preview" className="max-w-full max-h-[75vh] object-contain rounded-2xl" />
            
            <div className="w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-800">
              <div>
                <span className="font-bold text-indigo-600">Uploaded Date: {previewPhoto.date}</span>
                {previewPhoto.weight && <span className="ml-3 font-semibold text-slate-700">• Weight: {previewPhoto.weight} kg</span>}
              </div>
              {previewPhoto.notes && <p className="italic text-slate-600 text-[11px]">"{previewPhoto.notes}"</p>}
            </div>
          </div>
        </div>
      )}

      {/* Add New Client Account Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Create New Client Account</h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">User ID</label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="e.g. 102 or john_doe"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Age (Years)</label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    value={newUserAge}
                    onChange={(e) => setNewUserAge(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    value={newUserHeight}
                    onChange={(e) => setNewUserHeight(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select
                    value={newUserGender}
                    onChange={(e) => setNewUserGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Starting Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    value={newUserInitialWeight}
                    onChange={(e) => setNewUserInitialWeight(e.target.value)}
                    placeholder="e.g. 75.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Weight Goal to Achieve (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    value={newUserTargetWeight}
                    onChange={(e) => setNewUserTargetWeight(e.target.value)}
                    placeholder="e.g. 65.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  type="text"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="Set initial password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'USER' | 'ADMIN')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="USER">USER (Client)</option>
                  <option value="ADMIN">ADMIN (Coach)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Self Settings Modal */}
      {showAdminSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAdminSettingsModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Admin Profile & Credentials Settings</h3>
            </div>

            <form onSubmit={handleUpdateAdminSelf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin User ID</label>
                <input
                  type="text"
                  value={adminSelfId}
                  onChange={(e) => setAdminSelfId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Display Name</label>
                <input
                  type="text"
                  value={adminSelfName}
                  onChange={(e) => setAdminSelfName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Password</label>
                <input
                  type="text"
                  value={adminSelfPass}
                  onChange={(e) => setAdminSelfPass(e.target.value)}
                  placeholder="Enter new password for Admin"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdminSelf}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  {savingAdminSelf ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Admin Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
