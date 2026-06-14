import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Plus, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const KelolaEvent = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', code: '', location: '', start_date: '', end_date: '', total_days: 1,
    receipt_format: '[HARI]-[KATEGORI]-[BOOTH]-[NOMOR]',
    tv_title: 'PHOTOBOOTH EVENT',
    tv_subtitle: 'Silakan menuju booth sesuai nomor antrian.',
    notes: ''
  });

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/events');
      setEvents(res.data.events);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleStatusChange = async (id, status) => {
    if(!window.confirm(`Yakin mengubah status event menjadi ${status}?`)) return;
    try {
      await apiClient.put(`/events/${id}/status`, { status });
      fetchEvents();
    } catch (error) {
      alert('Gagal merubah status event');
    }
  };

  const handleDelete = async (id, name, isActive) => {
    if (isActive) {
      alert('Event yang sedang aktif tidak dapat dihapus. Nonaktifkan atau ubah status menjadi Selesai terlebih dahulu.');
      return;
    }
    
    if(!window.confirm(`PERINGATAN KRITIS!\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN event "${name}"?\nSemua data transaksi, pendaftar, kategori, produk, dan booth yang terhubung dengan event ini akan IKUT TERHAPUS.\n\nTindakan ini TIDAK DAPAT DIBATALKAN.`)) return;
    
    try {
      await apiClient.delete(`/events/${id}`);
      fetchEvents();
      alert('Event berhasil dihapus.');
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menghapus event.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/events', formData);
      setIsModalOpen(false);
      fetchEvents();
      setFormData({
        name: '', code: '', location: '', start_date: '', end_date: '', total_days: 1,
        receipt_format: '[HARI]-[KATEGORI]-[BOOTH]-[NOMOR]',
        tv_title: 'PHOTOBOOTH EVENT',
        tv_subtitle: 'Silakan menuju booth sesuai nomor antrian.',
        notes: ''
      });
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan event');
    }
  };

  const StatusBadge = ({ status }) => {
    if (status === 'AKTIF') return <span className="px-3 py-1 bg-success/10 text-success text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><CheckCircle size={14}/> Aktif</span>;
    if (status === 'SELESAI') return <span className="px-3 py-1 bg-warning/10 text-warning text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><Clock size={14}/> Selesai</span>;
    return <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle size={14}/> Nonaktif</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-textMain">Kelola Event</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Tambah Event
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-textMain">Nama Event</th>
              <th className="px-6 py-4 text-sm font-semibold text-textMain">Kode</th>
              <th className="px-6 py-4 text-sm font-semibold text-textMain">Tanggal</th>
              <th className="px-6 py-4 text-sm font-semibold text-textMain">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-textMain text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-textMain">{event.name}</div>
                  <div className="text-sm text-textSecondary">{event.location}</div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-textSecondary">{event.code}</td>
                <td className="px-6 py-4 text-sm text-textSecondary">
                  {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4"><StatusBadge status={event.status || (event.is_active ? 'AKTIF' : 'NONAKTIF')} /></td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link to={`/kasir/events/${event.id}`} className="inline-block text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100">Detail / Kelola</Link>
                  {event.status !== 'AKTIF' && (
                    <button onClick={() => handleStatusChange(event.id, 'AKTIF')} className="text-sm px-3 py-1.5 bg-success/10 text-success rounded-lg font-medium hover:bg-success/20">Set Aktif</button>
                  )}
                  {event.status === 'AKTIF' && (
                    <button onClick={() => handleStatusChange(event.id, 'SELESAI')} className="text-sm px-3 py-1.5 bg-warning/10 text-warning rounded-lg font-medium hover:bg-warning/20">Selesaikan</button>
                  )}
                  {(!event.is_active || event.status !== 'AKTIF') && (
                    <button 
                      onClick={() => handleDelete(event.id, event.name, event.is_active || event.status === 'AKTIF')} 
                      className="text-sm px-2 py-1.5 bg-danger/10 text-danger rounded-lg font-medium hover:bg-danger hover:text-white transition-colors"
                      title="Hapus Event"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-textSecondary">Belum ada event yang ditambahkan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Event */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-textMain">Tambah Event Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-danger"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Event</label>
                  <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Wisuda TK 2026"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kode Event (Singkat)</label>
                  <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Contoh: WSD"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lokasi</label>
                  <input type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Gedung XYZ"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jumlah Hari</label>
                  <input type="number" min="1" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.total_days} onChange={e => setFormData({...formData, total_days: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
                  <input type="date" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tanggal Selesai</label>
                  <input type="date" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>

              <hr className="my-4"/>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Format Nomor Nota</label>
                  <input type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.receipt_format} onChange={e => setFormData({...formData, receipt_format: e.target.value})} />
                  <p className="text-xs text-textSecondary mt-1">Default: [HARI]-[KATEGORI]-[BOOTH]-[NOMOR]</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Judul TV Antrian</label>
                  <input type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.tv_title} onChange={e => setFormData({...formData, tv_title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pesan Bawah TV</label>
                  <input type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.tv_subtitle} onChange={e => setFormData({...formData, tv_subtitle: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Catatan</label>
                  <textarea className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Catatan internal kasir..."></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg font-medium hover:bg-slate-50 transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Simpan Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KelolaEvent;
