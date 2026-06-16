import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Calendar, ListFilter, FileDown, Eye, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LaporanProduk = () => {
  const { user } = useAuth();
  
  // State data
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsList, setProductsList] = useState([]); // Master products for dropdown
  const [reportData, setReportData] = useState(null); // API response for report
  
  // Filter states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('LUNAS');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  
  // Loading & Error states
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Pagination & Sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('product_name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal states
  const [detailModal, setDetailModal] = useState({ isOpen: false, productId: '', productName: '', categoryName: '', data: [], isLoading: false });

  // 1. Fetch Events on Mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
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
        console.error('Failed to fetch events', error);
        toast.error('Gagal memuat daftar event.');
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  // 2. Fetch Categories & Products when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;

    // Reset filters
    setSelectedCategoryId('');
    setSelectedProductId('');
    setCurrentPage(1);

    const fetchEventData = async () => {
      try {
        // Fetch Categories
        const catRes = await apiClient.get(`/events/${selectedEventId}/product-categories`);
        setCategories(catRes.data || []);

        // Fetch Products
        const prodRes = await apiClient.get(`/events/${selectedEventId}/products`);
        setProductsList(prodRes.data || []);
      } catch (err) {
        console.error('Failed to fetch event master data', err);
      }
    };

    fetchEventData();
  }, [selectedEventId]);

  // 3. Reset Product filter when Category changes (as requested)
  const handleCategoryChange = (e) => {
    setSelectedCategoryId(e.target.value);
    setSelectedProductId(''); // Reset product to "Semua Produk"
    setCurrentPage(1);
  };

  // 4. Filter products dropdown based on selected category client-side
  const filteredProductsDropdown = selectedCategoryId
    ? productsList.filter(p => p.category_id === selectedCategoryId)
    : productsList;

  // 5. Fetch Report Data
  const fetchReport = async () => {
    if (!selectedEventId) return;
    setIsLoadingReport(true);
    setReportError(null);
    try {
      const params = {
        event_id: selectedEventId,
        category_id: selectedCategoryId || undefined,
        product_id: selectedProductId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        payment_status: paymentStatus,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined,
        page: currentPage,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      const res = await apiClient.get('/reports/product-sales', { params });
      if (res.data.success) {
        setReportData(res.data);
      } else {
        throw new Error(res.data.message || 'Gagal memuat laporan');
      }
    } catch (err) {
      console.error(err);
      setReportError(err.response?.data?.message || 'Gagal memuat laporan produk. Silakan coba lagi.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Trigger report fetch when filters change
  useEffect(() => {
    if (selectedEventId) {
      fetchReport();
    }
  }, [selectedEventId, selectedCategoryId, selectedProductId, startDate, endDate, paymentStatus, paymentMethod, currentPage, limit, sortBy, sortOrder]);

  // 6. Handle Reset Filters
  const handleResetFilters = () => {
    setSelectedCategoryId('');
    setSelectedProductId('');
    setStartDate('');
    setEndDate('');
    setPaymentStatus('LUNAS');
    setPaymentMethod('ALL');
    setCurrentPage(1);
    setSortBy('product_name');
    setSortOrder('asc');
    toast.success('Filter berhasil direset.');
  };

  // 7. Handle Sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // 8. Export PDF
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    if (!selectedEventId) return toast.error('Silakan pilih event terlebih dahulu.');
    
    // Validate dates before export
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return toast.error('Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.');
    }

    try {
      setIsExportingPDF(true);
      
      const queryParams = new URLSearchParams({
        event_id: selectedEventId,
        category_id: selectedCategoryId || '',
        product_id: selectedProductId || '',
        start_date: startDate || '',
        end_date: endDate || '',
        payment_status: paymentStatus,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : ''
      }).toString();

      const response = await apiClient.get(`/reports/product-sales/pdf?${queryParams}`, {
        responseType: 'blob',
        timeout: 60000 // 60s timeout
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const eventName = events.find(e => e.id === selectedEventId)?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'Event';
      link.download = `laporan-penjualan-produk-${eventName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Laporan PDF berhasil diunduh.');
    } catch (error) {
      console.error('Failed to export PDF', error);
      toast.error('Gagal mengexport PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // 9. Fetch and Open Detail Modal
  const handleOpenDetail = async (prodId, prodName, catName) => {
    setDetailModal({
      isOpen: true,
      productId: prodId,
      productName: prodName,
      categoryName: catName,
      data: [],
      isLoading: true
    });

    try {
      const response = await apiClient.get(`/reports/product-sales/${prodId || 'null'}/details`, {
        params: {
          event_id: selectedEventId,
          product_name: prodName
        }
      });
      if (response.data.success) {
        setDetailModal(prev => ({
          ...prev,
          data: response.data.details || [],
          isLoading: false
        }));
      } else {
        throw new Error('Gagal memuat detail');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat rincian transaksi produk.');
      setDetailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  // Helpers
  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  
  if (isLoadingEvents) {
    return <div className="p-10 text-center font-medium text-textSecondary">Memuat Event...</div>;
  }

  const summary = reportData?.summary || { total_products_sold: 0, total_sales: 0, total_transactions: 0, unique_products: 0 };
  const products = reportData?.products || [];
  const pagination = reportData?.pagination || { page: 1, limit: 10, total_items: 0, total_pages: 1 };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black mb-2">Laporan Penjualan per Produk</h1>
          <p className="text-slate-300 text-sm">Lihat jumlah produk terjual dan total pendapatan berdasarkan filter yang disesuaikan.</p>
        </div>
        
        {/* Event Selector */}
        <div className="w-full md:w-auto flex flex-col gap-1.5 shrink-0">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Event Aktif / Pilihan</label>
          <select 
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm max-w-[280px] truncate"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            <option value="" disabled>Pilih Event</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.name} {ev.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm bg-white space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ListFilter size={20} className="text-primary" />
          <h2 className="font-bold text-textMain">Saring Laporan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Kategori Produk</label>
            <select
              className="px-3 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-slate-50 bg-white"
              value={selectedCategoryId}
              onChange={handleCategoryChange}
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Produk Tertentu</label>
            <select
              className="px-3 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-slate-50 bg-white"
              value={selectedProductId}
              onChange={e => { setSelectedProductId(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Semua Produk</option>
              {filteredProductsDropdown.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Tanggal Mulai</label>
            <input
              type="date"
              className="px-3 py-1.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-slate-50"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Tanggal Selesai</label>
            <input
              type="date"
              className="px-3 py-1.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-slate-50"
              value={endDate}
              min={startDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Payment Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Status Pembayaran</label>
            <select
              className="px-3 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-slate-50 bg-white"
              value={paymentStatus}
              onChange={e => { setPaymentStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="LUNAS">LUNAS (Hanya Bayar)</option>
              <option value="ALL">Semua Status (Lunas & Belum Lunas)</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Metode Pembayaran</label>
            <select
              className="px-3 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-slate-50 bg-white"
              value={paymentMethod}
              onChange={e => { setPaymentMethod(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Semua Metode</option>
              <option value="TUNAI">TUNAI</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-end justify-end gap-3">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
            >
              Reset Filter
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF || products.length === 0}
              className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={18} />
              {isExportingPDF ? 'Mengexport...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Terjual */}
        <div className="bg-card rounded-2xl p-6 border-l-4 border-primary shadow-sm bg-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Total Produk Terjual</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{summary.total_products_sold.toLocaleString('id-ID')}</h3>
            <p className="text-[10px] text-textSecondary mt-1">*Hanya transaksi LUNAS</p>
          </div>
          <div className="bg-primary/10 p-3 rounded-full text-primary"><ShoppingBag size={24}/></div>
        </div>

        {/* Total Penjualan */}
        <div className="bg-card rounded-2xl p-6 border-l-4 border-success shadow-sm bg-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Total Penjualan Produk</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{formatRp(summary.total_sales)}</h3>
            <p className="text-[10px] text-textSecondary mt-1">*Hanya transaksi LUNAS</p>
          </div>
          <div className="bg-success/10 p-3 rounded-full text-success"><ShoppingBag size={24}/></div>
        </div>

        {/* Jumlah Transaksi */}
        <div className="bg-card rounded-2xl p-6 border-l-4 border-warning shadow-sm bg-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Jumlah Transaksi</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{summary.total_transactions.toLocaleString('id-ID')}</h3>
            <p className="text-[10px] text-textSecondary mt-1">*Sesuai filter status pembayaran</p>
          </div>
          <div className="bg-warning/10 p-3 rounded-full text-warning"><ShoppingBag size={24}/></div>
        </div>

        {/* Jumlah Produk Berbeda */}
        <div className="bg-card rounded-2xl p-6 border-l-4 border-slate-700 shadow-sm bg-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Produk Berbeda</p>
            <h3 className="text-2xl font-black mt-1 text-textMain">{summary.unique_products.toLocaleString('id-ID')}</h3>
            <p className="text-[10px] text-textSecondary mt-1">*Sesuai filter terpilih</p>
          </div>
          <div className="bg-slate-100 p-3 rounded-full text-slate-700"><ShoppingBag size={24}/></div>
        </div>
      </div>

      {/* REPORT TABLE */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
        {isLoadingReport ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="font-semibold text-textSecondary">Memuat data laporan...</p>
          </div>
        ) : reportError ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <AlertCircle className="text-danger h-12 w-12 mx-auto mb-3" />
            <p className="font-bold text-textMain text-lg">Gagal Memuat Laporan</p>
            <p className="text-sm text-textSecondary mt-1 mb-4">{reportError}</p>
            <button
              onClick={fetchReport}
              className="px-5 py-2 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl text-sm"
            >
              Coba Lagi
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingBag className="text-slate-300 h-12 w-12 mx-auto mb-3" />
            <p className="font-bold text-textMain">Belum Ada Data Penjualan</p>
            <p className="text-xs text-textSecondary mt-1">
              {!selectedEventId 
                ? 'Pilih event untuk melihat laporan penjualan produk.' 
                : 'Belum ada penjualan produk pada event dan filter yang dipilih.'
              }
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider w-16">No.</th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('product_name')}
                    >
                      Nama Produk {sortBy === 'product_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('category_name')}
                    >
                      Kategori {sortBy === 'category_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('unit_price')}
                    >
                      Harga Satuan {sortBy === 'unit_price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-right"
                      onClick={() => handleSort('transaction_count')}
                    >
                      Jumlah Transaksi {sortBy === 'transaction_count' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-right"
                      onClick={() => handleSort('total_quantity')}
                    >
                      Jumlah Terjual {sortBy === 'total_quantity' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-right"
                      onClick={() => handleSort('total_sales')}
                    >
                      Total Penjualan {sortBy === 'total_sales' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-right"
                      onClick={() => handleSort('contribution_percentage')}
                    >
                      Kontribusi (%) {sortBy === 'contribution_percentage' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider text-right w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {products.map((p, idx) => {
                    const rowNo = (pagination.page - 1) * pagination.limit + idx + 1;
                    return (
                      <tr key={p.product_id || p.product_name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-textSecondary font-medium">{rowNo}</td>
                        <td className="px-6 py-4 font-semibold text-textMain uppercase">{p.product_name}</td>
                        <td className="px-6 py-4 text-textSecondary">{p.category_name}</td>
                        <td className="px-6 py-4 text-textMain">
                          {p.unit_price === 'Bervariasi' ? (
                            <span className="italic text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-xs">
                              Bervariasi
                            </span>
                          ) : (
                            formatRp(p.unit_price)
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-textMain">{p.transaction_count.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right font-medium text-textMain">{p.total_quantity.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right font-black text-textMain">{formatRp(p.total_sales)}</td>
                        <td className="px-6 py-4 text-right font-bold text-primary">{p.contribution_percentage.toFixed(2)}%</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenDetail(p.product_id, p.product_name, p.category_name)}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye size={12} /> Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-slate-50">
                <span className="text-xs text-textSecondary">
                  Menampilkan <b>{products.length}</b> dari <b>{pagination.total_items}</b> produk
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg">
                    {currentPage} / {pagination.total_pages}
                  </span>
                  <button
                    disabled={currentPage === pagination.total_pages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECONCILIATION & TYPO FOOTNOTE FOOTER */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-border flex flex-col md:flex-row md:items-start gap-4">
        <AlertCircle size={20} className="text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Catatan Penting Laporan</p>
          <ul className="list-disc list-inside text-xs text-slate-500 space-y-1">
            <li>Selisih dapat berasal dari diskon, koreksi transaksi, atau biaya lain yang tidak terkait langsung dengan produk.</li>
            <li>Typo nama produk atau variasi penulisan ditampilkan sebagai produk terpisah sesuai snapshot historis transaksi (tidak otomatis digabungkan).</li>
            <li>Jika harga satuan tercantum sebagai <span className="italic text-slate-600 font-semibold bg-slate-200 px-1 rounded">Bervariasi</span>, hal tersebut menunjukkan bahwa produk bersangkutan telah terjual dengan harga snapshot historis yang berbeda pada transaksi-transaksi yang tercatat.</li>
          </ul>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl bg-white flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-textMain uppercase">{detailModal.productName}</h3>
                <p className="text-xs text-textSecondary mt-0.5">Kategori: {detailModal.categoryName} • Rincian Transaksi</p>
              </div>
              <button 
                onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                className="text-textSecondary hover:text-textMain p-1.5 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {detailModal.isLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="font-semibold text-textSecondary text-sm">Memuat rincian transaksi...</p>
                </div>
              ) : detailModal.data.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Belum ada catatan transaksi detail untuk produk ini.
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 border-b border-border sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider w-12">No.</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider">No. Nota</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider">Nama Peserta</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider text-right">Harga Transaksi</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider text-right w-16">Qty</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider text-right">Subtotal</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider">Metode</th>
                      <th className="px-4 py-2.5 text-xs font-bold text-textSecondary uppercase tracking-wider text-right">Tanggal Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detailModal.data.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-textSecondary">{i + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-xs">{row.receipt_number || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-textMain uppercase text-xs">{row.participant_name}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{formatRp(row.price)}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{row.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-textMain">{formatRp(row.subtotal)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row.payment_method === 'QRIS' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {row.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-textSecondary">
                          {new Date(row.created_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-slate-50">
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-350 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaporanProduk;
