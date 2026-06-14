import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import env from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socketService';
import { QRCodeSVG } from 'qrcode.react'; // kept for future use
import toast from 'react-hot-toast';
import {
  Search, Printer, Download, Trash2, Edit2,
  Volume2, Monitor, Info, Check, Play, AlertTriangle,
  Clock, RefreshCw, CreditCard, DollarSign, X, Eye,
  ChevronRight, ArrowRight, Ban, Award, ListFilter
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ListTransaksi = () => {
  const { token, user } = useAuth();
  const [activeEventContext, setActiveEventContext] = useState(null);
  const [categories, setCategories] = useState([]);

  // Data lists
  const [transactions, setTransactions] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [skippedQueue, setSkippedQueue] = useState([]);

  // Owner specific state
  const [ownerEvents, setOwnerEvents] = useState([]);
  const [selectedOwnerEventId, setSelectedOwnerEventId] = useState('');

  // Table filters & Tab state
  const [activeTab, setActiveTab] = useState('MENUNGGU_PEMBAYARAN');
  const [filters, setFilters] = useState({ q: '', status: 'MENUNGGU_PEMBAYARAN', payment_method: '', category_id: '' });

  // Statistics state
  const [stats, setStats] = useState({
    waitingCount: 0,
    calledCount: 0,
    paidCount: 0,
    totalRevenue: 0
  });

  // Modals state
  const [infoModal, setInfoModal] = useState({ isOpen: false, transaction: null });
  const [checkoutModal, setCheckoutModal] = useState({ isOpen: false, transaction: null });
  const [editModal, setEditModal] = useState({ isOpen: false, transaction: null, participantName: '', phone: '', notes: '', categoryId: '', boothId: '', items: [] });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, transaction: null, reason: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, transaction: null });

  // Checkout modal form state
  const [paymentMethod, setPaymentMethod] = useState('TUNAI');
  const [amountReceived, setAmountReceived] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Fetch active event context (booths, categories, products)
  const fetchActiveEventContext = async () => {
    try {
      const res = await apiClient.get('/transactions/active-event');
      setActiveEventContext(res.data);
    } catch (err) {
      console.error('Error fetching active event context:', err);
    }
  };

  // Fetch transaction list based on current filters
  const fetchTransactions = async (eventId) => {
    if (!eventId) return;
    try {
      const queryParams = new URLSearchParams({ ...filters, event_id: eventId }).toString();
      const res = await apiClient.get(`/transactions?${queryParams}`);
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  // Fetch active queue status
  const fetchQueueStatus = async (eventId) => {
    if (!eventId) return;
    try {
      const res = await apiClient.get(`/queue/status?event_id=${eventId}`);
      setActiveCall(res.data.active);
      setWaitingQueue(res.data.waiting || []);
      setSkippedQueue(res.data.skipped || []);
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    }
  };

  // Fetch today's stats
  const fetchStats = async (eventId) => {
    if (!eventId) return;
    try {
      const localDate = new Date();
      const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      const res = await apiClient.get(`/transactions?date=${todayStr}&event_id=${eventId}`);
      const todayTxs = res.data.transactions || [];

      const waiting = todayTxs.filter(t => t.payment_status === 'MENUNGGU_PEMBAYARAN' && t.payment_queue_status === 'MENUNGGU');
      const called = todayTxs.filter(t => t.payment_status === 'MENUNGGU_PEMBAYARAN' && t.payment_queue_status === 'DIPANGGIL');
      const paid = todayTxs.filter(t => t.payment_status === 'LUNAS');
      const revenue = paid.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);

      setStats({
        waitingCount: waiting.length,
        calledCount: called.length,
        paidCount: paid.length,
        totalRevenue: revenue
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const loadAllData = (eventId) => {
    if (!eventId) return;
    fetchTransactions(eventId);
    if (user?.role !== 'OWNER') {
      fetchQueueStatus(eventId);
    }
    fetchStats(eventId);
  };

  useEffect(() => {
    if (user?.role === 'OWNER') {
      if (selectedOwnerEventId) loadAllData(selectedOwnerEventId);
    } else {
      if (activeEventContext?.event?.id) loadAllData(activeEventContext.event.id);
    }
  }, [filters.q, filters.status, filters.payment_method, filters.category_id, activeEventContext?.event?.id, selectedOwnerEventId, user?.role]);

  // Fetch categories when event changes
  useEffect(() => {
    const fetchCategoriesForEvent = async (eventId) => {
      try {
        const res = await apiClient.get(`/events/${eventId}/participant-categories`);
        setCategories(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    const currentEventId = user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id;
    if (currentEventId) {
      fetchCategoriesForEvent(currentEventId);
      // Reset selected category when event changes
      setFilters(prev => ({ ...prev, category_id: '' }));
    }
  }, [selectedOwnerEventId, activeEventContext?.event?.id, user?.role]);

  // Fetch events if user is OWNER
  useEffect(() => {
    if (user?.role === 'OWNER') {
      apiClient.get('/events').then(res => {
        const evs = res.data.events || [];
        setOwnerEvents(evs);
        if (evs.length > 0) {
          const activeEv = evs.find(e => e.is_active);
          setSelectedOwnerEventId(activeEv ? activeEv.id : evs[0].id);
        }
      }).catch(err => console.error('Error fetching events for owner:', err));
    }
  }, [user?.role]);

  useEffect(() => {
    fetchActiveEventContext();

    // Listen to Socket.IO events for reactive updates
    const socket = getSocket();
    const handleUpdate = () => {
      if (user?.role === 'OWNER') {
        if (selectedOwnerEventId) loadAllData(selectedOwnerEventId);
      } else {
        if (activeEventContext?.event?.id) loadAllData(activeEventContext.event.id);
      }
    };

    socket.on('queue_updated', handleUpdate);
    socket.on('queue:updated', handleUpdate);
    socket.on('payment-queue:updated', handleUpdate);
    socket.on('payment:verified', handleUpdate);

    return () => {
      socket.off('queue_updated', handleUpdate);
      socket.off('queue:updated', handleUpdate);
      socket.off('payment-queue:updated', handleUpdate);
      socket.off('payment:verified', handleUpdate);
    };
  }, []);

  // Queue Control functions
  const handleCallNext = async () => {
    try {
      const res = await apiClient.post('/queue/call-next');
      if (res.data.transaction) {
        // Emit visual cues or alert
      } else {
        alert(res.data.message || 'Antrean kosong');
      }
      if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
        loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memanggil antrean berikutnya');
    }
  };

  const handleRecall = async (id, code) => {
    try {
      await apiClient.post(`/queue/${id}/recall`);
      if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
        loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memanggil ulang');
    }
  };

  const handleSkip = async (id, code) => {
    try {
      await apiClient.post(`/queue/${id}/skip`);
      if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
        loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal melewati antrean');
    }
  };

  const handleTestVoice = async () => {
    try {
      await apiClient.post('/queue/test-voice');
      alert('Perintah tes suara dikirim ke TV');
    } catch (err) {
      alert('Gagal mengirim perintah tes suara');
    }
  };

  // Checkout Modal functions
  const openCheckoutModal = (t) => {
    setCheckoutModal({ isOpen: true, transaction: t });
    setPaymentMethod('TUNAI');
    setAmountReceived('');
    setCheckoutNotes(t.notes || '');
    setIsSubmittingCheckout(false);
  };

  const handleVerifyPayment = async () => {
    if (!checkoutModal.transaction) return;
    const txId = checkoutModal.transaction.id;
    const totalAmount = checkoutModal.transaction.total_amount;

    if (paymentMethod === 'TUNAI') {
      const cash = parseFloat(amountReceived) || 0;
      if (cash < totalAmount) {
        alert('Nominal uang tunai kurang dari total tagihan.');
        return;
      }
    }

    setIsSubmittingCheckout(true);
    try {
      const res = await apiClient.patch(`/transactions/${txId}/verify`, {
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'TUNAI' ? parseFloat(amountReceived) : totalAmount,
        notes: checkoutNotes
      });

      // Open print slip in new tab
      window.open(`/print-nota/${txId}`, '_blank');

      setCheckoutModal({ isOpen: false, transaction: null });
      if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
        loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
      }
      toast.success('Pembayaran berhasil diverifikasi!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memverifikasi pembayaran');
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  // Cancel & Delete handlers
  const handleCancelTransaction = async (id, reason) => {
    if (!reason || reason.trim() === '') return alert('Alasan pembatalan wajib diisi');
    try {
      const res = await apiClient.post(`/transactions/${id}/cancel`, { cancel_reason: reason });
      alert(res.data.message || 'Transaksi berhasil dibatalkan.');
      setCancelModal({ isOpen: false, transaction: null, reason: '' });
      if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
        loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal membatalkan transaksi');
    }
  };

  const handleDeleteTransaction = async (id, reason) => {
    if (!reason || reason.trim() === '') return alert('Alasan penghapusan wajib diisi');
    try {
      const res = await apiClient.delete(`/transactions/${id}`, { data: { delete_reason: reason } });
      alert(res.data.message || 'Pendaftaran berhasil dihapus.');
      setDeleteModal({ isOpen: false, transaction: null, reason: '' });
      if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
        loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menghapus pendaftaran');
    }
  };

  const openEditModal = async (t) => {
    let contextData = activeEventContext;
    if (!contextData) {
      try {
        const res = await apiClient.get('/transactions/active-event');
        contextData = res.data;
        setActiveEventContext(res.data);
      } catch (err) {
        console.error(err);
      }
    }

    const mappedItems = (t.items || []).map(i => ({ product_id: i.product_id, quantity: i.quantity }));

    setEditModal({
      isOpen: true,
      transaction: t,
      participantName: t.participant_name,
      phone: t.phone || '',
      notes: t.notes || '',
      categoryId: t.participant_category_id || '',
      boothId: t.booth_id || '',
      items: mappedItems
    });
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setFilters(prev => ({ ...prev, status: tabId }));
  };

  const handleExportPDF = async () => {
    const currentEventId = user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id;
    if (!currentEventId) {
      return alert('Event aktif tidak ditemukan. Tidak dapat melakukan export.');
    }
    try {
      const queryParams = new URLSearchParams({ ...filters, event_id: currentEventId }).toString();
      const url = `/transactions/export/pdf?${queryParams}`;

      const response = await apiClient.get(url, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export PDF', error);
      alert('Gagal mengexport PDF. Pastikan data transaksi tersedia.');
    }
  };

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  // Helper variables for checkout calculations
  const checkoutTotal = checkoutModal.transaction?.total_amount || 0;
  const numericReceived = parseFloat(amountReceived) || 0;
  const changeAmount = numericReceived - checkoutTotal;
  const isTunaiValid = paymentMethod === 'TUNAI' ? (numericReceived >= checkoutTotal) : true;

  return (
    <div className="space-y-6 pb-12">

      {/* 1. HEADER & GLOBAL ACTIONS */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Dashboard Kasir Terpadu</h1>
          <p className="text-slate-500 text-sm mt-0.5">Kelola antrean pembayaran, verifikasi transaksi, dan pantau statistik hari ini.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === 'OWNER' && (
            <select
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm text-sm max-w-[200px] truncate"
              value={selectedOwnerEventId}
              onChange={e => setSelectedOwnerEventId(e.target.value)}
            >
              {ownerEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name} {ev.is_active ? '(Aktif)' : ''}</option>)}
            </select>
          )}
          <Link
            to="/tv-antrian"
            target="_blank"
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm text-sm"
          >
            <Monitor size={16} className="text-slate-500" /> Buka TV Antrean
          </Link>
          <button
            onClick={handleTestVoice}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm text-sm"
          >
            <Volume2 size={16} className="text-indigo-500" /> Tes Suara TV
          </button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <select
              className="px-3 py-1.5 rounded-lg bg-transparent text-slate-700 font-medium outline-none text-sm border-none focus:ring-0 max-w-[150px] truncate"
              value={filters.category_id}
              onChange={e => setFilters({ ...filters, category_id: e.target.value })}
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-slate-800 transition-colors text-sm"
            >
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE CALL PANEL (Hospital Style Single Queue) */}
      {user?.role !== 'OWNER' && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Panggilan Aktif TV Antrean
              </span>

              {activeCall ? (
                <div>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h2 className="text-5xl font-black font-mono tracking-wider text-emerald-400">
                      {activeCall.payment_queue_code || activeCall.queue_code}
                    </h2>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-black truncate uppercase text-slate-100">{activeCall.participant_name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Reg: {activeCall.registration_code || activeCall.receipt_number} • Waktu: {new Date(activeCall.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-black text-slate-300">Belum Ada Nomor Dipanggil</h2>
                  <p className="text-sm text-slate-400 mt-1">Gunakan tombol di sebelah kanan untuk memanggil peserta berikutnya.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {activeCall && (
                <>
                  <button
                    onClick={() => handleRecall(activeCall.id, activeCall.payment_queue_code || activeCall.queue_code)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors text-sm flex items-center gap-2"
                    title="Panggil Ulang Suara TV"
                  >
                    <Volume2 size={16} /> Panggil Ulang
                  </button>
                  <button
                    onClick={() => handleSkip(activeCall.id, activeCall.payment_queue_code || activeCall.queue_code)}
                    className="px-4 py-3 bg-slate-800 hover:bg-red-900 hover:text-white text-slate-300 rounded-xl font-bold transition-colors text-sm flex items-center gap-2"
                  >
                    <X size={16} /> Lewati
                  </button>
                  <button
                    onClick={() => openCheckoutModal(activeCall)}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black transition-colors shadow-lg shadow-emerald-500/25 text-sm flex items-center gap-2"
                  >
                    <DollarSign size={16} /> Proses Bayar
                  </button>
                </>
              )}

              <button
                onClick={handleCallNext}
                className="px-6 py-4 rounded-2xl font-bold bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 group border border-indigo-400"
              >
                PANGGIL BERIKUTNYA
                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Skipped queue panel */}
          {skippedQueue.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-extrabold block mb-2 uppercase tracking-widest">
                Antrean Terlewat / Skipped ({skippedQueue.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {skippedQueue.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleRecall(item.id, item.payment_queue_code || item.queue_code)}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-indigo-900 hover:border-indigo-800 border border-red-900/40 rounded-xl text-red-400 hover:text-indigo-200 font-mono text-xs font-black transition-all flex items-center gap-1.5"
                  >
                    <Volume2 size={11} />
                    <span>{item.payment_queue_code || item.queue_code}</span>
                    <span className="text-[10px] text-red-500/80 font-bold max-w-[80px] truncate uppercase">({item.participant_name})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}




      {/* 4. FILTER BAR & LIST TABULATION */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">

        {/* TABS SELECTOR */}
        <div className="flex border-b border-border bg-slate-50 px-4 pt-3 gap-2">
          {['MENUNGGU_PEMBAYARAN', 'LUNAS', 'DIBATALKAN'].map((tabId) => (
            <button
              key={tabId}
              onClick={() => handleTabChange(tabId)}
              className={`px-5 py-3 font-black text-sm border-b-2 transition-all relative ${activeTab === tabId
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {tabId === 'MENUNGGU_PEMBAYARAN' && 'Menunggu Pembayaran'}
              {tabId === 'LUNAS' && 'Lunas'}
              {tabId === 'DIBATALKAN' && 'Dibatalkan'}
            </button>
          ))}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="p-4 border-b border-border bg-white flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Cari Peserta / Nomor / Kode</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-sm"
                value={filters.q}
                onChange={e => setFilters({ ...filters, q: e.target.value })}
                placeholder="Ketik nama peserta, nomor antrean, atau kode pendaftaran..."
              />
            </div>
          </div>
          <div className="w-full md:w-56">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Metode Bayar</label>
            <select
              className="w-full border border-slate-200 py-2.5 px-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-sm bg-white"
              value={filters.payment_method}
              onChange={e => setFilters({ ...filters, payment_method: e.target.value })}
            >
              <option value="">Semua Metode</option>
              <option value="TUNAI">TUNAI</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>
        </div>

        {/* TABLE LIST */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-border">
              <tr>
                <th className="px-5 py-3.5 font-black text-xs uppercase tracking-wider">Antrean & Nota</th>
                <th className="px-5 py-3.5 font-black text-xs uppercase tracking-wider">Peserta & Kategori</th>
                <th className="px-5 py-3.5 font-black text-xs uppercase tracking-wider">Tagihan & Metode</th>
                <th className="px-5 py-3.5 font-black text-xs uppercase tracking-wider">Status Antrean</th>
                <th className="px-5 py-3.5 font-black text-xs uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">

                  {/* Antrean & Nota */}
                  <td className="px-5 py-3.5">
                    <div className="font-mono font-black text-lg text-slate-900 leading-tight">
                      {t.payment_queue_code || t.queue_code || <span className="text-slate-400 italic text-xs font-bold">Tanpa Nomor</span>}
                    </div>
                    <div className="font-mono text-[10px] font-bold text-slate-400 mt-0.5 uppercase">
                      {t.payment_status === 'LUNAS' && t.receipt_number && !t.receipt_number.startsWith('D') ? t.receipt_number : (t.registration_code || t.receipt_number)}
                    </div>
                  </td>

                  {/* Peserta & Kategori */}
                  <td className="px-5 py-3.5">
                    <div className="font-black text-slate-900 text-base uppercase leading-tight">{t.participant_name}</div>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-black text-slate-500 uppercase">
                        {t.category_name || '-'}
                      </span>
                    </div>
                  </td>

                  {/* Tagihan & Metode */}
                  <td className="px-5 py-3.5">
                    <div className="font-black text-slate-900 text-base leading-tight">
                      {formatRp(t.total_amount)}
                    </div>
                    {t.payment_status === 'LUNAS' && (
                      <div className="mt-0.5">
                        <span className="text-[10px] font-extrabold text-emerald-650 flex items-center gap-0.5">
                          <Check size={11} /> {t.payment_method}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Status Antrean */}
                  <td className="px-5 py-3.5">
                    {t.payment_queue_status === 'DIPANGGIL' && (
                      <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-black uppercase flex items-center gap-1 w-fit animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" /> DIPANGGIL
                      </span>
                    )}
                    {t.payment_queue_status === 'MENUNGGU' && (
                      <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-black uppercase w-fit inline-block">
                        MENUNGGU
                      </span>
                    )}
                    {t.payment_queue_status === 'TERLEWAT' && (
                      <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-black uppercase w-fit inline-block">
                        TERLEWAT
                      </span>
                    )}
                    {t.payment_queue_status === 'SELESAI' && (
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-black uppercase w-fit inline-block">
                        SELESAI
                      </span>
                    )}
                  </td>

                  {/* Aksi */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1.5 items-center">

                      {/* Info Detail Drawer Button */}
                      <button
                        onClick={() => setInfoModal({ isOpen: true, transaction: t })}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye size={15} />
                      </button>

                      {t.payment_status === 'MENUNGGU_PEMBAYARAN' && (
                        <>
                          <button
                            onClick={() => openCheckoutModal(t)}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1 transition-colors"
                          >
                            <DollarSign size={12} /> BAYAR
                          </button>

                          <button
                            onClick={() => handleRecall(t.id, t.payment_queue_code || t.queue_code)}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
                            title="Panggil Antrean"
                          >
                            <Volume2 size={15} />
                          </button>

                          <button
                            onClick={() => handleSkip(t.id, t.payment_queue_code || t.queue_code)}
                            className="p-2 bg-red-50/10 hover:bg-red-50 text-red-650 rounded-xl transition-all"
                            title="Lewati Antrean"
                          >
                            <X size={15} />
                          </button>

                          <button
                            onClick={() => openEditModal(t)}
                            className="p-2 bg-slate-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                            title="Edit Data"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            onClick={() => setDeleteModal({ isOpen: true, transaction: t })}
                            className="p-2 bg-slate-100 text-red-650 rounded-xl hover:bg-red-50 transition-colors"
                            title="Hapus Registrasi"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}

                      {t.payment_status === 'LUNAS' && (
                        <>
                          <Link
                            to={`/print-nota/${t.id}`}
                            target="_blank"
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                            title="Cetak Nota"
                          >
                            <Printer size={15} />
                          </Link>
                          <button
                            onClick={() => setCancelModal({ isOpen: true, transaction: t, reason: '' })}
                            className="px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-black hover:bg-red-100 transition-colors"
                          >
                            BATAL
                          </button>
                        </>
                      )}

                      {t.payment_status === 'DIBATALKAN' && (
                        <div className="text-xs text-slate-400 font-bold italic py-2 pr-2">
                          Dibatalkan
                        </div>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-12 text-slate-400">
                    <ListFilter className="mx-auto mb-3 text-slate-300 h-10 w-10" />
                    <p className="font-bold">Tidak ada transaksi ditemukan</p>
                    <p className="text-xs mt-1 text-slate-400">Ubah filter pencarian atau tab status di atas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ================= MODAL 1: DETAIL DETAIL DRAWERS ================= */}
      {infoModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                <Info className="text-indigo-600" size={18} /> Rincian Informasi
              </h2>
              <button
                onClick={() => setInfoModal({ isOpen: false, transaction: null })}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {infoModal.transaction && (
              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Antrean & Nota:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {infoModal.transaction.payment_queue_code || infoModal.transaction.queue_code} / {infoModal.transaction.receipt_number}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Kode Registrasi:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {infoModal.transaction.registration_code || '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Peserta:</span>
                  <span className="font-black text-slate-900 uppercase text-sm">{infoModal.transaction.participant_name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Kategori:</span>
                  <span className="font-bold text-slate-900">{infoModal.transaction.category_name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">No. HP / WA:</span>
                  <span className="font-bold text-slate-900">{infoModal.transaction.phone || '-'}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Tanggal Daftar:</span>
                  <span className="font-bold text-slate-900">{new Date(infoModal.transaction.created_at).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Status Bayar:</span>
                  <span className="font-bold text-slate-900">
                    {infoModal.transaction.payment_status} ({infoModal.transaction.payment_method === 'BELUM' ? 'BELUM PILIH' : infoModal.transaction.payment_method})
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Tanggal Lunas:</span>
                  <span className="font-bold text-slate-900">
                    {infoModal.transaction.verified_at ? new Date(infoModal.transaction.verified_at).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Penerima & Kasir:</span>
                  <span className="font-bold text-slate-900">
                    {infoModal.transaction.created_by_name || '-'} / {infoModal.transaction.verified_by_name || '-'}
                  </span>
                </div>
                {infoModal.transaction.cancel_reason && (
                  <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 text-red-800">
                    <span className="font-black block uppercase text-[10px] tracking-wider mb-0.5">Alasan Pembatalan:</span>
                    <p className="font-medium italic">{infoModal.transaction.cancel_reason}</p>
                  </div>
                )}
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Catatan:</span>
                  <span className="font-bold text-slate-950 italic">{infoModal.transaction.notes || '-'}</span>
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 font-black block mb-1.5 uppercase tracking-wider">Rincian Layanan / Produk:</span>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-32 overflow-y-auto space-y-1">
                    {infoModal.transaction.items?.map(i => (
                      <div key={i.id} className="flex justify-between font-medium">
                        <span>{i.quantity}x {i.product_name || i.product_name_snapshot}</span>
                        <span className="font-bold text-slate-800">{formatRp(i.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {infoModal.transaction.payment_status === 'LUNAS' && infoModal.transaction.payment_queue_code && (
                  <div className="pt-3 border-t mt-4 space-y-2">
                    <p className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Link Status Antrean Peserta:</p>
                    <div className="bg-slate-50 p-2.5 rounded-lg border font-mono text-[10px] break-all select-all text-slate-650">
                      {`${env.publicAppUrl}/status/${infoModal.transaction.payment_queue_code || infoModal.transaction.queue_code}`}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${env.publicAppUrl}/status/${infoModal.transaction.payment_queue_code || infoModal.transaction.queue_code}`);
                          alert('Link status disalin ke clipboard!');
                        }}
                        className="py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-bold text-[10px] text-center"
                      >
                        Salin Link
                      </button>
                      <button
                        onClick={() => window.open(`${env.publicAppUrl}/status/${infoModal.transaction.payment_queue_code || infoModal.transaction.queue_code}`, '_blank')}
                        className="py-2.5 bg-indigo-650 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-[10px] text-center"
                      >
                        Buka Halaman Status
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setInfoModal({ isOpen: false, transaction: null })}
              className="mt-5 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-colors text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ON-PAGE CHECKOUT MODAL ================= */}
      {checkoutModal.isOpen && checkoutModal.transaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800">Verifikasi & Proses Pembayaran</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Peserta: <strong className="text-slate-800 uppercase">{checkoutModal.transaction.participant_name}</strong> ({checkoutModal.transaction.payment_queue_code || checkoutModal.transaction.queue_code})
                </p>
              </div>
              <button
                onClick={() => setCheckoutModal({ isOpen: false, transaction: null })}
                className="p-1.5 hover:bg-slate-150 rounded-full text-slate-500"
                disabled={isSubmittingCheckout}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-5">

              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setPaymentMethod('TUNAI')}
                  className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'TUNAI'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                  disabled={isSubmittingCheckout}
                >
                  <DollarSign size={18} /> TUNAI / CASH
                </button>
                <button
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'QRIS'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                  disabled={isSubmittingCheckout}
                >
                  <CreditCard size={18} /> QRIS DIGITAL
                </button>
              </div>

              {/* Tagihan Summary Card */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-slate-500 text-sm font-black uppercase tracking-wider">Total Tagihan:</span>
                <span className="text-2xl font-black text-indigo-750 font-mono">{formatRp(checkoutTotal)}</span>
              </div>

              {/* Form Input based on Method */}
              {paymentMethod === 'TUNAI' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Jumlah Uang Tunai Diterima *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-400 font-bold text-lg">Rp</span>
                      <input
                        required
                        autoFocus
                        type="number"
                        placeholder="0"
                        className="w-full border-2 border-slate-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-indigo-600 font-black text-xl font-mono text-slate-900"
                        value={amountReceived}
                        onChange={e => setAmountReceived(e.target.value)}
                        disabled={isSubmittingCheckout}
                      />
                    </div>
                  </div>

                  {/* Cash Quick Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAmountReceived(String(checkoutTotal))}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition-colors"
                      disabled={isSubmittingCheckout}
                    >
                      Uang Pas
                    </button>
                    {checkoutTotal <= 50000 && (
                      <button
                        type="button"
                        onClick={() => setAmountReceived('50000')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition-colors"
                        disabled={isSubmittingCheckout}
                      >
                        Rp 50.000
                      </button>
                    )}
                    {checkoutTotal <= 100000 && (
                      <button
                        type="button"
                        onClick={() => setAmountReceived('100000')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition-colors"
                        disabled={isSubmittingCheckout}
                      >
                        Rp 100.000
                      </button>
                    )}
                    {checkoutTotal <= 200000 && (
                      <button
                        type="button"
                        onClick={() => setAmountReceived('200000')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition-colors"
                        disabled={isSubmittingCheckout}
                      >
                        Rp 200.000
                      </button>
                    )}
                  </div>

                  {/* Kembalian calculator result */}
                  <div className={`p-4 rounded-2xl border flex justify-between items-center ${changeAmount >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50/70 border-red-200 text-red-800'
                    }`}>
                    <span className="font-extrabold text-sm uppercase tracking-wider">
                      {changeAmount >= 0 ? 'Uang Kembalian:' : 'Uang Kurang:'}
                    </span>
                    <span className="text-xl font-black font-mono">
                      {changeAmount >= 0 ? formatRp(changeAmount) : formatRp(Math.abs(changeAmount))}
                    </span>
                  </div>
                </div>
              ) : (
                // QRIS — Manual Verification
                <div className="space-y-3">
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                      <CreditCard size={32} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-indigo-900 uppercase tracking-wide">Pembayaran QRIS</p>
                      <p className="text-3xl font-black text-indigo-700 font-mono mt-1">{formatRp(checkoutTotal)}</p>
                    </div>
                    <div className="w-full bg-white border border-indigo-200 rounded-xl p-3">
                      <p className="text-xs text-indigo-600 font-bold">
                        Verifikasi penerimaan pembayaran QRIS secara langsung di luar sistem (mesin EDC / notifikasi HP), lalu klik <strong>Tandai Lunas</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan Field */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Catatan Transaksi (Opsional)</label>
                <input
                  type="text"
                  placeholder="Ketik catatan tambahan untuk struk / photobooth..."
                  className="w-full border-2 border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-indigo-600 font-medium text-sm"
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  disabled={isSubmittingCheckout}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t pt-4 mt-4 flex gap-3 shrink-0">
              <button
                onClick={() => setCheckoutModal({ isOpen: false, transaction: null })}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors flex-1"
                disabled={isSubmittingCheckout}
              >
                Batal
              </button>
              <button
                onClick={handleVerifyPayment}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-sm transition-colors flex-[2] flex items-center justify-center gap-2"
                disabled={!isTunaiValid || isSubmittingCheckout || (paymentMethod === 'TUNAI' && !amountReceived)}
              >
                {isSubmittingCheckout ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{paymentMethod === 'QRIS' ? 'Tandai Lunas (QRIS)' : 'Konfirmasi Pembayaran'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT MODAL ================= */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black mb-6 text-slate-800 border-b pb-3">Edit Data Peserta</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">Nama Peserta *</label>
                <input
                  required
                  type="text"
                  className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-600 uppercase font-bold text-lg"
                  value={editModal.participantName}
                  onChange={e => setEditModal({ ...editModal, participantName: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">No HP</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-600 font-bold text-lg"
                  value={editModal.phone}
                  onChange={e => setEditModal({ ...editModal, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">Kategori *</label>
                <select
                  className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-600 font-bold text-lg"
                  value={editModal.categoryId}
                  onChange={e => setEditModal({ ...editModal, categoryId: e.target.value })}
                >
                  {activeEventContext?.participant_categories?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">Booth</label>
                <select
                  className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-600 font-bold text-lg"
                  value={editModal.boothId}
                  onChange={e => setEditModal({ ...editModal, boothId: e.target.value })}
                >
                  <option value="">Otomatis</option>
                  {activeEventContext?.booths?.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold mb-2 text-slate-700">Catatan</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-600 font-bold text-lg"
                  value={editModal.notes}
                  onChange={e => setEditModal({ ...editModal, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Selected Products */}
            <div className="border-t pt-4 mb-6">
              <h3 className="font-black text-lg text-slate-800 mb-3">Layanan / Produk yang Dipilih:</h3>
              <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                {editModal.items.map((item, idx) => {
                  const prod = activeEventContext?.products?.find(p => p.id === item.product_id);
                  return (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                      <span className="font-bold text-slate-700">{prod?.name || 'Produk'}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...editModal.items];
                            if (newItems[idx].quantity > 1) {
                              newItems[idx].quantity--;
                              setEditModal({ ...editModal, items: newItems });
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold hover:bg-slate-300 text-lg"
                        >
                          -
                        </button>
                        <span className="font-black text-lg w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...editModal.items];
                            newItems[idx].quantity++;
                            setEditModal({ ...editModal, items: newItems });
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold hover:bg-slate-300 text-lg"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = editModal.items.filter((_, i) => i !== idx);
                            setEditModal({ ...editModal, items: newItems });
                          }}
                          className="ml-2 text-red-600 font-extrabold hover:bg-red-50 px-3 py-1 rounded-lg"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Product Dropdown */}
              <div className="flex gap-2">
                <select
                  id="add-product-select"
                  className="flex-1 border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-600 font-black text-base"
                >
                  <option value="">-- Tambah Produk --</option>
                  {activeEventContext?.products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - Rp {p.price.toLocaleString('id-ID')}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const select = document.getElementById('add-product-select');
                    const val = select.value;
                    if (val) {
                      const exists = editModal.items.find(i => i.product_id === val);
                      if (exists) {
                        const newItems = editModal.items.map(i => i.product_id === val ? { ...i, quantity: i.quantity + 1 } : i);
                        setEditModal({ ...editModal, items: newItems });
                      } else {
                        setEditModal({ ...editModal, items: [...editModal.items, { product_id: val, quantity: 1 }] });
                      }
                      select.value = "";
                    }
                  }}
                  className="bg-blue-600 text-white font-extrabold px-6 rounded-xl hover:bg-blue-700 text-base"
                >
                  Tambah
                </button>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, transaction: null, participantName: '', phone: '', notes: '', categoryId: '', boothId: '', items: [] })}
                className="px-6 py-3.5 bg-slate-100 text-slate-700 font-extrabold rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editModal.participantName) return alert('Nama wajib diisi');
                  if (editModal.items.length === 0) return alert('Pilih minimal 1 produk');
                  try {
                    await apiClient.put(`/transactions/${editModal.transaction.id}`, {
                      participant_name: editModal.participantName,
                      phone: editModal.phone,
                      notes: editModal.notes,
                      participant_category_id: editModal.categoryId,
                      booth_id: editModal.boothId,
                      items: editModal.items
                    });
                    alert('Data transaksi berhasil diperbarui');
                    setEditModal({ isOpen: false, transaction: null, participantName: '', phone: '', notes: '', categoryId: '', boothId: '', items: [] });
                    if (user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext?.event?.id) {
                      loadAllData(user?.role === 'OWNER' ? selectedOwnerEventId : activeEventContext.event.id);
                    }
                  } catch (err) {
                    alert(err.response?.data?.message || 'Gagal mengupdate transaksi');
                  }
                }}
                className="px-8 py-3.5 bg-green-400 text-white font-extrabold rounded-xl hover:bg-emerald-700"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: DELETE MODAL ================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border">
            <h2 className="text-xl font-bold text-red-650 mb-2">Hapus Pendaftaran</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Apakah Anda yakin ingin menghapus pendaftaran atas nama <strong>{deleteModal.transaction?.participant_name}</strong> dengan antrean <strong>{deleteModal.transaction?.payment_queue_code || deleteModal.transaction?.queue_code}</strong>? Data ini akan dihapus dari antrean aktif.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Alasan Penghapusan *</label>
              <textarea
                required
                rows="3"
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:border-red-500 font-medium text-sm"
                value={deleteModal.reason || ''}
                onChange={e => setDeleteModal({ ...deleteModal, reason: e.target.value })}
                placeholder="Tulis alasan penghapusan (wajib)..."
              />
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setDeleteModal({ isOpen: false, transaction: null, reason: '' })}
                className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTransaction(deleteModal.transaction.id, deleteModal.reason)}
                disabled={!deleteModal.reason || deleteModal.reason.trim() === ''}
                className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold disabled:bg-slate-300"
              >
                Ya, Hapus Pendaftaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: CANCEL MODAL ================= */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border">
            <h2 className="text-xl font-bold text-red-655 mb-2">Batalkan Transaksi (Lunas)</h2>
            <p className="text-slate-655 mb-4 text-xs">
              Transaksi atas nama <strong>{cancelModal.transaction?.participant_name}</strong> ({cancelModal.transaction?.receipt_number}) telah lunas. Transaksi ini tidak dapat dihapus permanen, melainkan akan diubah statusnya menjadi <strong>DIBATALKAN</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Alasan Pembatalan *</label>
              <textarea
                required
                rows="3"
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:border-red-500 font-medium text-sm"
                value={cancelModal.reason}
                onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
                placeholder="Tulis alasan pembatalan (wajib)..."
              />
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setCancelModal({ isOpen: false, transaction: null, reason: '' })}
                className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => handleCancelTransaction(cancelModal.transaction.id, cancelModal.reason)}
                disabled={!cancelModal.reason || cancelModal.reason.trim() === ''}
                className="px-5 py-2 bg-red-650 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-colors"
              >
                Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ListTransaksi;
