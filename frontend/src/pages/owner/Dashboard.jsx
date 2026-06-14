import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Users, CreditCard, CheckCircle, Clock, FileDown, Monitor } from 'lucide-react';

const OwnerDashboard = () => {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await apiClient.get('/events');
        const evList = res.data.events || [];
        setEvents(evList);
        
        if (evList.length > 0) {
          const activeEv = evList.find(e => e.is_active);
          if (activeEv) {
            setSelectedEventId(activeEv.id);
          } else {
            setSelectedEventId(evList[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch events');
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    let isMounted = true;
    const fetchData = async () => {
      setData(null); // Kosongkan data lama saat loading event baru
      try {
        const res = await apiClient.get(`/reports/dashboard-owner?event_id=${selectedEventId}`);
        if (isMounted) setData(res.data);
      } catch (error) {
        console.error(error);
        if (isMounted && error.response?.status === 400) {
          alert('Event harus dipilih.');
        }
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await apiClient.get(`/events/${selectedEventId}/participant-categories`);
        if (isMounted) {
          setCategories(res.data || []);
          setSelectedCategoryId(''); // Reset category when event changes
        }
      } catch (err) {
        console.error('Failed to fetch categories');
      }
    };

    fetchData();
    fetchCategories();

    return () => { isMounted = false; };
  }, [selectedEventId]);

  const handleExport = async () => {
    if (isExporting) return;
    if (!selectedEventId) return alert('Silakan pilih event terlebih dahulu.');
    try {
      setIsExporting(true);
      const url = `/reports/transactions-export?event_id=${selectedEventId}${selectedCategoryId ? `&category_id=${selectedCategoryId}` : ''}`;

      const response = await apiClient.get(url, {
        responseType: 'blob',
        timeout: 60000, // 60 detik untuk export PDF
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const eventName = events.find(e => e.id === selectedEventId)?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'Event';
      link.download = `Laporan_Transaksi_${eventName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export PDF');
      alert('Gagal mengexport PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (!data) return <div className="p-10 text-center font-medium">Memuat Laporan Event...</div>;

  const { stats } = data;
  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Owner</h1>
          <p className="text-slate-300">Statistik Keseluruhan</p>
        </div>
        <div className="flex flex-wrap justify-end gap-4 mt-4 md:mt-0">
          <select 
            className="px-4 py-2 rounded-xl bg-slate-800 text-white border border-slate-700 max-w-[200px] truncate"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} {ev.is_active ? '(Aktif)' : ''}</option>)}
          </select>
          <a 
            href="/tv-antrian" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors font-medium border border-slate-700"
          >
            <Monitor size={20} /> Buka TV Antrian
          </a>
          <div className="flex gap-2 items-center bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
            <select
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white border border-slate-600 outline-none focus:border-primary text-sm"
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition-colors font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileDown size={18} /> {isExporting ? 'Mengexport...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-2xl p-6 border-l-4 border-primary shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-textSecondary font-medium">Total Pendapatan</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{formatRp(stats.total_pendapatan)}</h3>
          </div>
          <div className="bg-primary/10 p-3 rounded-full text-primary"><CreditCard size={24}/></div>
        </div>

        <div className="bg-card rounded-2xl p-6 border-l-4 border-success shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-textSecondary font-medium">Total Transaksi Lunas</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{stats.total_lunas}</h3>
          </div>
          <div className="bg-success/10 p-3 rounded-full text-success"><CheckCircle size={24}/></div>
        </div>

        <div className="bg-card rounded-2xl p-6 border-l-4 border-warning shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-textSecondary font-medium">Total Belum Lunas</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{stats.total_belum_lunas}</h3>
          </div>
          <div className="bg-warning/10 p-3 rounded-full text-warning"><Clock size={24}/></div>
        </div>

        <div className="bg-card rounded-2xl p-6 border-l-4 border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-textSecondary font-medium">Total Transaksi</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{stats.total_transaksi}</h3>
          </div>
          <div className="bg-slate-100 p-3 rounded-full text-slate-700"><Users size={24}/></div>
        </div>
      </div>
    </div>
  );
};
export default OwnerDashboard;
