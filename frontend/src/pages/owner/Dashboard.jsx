import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Users, CreditCard, CheckCircle, Clock, FileDown, Monitor } from 'lucide-react';

const OwnerDashboard = () => {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await apiClient.get('/events');
        setEvents(res.data.events);
      } catch (error) {
        console.error('Failed to fetch events');
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = selectedEventId 
          ? `/reports/dashboard-owner?event_id=${selectedEventId}`
          : '/reports/dashboard-owner';
        const res = await apiClient.get(url);
        setData(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [selectedEventId]);

  const handleExport = async () => {
    try {
      let url = '/reports/transactions-export';
      if (selectedEventId) url += `?event_id=${selectedEventId}`;

      const response = await apiClient.get(url, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Laporan_Owner_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export PDF');
      alert('Gagal mengexport PDF');
    }
  };

  if (!data) return <div className="p-10">Loading...</div>;

  const { stats } = data;
  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Owner</h1>
          <p className="text-slate-300">Statistik Keseluruhan</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="px-4 py-2 rounded-xl bg-slate-800 text-white border border-slate-700"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            <option value="">Semua Event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <a 
            href="/tv-antrian" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors font-medium border border-slate-700"
          >
            <Monitor size={20} /> Buka TV Antrian
          </a>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
          >
            <FileDown size={20} /> Export PDF
          </button>
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
