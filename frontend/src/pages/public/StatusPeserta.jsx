import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { getSocket } from '../../services/socketService';
import { Camera, CheckCircle, Package, ArrowLeft } from 'lucide-react';

const StatusPeserta = () => {
  const { queueCode } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get(`/queue/public/status/${queueCode}`);
      setData(res.data);
      setError(false);
    } catch(err) { setError(true); }
  };

  useEffect(() => {
    fetchStatus();
    const socket = getSocket();
    socket.on('queue_updated', fetchStatus);
    return () => {
      socket.off('queue_updated', fetchStatus);
    };
  }, [queueCode]);

  if(error) return <div className="text-center p-10 font-bold text-danger">Data tidak ditemukan atau belum lunas pembayaran.</div>;
  if(!data) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-textMain">
      <div className="max-w-md mx-auto">
        
        <div className="mb-6 flex items-center justify-between">
          <Link to="/cek-antrian" className="p-2 bg-white rounded-full shadow-sm"><ArrowLeft size={20}/></Link>
          <h1 className="font-bold text-lg">{data.event_name}</h1>
          <div className="w-10"></div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden mb-6">
          <div className="bg-primary p-6 text-center text-white">
            <p className="text-primary-100 mb-1 font-medium text-sm">Nomor Antrian Anda</p>
            <h2 className="text-5xl font-black tracking-wider mb-2">{data.receipt_number}</h2>
            <p className="font-bold text-xl">{data.participant_name}</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex justify-between border-b pb-3">
              <span className="text-textSecondary">Kategori</span>
              <span className="font-bold">{data.category_name}</span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span className="text-textSecondary">Booth</span>
              <span className="font-bold">{data.booth_name}</span>
            </div>
            
            <div className="pt-2">
              <p className="text-center text-sm text-textSecondary mb-2">Saat ini sedang dipanggil di booth Anda:</p>
              <div className="bg-slate-100 py-3 rounded-xl text-center font-black text-3xl text-slate-700">
                {data.currently_called}
              </div>
            </div>
          </div>
        </div>

        <h3 className="font-bold text-lg mb-4 px-2">Tracking Status</h3>
        
        <div className="bg-white rounded-3xl shadow-sm border border-border p-6 relative">
          <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-slate-200"></div>
          
          <div className="space-y-8 relative">
            <div className="flex gap-4 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${data.queue_status !== 'BELUM' ? 'bg-primary text-white ring-4 ring-white' : 'bg-slate-200 text-slate-500'}`}>
                <Camera size={16}/>
              </div>
              <div className="pt-1">
                <h4 className={`font-bold ${data.queue_status !== 'BELUM' ? 'text-primary' : 'text-slate-400'}`}>Status Antrian</h4>
                <p className="text-sm font-medium mt-1 uppercase">{data.queue_status}</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${(data.queue_status === 'SELESAI' || data.queue_status === 'SELESAI_FOTO') ? 'bg-primary text-white ring-4 ring-white' : 'bg-slate-200 text-slate-500'}`}>
                <CheckCircle size={16}/>
              </div>
              <div className="pt-1">
                <h4 className={`font-bold ${(data.queue_status === 'SELESAI' || data.queue_status === 'SELESAI_FOTO') ? 'text-primary' : 'text-slate-400'}`}>Status Foto</h4>
                <p className="text-sm font-medium mt-1">{(data.queue_status === 'SELESAI' || data.queue_status === 'SELESAI_FOTO') ? 'SELESAI FOTO' : 'MENUNGGU FOTO'}</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${data.order_status === 'SIAP' || data.order_status === 'DIAMBIL' ? 'bg-success text-white ring-4 ring-white' : 'bg-slate-200 text-slate-500'}`}>
                <Package size={16}/>
              </div>
              <div className="pt-1">
                <h4 className={`font-bold ${data.order_status === 'SIAP' || data.order_status === 'DIAMBIL' ? 'text-success' : 'text-slate-400'}`}>Pengambilan Pesanan</h4>
                <p className="text-sm font-medium mt-1">
                  {(data.order_status === 'PROSES' || data.order_status === 'MENUNGGU_PROSES_CETAK') && 'MENUNGGU PROSES CETAK'}
                  {data.order_status === 'SIAP' && 'SIAP DIAMBIL'}
                  {data.order_status === 'DIAMBIL' && 'SUDAH DIAMBIL'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default StatusPeserta;
