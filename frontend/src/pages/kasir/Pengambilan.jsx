import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import env from '../../config/env';
import { Search, Package, Check, Clock, Share2 } from 'lucide-react';

const Pengambilan = () => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if(!q) return fetchAll();
    try {
      const res = await apiClient.get(`/transactions?q=${q}`);
      setResults(res.data.transactions.filter(t => t.payment_status === 'LUNAS'));
    } catch(err) {}
  };

  const fetchAll = async () => {
    try {
      const res = await apiClient.get('/transactions');
      setResults(res.data.transactions.filter(t => t.payment_status === 'LUNAS'));
    } catch(err) {}
  };

  const updateStatus = async (id, status) => {
    if(!window.confirm(`Ubah status pesanan menjadi ${status}?`)) return;
    try {
      await apiClient.patch(`/orders/${id}/status`, { status });
      alert('Berhasil diperbarui');
      if(q) {
        const res = await apiClient.get(`/transactions?q=${q}`);
        setResults(res.data.transactions.filter(t => t.payment_status === 'LUNAS'));
      } else fetchAll();
    } catch(err) { alert('Gagal update status'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-textMain">Pengambilan Pesanan</h1>

      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-2.5 text-textSecondary" size={20}/>
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-lg"
            placeholder="Cari nama / nomor nota..."
            value={q} onChange={e => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="bg-primary text-white px-6 rounded-lg font-bold hover:bg-blue-700 transition-colors">Cari</button>
        <button type="button" onClick={fetchAll} className="bg-slate-100 text-slate-700 border px-6 rounded-lg font-bold hover:bg-slate-200 transition-colors">Tampilkan Semua Lunas</button>
      </form>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold text-textMain">Nota & Peserta</th>
              <th className="px-6 py-4 font-semibold text-textMain">Status Foto</th>
              <th className="px-6 py-4 font-semibold text-textMain">Status Pesanan</th>
              <th className="px-6 py-4 font-semibold text-textMain">Produk</th>
              <th className="px-6 py-4 font-semibold text-textMain text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-lg text-textMain mb-1">{t.receipt_number}</div>
                  <div className="font-medium text-slate-600">{t.participant_name}</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600">{t.queue_status}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit
                    ${(t.order_status === 'PROSES' || t.order_status === 'MENUNGGU_PROSES_CETAK') ? 'bg-slate-100 text-slate-600' : ''}
                    ${t.order_status === 'SIAP' ? 'bg-warning/10 text-warning' : ''}
                    ${t.order_status === 'DIAMBIL' ? 'bg-success/10 text-success' : ''}
                  `}>
                    {(t.order_status === 'PROSES' || t.order_status === 'MENUNGGU_PROSES_CETAK') && <Clock size={14}/>}
                    {t.order_status === 'SIAP' && <Package size={14}/>}
                    {t.order_status === 'DIAMBIL' && <Check size={14}/>}
                    {(t.order_status === 'PROSES' || t.order_status === 'MENUNGGU_PROSES_CETAK') ? 'MENUNGGU CETAK' : (t.order_status === 'SIAP' ? 'SIAP DIAMBIL' : 'SUDAH DIAMBIL')}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {t.items?.map(i => <div key={i.id}>- {i.quantity}x {i.product_name || i.product_name_snapshot}</div>)}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {t.queue_code && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${env.publicAppUrl}/status/${t.queue_code}`);
                        alert('Link status antrian disalin ke clipboard!');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Share2 size={13} /> Salin Link Status
                    </button>
                  )}
                  {(t.order_status === 'PROSES' || t.order_status === 'MENUNGGU_PROSES_CETAK') && (
                    <button onClick={() => updateStatus(t.id, 'SIAP')} className="px-4 py-2 bg-warning/10 text-warning font-bold text-xs rounded-lg hover:bg-warning/20">Set Siap Diambil</button>
                  )}
                  {t.order_status === 'SIAP' && (
                    <button onClick={() => updateStatus(t.id, 'DIAMBIL')} className="px-4 py-2 bg-success text-white font-bold text-xs rounded-lg hover:bg-green-700 shadow-sm">Pesanan Diambil</button>
                  )}
                </td>
              </tr>
            ))}
            {results.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-500">Silakan lakukan pencarian</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Pengambilan;
