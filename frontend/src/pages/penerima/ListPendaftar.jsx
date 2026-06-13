import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import env from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socketService';
import { Search, Printer, Trash2, Share2, Edit2, Clock, Calendar, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const ListPendaftar = () => {
  const [activeTab, setActiveTab] = useState('menunggu'); // 'menunggu' | 'riwayat'
  const [transactions, setTransactions] = useState([]);
  const [q, setQ] = useState('');

  // Modals state
  const [detailModal, setDetailModal] = useState({ isOpen: false, transaction: null });
  const [editModal, setEditModal] = useState({ isOpen: false, transaction: null, participantName: '', phone: '', notes: '', categoryId: '', boothId: '', items: [] });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, transaction: null, reason: '' });
  const [linkModal, setLinkModal] = useState({ isOpen: false, transaction: null });
  const [activeEventContext, setActiveEventContext] = useState(null);

  const { user } = useAuth();

  const fetchTransactions = async (eventId) => {
    if (!eventId) return;
    try {
      let url = `/transactions?event_id=${eventId}`;
      if (activeTab === 'menunggu') {
        url += '&status=MENUNGGU_PEMBAYARAN';
      } else if (activeTab === 'riwayat') {
        const todayStr = new Date().toISOString().split('T')[0];
        url += `&date=${todayStr}`;
      }

      if (q) {
        url += `&q=${q}`;
      }

      const res = await apiClient.get(url);

      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Fetch active event context once
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await apiClient.get('/transactions/active-event');
        setActiveEventContext(res.data);
      } catch (err) {
        console.error('Error fetching active event context:', err);
      }
    };
    fetchContext();
  }, []);

  // Poll transactions and handle socket updates
  useEffect(() => {
    if (!activeEventContext?.event?.id) return;
    const eventId = activeEventContext.event.id;

    fetchTransactions(eventId);

    // Auto-refresh fallback every 5 seconds
    const interval = setInterval(() => fetchTransactions(eventId), 5000);

    // Socket.io real-time update
    const socket = getSocket();
    const handleUpdate = () => fetchTransactions(eventId);
    socket.on('queue_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      socket.off('queue_updated', handleUpdate);
    };
  }, [activeTab, q, activeEventContext?.event?.id]);

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

  const handleDeleteTransaction = async (id, reason) => {
    if (!reason || reason.trim() === '') return alert('Alasan penghapusan wajib diisi');
    try {
      const res = await apiClient.delete(`/transactions/${id}`, { data: { delete_reason: reason } });
      alert('Pendaftaran berhasil dihapus');
      setDeleteModal({ isOpen: false, transaction: null, reason: '' });
      if (activeEventContext?.event?.id) fetchTransactions(activeEventContext.event.id);
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menghapus pendaftaran');
    }
  };

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);

  const getProductsSummary = (items) => {
    if (!items || items.length === 0) return '-';
    return items.map(i => `${i.quantity}x ${i.product_name || i.product_name_snapshot}`).join(', ');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textMain">Daftar Pendaftaran Penerima</h1>
          {activeEventContext?.event && (
            <p className="text-sm text-textSecondary mt-0.5">Event Aktif: <span className="font-semibold text-primary">{activeEventContext.event.name}</span></p>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setActiveTab('menunggu'); setTransactions([]); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'menunggu' ? 'bg-white text-primary shadow-sm' : 'text-textSecondary hover:text-textMain'}`}
          >
            <Clock size={16} /> Menunggu Kasir
          </button>
          <button
            onClick={() => { setActiveTab('riwayat'); setTransactions([]); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'riwayat' ? 'bg-white text-primary shadow-sm' : 'text-textSecondary hover:text-textMain'}`}
          >
            <Calendar size={16} /> Riwayat Hari Ini
          </button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex max-w-md">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-textSecondary" size={18} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari Nama / Kode..."
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Kode</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Peserta</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Kategori</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Layanan / Produk</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Total</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Metode</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Status</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm">Waktu</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-sm text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-black text-slate-800 text-base">{t.receipt_number || '-'}</td>
                <td className="px-4 py-3 font-black text-slate-900 text-base">{t.participant_name}</td>
                <td className="px-4 py-3 text-textSecondary font-bold">{t.category_name || '-'}</td>
                <td className="px-4 py-3 text-textSecondary max-w-xs truncate">{getProductsSummary(t.items)}</td>
                <td className="px-4 py-3 font-black text-slate-800 text-base">{formatRp(t.total_amount)}</td>
                <td className="px-4 py-3 text-textSecondary font-extrabold">{t.payment_method === 'BELUM' ? 'Belum Pilih' : t.payment_method}</td>
                <td className="px-4 py-3">
                  {t.payment_status === 'LUNAS' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase">Lunas</span>}
                  {t.payment_status === 'MENUNGGU_PEMBAYARAN' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black uppercase">Menunggu</span>}
                  {(t.payment_status === 'DIBATALKAN' || t.payment_status === 'BATAL') && <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-black uppercase">Batal</span>}
                </td>
                <td className="px-4 py-3 text-textSecondary font-medium">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setDetailModal({ isOpen: true, transaction: t })} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors" title="Lihat Detail">
                      <Eye size={15} />
                    </button>

                    {t.payment_status === 'MENUNGGU_PEMBAYARAN' ? (
                      <>
                        <button onClick={() => openEditModal(t)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteModal({ isOpen: true, transaction: t })} className="p-1.5 bg-red-50 text-red-650 rounded-lg hover:bg-red-100 transition-colors" title="Hapus Pendaftaran">
                          <Trash2 size={15} />
                        </button>
                        <Link to={`/print-nota/${t.id}`} target="_blank" className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Cetak Tiket">
                          <Printer size={15} />
                        </Link>
                      </>
                    ) : (
                      // Read-only actions for paid/cancelled in history
                      <>
                        <Link to={`/print-nota/${t.id}`} target="_blank" className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Cetak Ulang Tiket">
                          <Printer size={15} />
                        </Link>
                        {t.payment_status === 'LUNAS' && (
                          <button
                            onClick={() => setLinkModal({ isOpen: true, transaction: t })}
                            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                            title="Lihat Status"
                          >
                            <Share2 size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center p-8 text-textSecondary">
                  {activeTab === 'menunggu' ? 'Tidak ada pendaftaran menunggu pembayaran' : 'Belum ada riwayat pendaftaran hari ini'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {detailModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-slate-800 border-b pb-2">Detail Pendaftaran</h2>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Kode:</span>
                <span className="font-mono font-bold">{detailModal.transaction?.receipt_number}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Nama Peserta:</span>
                <span className="font-bold">{detailModal.transaction?.participant_name}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Kategori:</span>
                <span className="font-bold">{detailModal.transaction?.category_name || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">No HP:</span>
                <span className="font-bold">{detailModal.transaction?.phone || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Total Tagihan:</span>
                <span className="font-bold text-primary">{formatRp(detailModal.transaction?.total_amount)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Metode Pembayaran:</span>
                <span className="font-bold">{detailModal.transaction?.payment_method === 'BELUM' ? 'Belum Ditentukan' : detailModal.transaction?.payment_method}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Status:</span>
                <span className="font-bold">{detailModal.transaction?.payment_status}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-semibold">Catatan:</span>
                <span className="font-bold text-slate-700">{detailModal.transaction?.notes || '-'}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 font-bold block mb-1">Rincian Produk:</span>
                <div className="bg-slate-50 p-2.5 rounded-lg border max-h-24 overflow-y-auto">
                  {detailModal.transaction?.items?.map(i => (
                    <div key={i.id} className="flex justify-between text-xs py-0.5">
                      <span>{i.quantity}x {i.product_name || i.product_name_snapshot}</span>
                      <span>{formatRp(i.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setDetailModal({ isOpen: false, transaction: null })} className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">Tutup</button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
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
                onClick={() => setEditModal({ isOpen: false, transaction: null, participantName: '', phone: '', notes: '', categoryId: '', boothId: '', items: [] })}
                className="px-6 py-3.5 bg-slate-100 text-slate-700 font-extrabold rounded-xl hover:bg-slate-200 text-base"
              >
                Batal
              </button>
              <button
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
                    alert('Data pendaftar berhasil diperbarui');
                    setEditModal({ isOpen: false, transaction: null, participantName: '', phone: '', notes: '', categoryId: '', boothId: '', items: [] });
                    if (activeEventContext?.event?.id) fetchTransactions(activeEventContext.event.id);
                  } catch (err) {
                    alert(err.response?.data?.message || 'Gagal mengupdate transaksi');
                  }
                }}
                className="px-8 py-3.5 bg-green-400 text-white font-extrabold rounded-xl hover:bg-emerald-700 text-base"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL (UNPAID) */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border">
            <h2 className="text-xl font-bold text-red-600 mb-2">Hapus Pendaftaran</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Apakah Anda yakin ingin menghapus pendaftaran atas nama <strong>{deleteModal.transaction?.participant_name}</strong> dengan Kode Nota <strong>{deleteModal.transaction?.receipt_number}</strong>? Data ini akan dihapus dari antrean.
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

      {/* LINK PUBLIC MODAL */}
      {linkModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Share2 className="text-primary" size={20} /> Link Status Antrian
            </h2>
            <p className="text-slate-600 mb-4 text-sm">
              Gunakan opsi berikut untuk melihat status antrian peserta <strong>{linkModal.transaction?.participant_name}</strong> secara langsung:
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border font-mono text-xs select-all break-all mb-4">
              {`${env.publicAppUrl}/status/${linkModal.transaction?.queue_code}`}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${env.publicAppUrl}/status/${linkModal.transaction?.queue_code}`);
                  alert('Link status antrian disalin ke clipboard!');
                }}
                className="py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-colors text-center"
              >
                Salin Link Status
              </button>
              <button
                onClick={() => {
                  window.open(`${env.publicAppUrl}/status/${linkModal.transaction?.queue_code}`, '_blank');
                }}
                className="py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors text-center"
              >
                Buka Halaman Peserta
              </button>
            </div>

            <button
              onClick={() => setLinkModal({ isOpen: false, transaction: null })}
              className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListPendaftar;
