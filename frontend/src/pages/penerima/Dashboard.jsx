import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Users, Clock, Camera, PlusCircle, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';

const PenerimaDashboard = () => {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/reports/dashboard-penerima');
        setData(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-10">Loading...</div>;
  if (!data.event) return <div className="p-10 bg-card rounded-2xl">Belum ada event aktif. Hubungi Kasir.</div>;

  const { stats } = data;

  return (
    <div className="space-y-8">
      <div className="bg-primary rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Halo, {user?.name}!</h1>
          <p className="text-blue-100">Event Aktif: <span className="font-bold text-white">{data.event.name}</span></p>
        </div>
        <div className="flex gap-4">
          <Link to="/penerima/daftar" className="bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <PlusCircle size={20}/> Pendaftaran Baru
          </Link>
          <a href="/tv-antrian" target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2">
            <Monitor size={20}/> Buka Tampilan TV Antrian
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col items-center text-center">
          <div className="bg-slate-100 p-4 rounded-full text-slate-700 mb-4"><Users size={32}/></div>
          <h4 className="text-4xl font-black text-textMain">{stats.pendaftar_hari_ini}</h4>
          <p className="font-medium text-textSecondary mt-2">Pendaftar Hari Ini</p>
        </div>

        <Link to="/penerima/list" className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col items-center text-center hover:border-warning hover:shadow-md transition-all cursor-pointer">
          <div className="bg-warning/10 text-warning p-4 rounded-full mb-4"><Clock size={32}/></div>
          <h4 className="text-4xl font-black text-textMain">{stats.menunggu_pembayaran}</h4>
          <p className="font-medium text-textSecondary mt-2">Menunggu Pembayaran</p>
        </Link>

        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary p-4 rounded-full mb-4"><Camera size={32}/></div>
          <h4 className="text-4xl font-black text-textMain">{stats.menunggu_foto}</h4>
          <p className="font-medium text-textSecondary mt-2">Peserta Menunggu Foto</p>
        </div>

      </div>
    </div>
  );
};
export default PenerimaDashboard;
