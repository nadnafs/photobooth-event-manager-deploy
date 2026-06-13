import React, { useState, useEffect } from "react";
import apiClient from "../../../services/apiClient";
import { Save, RefreshCw, AlertCircle } from "lucide-react";

const ReceiptSettingsTab = ({ eventId }) => {
  const [formData, setFormData] = useState({
    receipt_prefix: "NOTA",
    receipt_separator: "-",
    receipt_start_number: 1,
    receipt_digit_length: 4,
    receipt_reset_mode: "NEVER",
  });
  const [currentNumber, setCurrentNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.get(`/events/${eventId}`);
        const event = res.data.event;
        setFormData({
          receipt_prefix: event.receipt_prefix || "NOTA",
          receipt_separator: event.receipt_separator !== undefined ? event.receipt_separator : "-",
          receipt_start_number: event.receipt_start_number || 1,
          receipt_digit_length: event.receipt_digit_length || 4,
          receipt_reset_mode: event.receipt_reset_mode || "NEVER",
        });
        setCurrentNumber(event.receipt_current_number || 0);
      } catch (error) {
        console.error("Gagal mengambil data event:", error);
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await apiClient.put(`/events/${eventId}`, formData);
      alert("Pengaturan nomor nota berhasil disimpan.");
    } catch (error) {
      alert("Gagal menyimpan pengaturan.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const startNum = prompt(`Reset hanya memengaruhi nota berikutnya. Nomor nota lama tidak akan berubah.\n\nMasukkan nomor awal untuk reset:`, formData.receipt_start_number);
    if (startNum === null) return;
    
    const parsedNum = parseInt(startNum, 10);
    if (isNaN(parsedNum) || parsedNum < 1) {
      alert("Nomor awal tidak valid.");
      return;
    }

    const reason = prompt("Masukkan alasan reset:");
    if (!reason) {
      alert("Alasan reset wajib diisi.");
      return;
    }

    try {
      const res = await apiClient.post(`/events/${eventId}/reset-receipt`, { start_number: parsedNum, reason });
      setCurrentNumber(res.data.event.receipt_current_number);
      alert("Nomor nota berhasil direset.");
    } catch (error) {
      alert("Gagal mereset nomor nota.");
      console.error(error);
    }
  };

  if (loading) return <div className="p-4">Memuat data...</div>;

  const paddedPreview = String(currentNumber + 1).padStart(formData.receipt_digit_length, "0");
  const previewResult = `${formData.receipt_prefix}${formData.receipt_separator}${paddedPreview}`;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Prefix (Maks 12 char)</label>
          <input
            type="text"
            maxLength={12}
            value={formData.receipt_prefix}
            onChange={(e) => setFormData({ ...formData, receipt_prefix: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })}
            className="w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Contoh: NOTA"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Separator</label>
          <select
            value={formData.receipt_separator}
            onChange={(e) => setFormData({ ...formData, receipt_separator: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="-">Tanda Minus (-)</option>
            <option value="/">Garis Miring (/)</option>
            <option value=".">Titik (.)</option>
            <option value="">Tanpa Separator</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Nomor Mulai (Minimal 1)</label>
          <input
            type="number"
            min="1"
            value={formData.receipt_start_number}
            onChange={(e) => setFormData({ ...formData, receipt_start_number: parseInt(e.target.value) || 1 })}
            className="w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Digit (2-8)</label>
          <input
            type="number"
            min="2"
            max="8"
            value={formData.receipt_digit_length}
            onChange={(e) => {
              let val = parseInt(e.target.value) || 4;
              if (val > 8) val = 8;
              if (val < 2) val = 2;
              setFormData({ ...formData, receipt_digit_length: val });
            }}
            className="w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">Pilihan Reset Nomor</label>
          <select
            value={formData.receipt_reset_mode}
            onChange={(e) => setFormData({ ...formData, receipt_reset_mode: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="NEVER">Tidak pernah (Berlanjut terus)</option>
            <option value="EVENT_REACTIVATE">Setiap event diaktifkan kembali</option>
            <option value="DAILY">Setiap hari</option>
            <option value="MANUAL">Hanya manual</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-800">Preview Nomor Nota Berikutnya</h3>
        <p className="font-mono text-3xl font-black text-indigo-900 tracking-wider">{previewResult}</p>
        <p className="mt-2 text-sm text-indigo-600/80">Nomor terakhir tersimpan: {currentNumber}</p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
        >
          <RefreshCw size={18} />
          Reset Nomor Manual
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={20} />
          {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>

      <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20}/>
        <p className="text-sm text-amber-800">
          Perubahan format hanya memengaruhi nomor nota <strong>baru</strong> yang diterbitkan setelah ini. Nomor nota transaksi lama yang sudah lunas tidak akan berubah.
        </p>
      </div>
    </div>
  );
};

export default ReceiptSettingsTab;
