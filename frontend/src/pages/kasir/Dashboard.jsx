import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Users, CreditCard, QrCode, Clock, Camera, Package, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';

const KasirDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/reports/dashboard-kasir');
        setData(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-10">Loading...</div>;
  if (!data.event) return <div className="p-10 bg-card rounded-2xl">Belum ada event aktif.</div>;

  const { stats } = data;
  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Kasir</h1>
          <p className="text-slate-300">Event Aktif: <span className="font-bold text-white">{data.event.name}</span></p>
        </div>
        <a href="/tv-antrian" target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-2">
          <Monitor size={20}/> Buka Tampilan TV Antrian
        </a>
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
            <p className="text-sm text-textSecondary font-medium">Tunai (Lunas)</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{formatRp(stats.total_tunai)}</h3>
          </div>
          <div className="bg-success/10 p-3 rounded-full text-success"><CreditCard size={24}/></div>
        </div>

        <div className="bg-card rounded-2xl p-6 border-l-4 border-blue-500 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-textSecondary font-medium">QRIS (Lunas)</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{formatRp(stats.total_qris)}</h3>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-full text-blue-500"><QrCode size={24}/></div>
        </div>

        <div className="bg-card rounded-2xl p-6 border-l-4 border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-textSecondary font-medium">Total Transaksi</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{stats.total_transaksi}</h3>
          </div>
          <div className="bg-slate-100 p-3 rounded-full text-slate-700"><Users size={24}/></div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link to="/kasir/transactions" className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 hover:border-warning hover:shadow-md transition-all group cursor-pointer">
          <div className="bg-warning/10 text-warning p-4 rounded-full group-hover:scale-110 transition-transform"><Clock size={28}/></div>
          <div>
            <h4 className="text-3xl font-black text-textMain">{stats.menunggu_pembayaran}</h4>
            <p className="text-sm font-medium text-textSecondary">Menunggu Pembayaran</p>
          </div>
        </Link>

        <Link to="/kasir/transactions" className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 hover:border-primary hover:shadow-md transition-all group cursor-pointer">
          <div className="bg-primary/10 text-primary p-4 rounded-full group-hover:scale-110 transition-transform"><Camera size={28}/></div>
          <div>
            <h4 className="text-3xl font-black text-textMain">{stats.menunggu_foto}</h4>
            <p className="text-sm font-medium text-textSecondary">Menunggu Foto</p>
          </div>
        </Link>

        <Link to="/kasir/pickup" className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 hover:border-success hover:shadow-md transition-all group cursor-pointer">
          <div className="bg-success/10 text-success p-4 rounded-full group-hover:scale-110 transition-transform"><Package size={28}/></div>
          <div>
            <h4 className="text-3xl font-black text-textMain">{stats.menunggu_cetak}</h4>
            <p className="text-sm font-medium text-textSecondary">Menunggu Proses Cetak</p>
          </div>
        </Link>

      </div>
    </div>
  );
};
export default KasirDashboard;
