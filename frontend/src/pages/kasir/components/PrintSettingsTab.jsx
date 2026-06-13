import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import { Settings, Printer, Eye, Save, RotateCcw } from 'lucide-react';

const PrintSettingsTab = ({ eventId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventData, setEventData] = useState(null);
  
  // Print settings state
  const [settings, setSettings] = useState({
    width_cm: 10,
    height_cm: 16.5,
    margin_mm: 5,
    qr_size_px: 80,
    show_booth_slip: true,
    show_guardian_name: true,
    show_status_link: true,
    footer_text: 'Scan QR atau buka link untuk melihat nomor antrian yang sedang berjalan.',
    preset: '10x16.5',
  });

  const presets = [
    { name: '10 cm × 16,5 cm', key: '10x16.5', width: 10, height: 16.5 },
    { name: '8 cm × 14 cm', key: '8x14', width: 8, height: 14 },
    { name: '8 cm × 20 cm', key: '8x20', width: 8, height: 20 },
    { name: 'Kustom', key: 'custom', width: 10, height: 16.5 },
  ];

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.get(`/events/${eventId}`);
        setEventData(res.data.event);
        if (res.data.event.print_settings) {
          setSettings(res.data.event.print_settings);
        }
      } catch (err) {
        console.error('Gagal memuat pengaturan print:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handlePresetChange = (presetKey) => {
    const p = presets.find(x => x.key === presetKey);
    if (!p) return;
    
    if (presetKey === 'custom') {
      setSettings(prev => ({ ...prev, preset: presetKey }));
    } else {
      setSettings(prev => ({
        ...prev,
        preset: presetKey,
        width_cm: p.width,
        height_cm: p.height
      }));
    }
  };

  const handleChange = (field, val) => {
    setSettings(prev => {
      const updated = { ...prev, [field]: val };
      
      // Check if it still matches a preset, if not set to custom
      if (field === 'width_cm' || field === 'height_cm') {
        const match = presets.find(x => x.key !== 'custom' && x.width === Number(updated.width_cm) && x.height === Number(updated.height_cm));
        updated.preset = match ? match.key : 'custom';
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    // Validasi
    const w = Number(settings.width_cm);
    const h = Number(settings.height_cm);
    if (isNaN(w) || w < 5 || w > 21) {
      return alert('Lebar nota harus berada di antara 5 cm dan 21 cm.');
    }
    if (isNaN(h) || h < 8 || h > 30) {
      return alert('Tinggi nota harus berada di antara 8 cm dan 30 cm.');
    }

    setSaving(true);
    try {
      await apiClient.put(`/events/${eventId}`, {
        ...eventData,
        print_settings: settings
      });
      alert('Pengaturan cetak berhasil disimpan!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan pengaturan cetak.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Yakin ingin mereset ke preset default?')) {
      setSettings({
        width_cm: 10,
        height_cm: 16.5,
        margin_mm: 5,
        qr_size_px: 80,
        show_booth_slip: true,
        show_guardian_name: true,
        show_status_link: true,
        footer_text: 'Scan QR atau buka link untuk melihat nomor antrian yang sedang berjalan.',
        preset: '10x16.5',
      });
    }
  };

  if (loading) return <div className="py-6 text-center text-slate-500">Memuat pengaturan...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Panel */}
      <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-4 mb-4">
          <Settings className="text-primary" size={22} />
          <h2 className="text-lg font-black text-slate-800">Form Pengaturan Cetak</h2>
        </div>

        {/* Preset Selector */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Preset Ukuran Kertas</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presets.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePresetChange(p.key)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all ${settings.preset === p.key ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Lebar Nota (cm)</label>
            <input
              type="number"
              step="0.1"
              min="5"
              max="21"
              className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-primary font-bold"
              value={settings.width_cm}
              onChange={e => handleChange('width_cm', parseFloat(e.target.value) || 0)}
              disabled={settings.preset !== 'custom'}
            />
            <p className="text-[10px] text-slate-400 mt-1">Batas: 5 - 21 cm</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tinggi Nota (cm)</label>
            <input
              type="number"
              step="0.1"
              min="8"
              max="30"
              className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-primary font-bold"
              value={settings.height_cm}
              onChange={e => handleChange('height_cm', parseFloat(e.target.value) || 0)}
              disabled={settings.preset !== 'custom'}
            />
            <p className="text-[10px] text-slate-400 mt-1">Batas: 8 - 30 cm</p>
          </div>
        </div>

        {/* Margin and QR settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Margin Nota (mm)</label>
            <input
              type="number"
              min="0"
              max="20"
              className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-primary font-bold"
              value={settings.margin_mm}
              onChange={e => handleChange('margin_mm', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ukuran QR Code (px)</label>
            <input
              type="number"
              min="30"
              max="150"
              className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-primary font-bold"
              value={settings.qr_size_px}
              onChange={e => handleChange('qr_size_px', parseInt(e.target.value) || 80)}
            />
          </div>
        </div>

        {/* Toggle Option Flags */}
        <div className="space-y-3 pt-2">
          <label className="block text-sm font-bold text-slate-700 mb-1">Pilihan Informasi Nota</label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 accent-primary rounded-md"
              checked={settings.show_booth_slip}
              onChange={e => handleChange('show_booth_slip', e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-700">Tampilkan sobekan khusus petugas foto</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 accent-primary rounded-md"
              checked={settings.show_guardian_name}
              onChange={e => handleChange('show_guardian_name', e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-700">Tampilkan kolom Nama Wali / Orang Tua</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 accent-primary rounded-md"
              checked={settings.show_status_link}
              onChange={e => handleChange('show_status_link', e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-700">Tampilkan link teks status antrian publik</span>
          </label>
        </div>

        {/* Footer Text Area */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Teks Footer Nota</label>
          <textarea
            rows="2"
            className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-primary font-semibold text-sm"
            value={settings.footer_text}
            onChange={e => handleChange('footer_text', e.target.value)}
            placeholder="Tulis pesan di bagian bawah nota..."
          />
        </div>

        {/* Buttons Action */}
        <div className="flex gap-3 border-t pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
          >
            <RotateCcw size={16} /> Reset Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="flex flex-col bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
        <div className="flex items-center gap-2 border-b pb-4 mb-4">
          <Eye className="text-slate-600" size={22} />
          <h2 className="text-lg font-black text-slate-800">Live Preview Nota (Simulasi)</h2>
        </div>

        {/* Simulated Receipt Render */}
        <div className="flex-1 flex items-start justify-center overflow-auto p-4 max-h-[500px]">
          <div
            className="bg-white text-black shadow-lg border border-slate-300"
            style={{
              width: `${settings.width_cm * 25}px`, // Scaled for screen resolution (1cm = ~25px)
              minHeight: `${settings.height_cm * 25}px`,
              padding: `${settings.margin_mm * 2.5}px`,
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '11px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div className="text-center mb-2">
              <div className="font-extrabold uppercase text-[14px]">{eventData?.name || 'PHOTOBOOTH EVENT'}</div>
              <div className="text-[10px] mt-0.5">Nota Lunas Pembayaran</div>
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            {/* Queue Code */}
            <div className="text-center my-2">
              <div className="text-[9px] uppercase font-bold">Nomor Antrian / Nota</div>
              <div className="text-[18px] font-black tracking-wider leading-none">D1-SD-A-001</div>
              <div className="text-[9px] font-bold mt-1">Booth: Booth A</div>
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            {/* Info */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Nama:</span>
                <span className="font-bold">DANIEL</span>
              </div>
              {settings.show_guardian_name && (
                <div className="flex justify-between">
                  <span>Wali:</span>
                  <span className="font-bold">BUDI</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Kategori:</span>
                <span className="font-bold">SD (SEKOLAH DASAR)</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>13 Jun 2026 11:30</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            {/* Items */}
            <div className="space-y-0.5 text-[10px]">
              <div className="font-bold uppercase text-[9px]">Detail Pesanan</div>
              <div className="flex justify-between">
                <span>1x FOTO CETAK + FRAME</span>
                <span className="font-bold">Rp 50.000</span>
              </div>
              <div className="flex justify-between">
                <span>1x EXTRA PRINT</span>
                <span className="font-bold">Rp 15.000</span>
              </div>
              <div className="flex justify-between text-[11px] font-extrabold border-t border-dotted border-black pt-1 mt-1">
                <span>Total:</span>
                <span>Rp 65.000</span>
              </div>
            </div>

            {/* Stamp LUNAS */}
            <div className="text-center my-2">
              <div className="inline-block border-2 border-black px-4 py-0.5 text-[11px] font-extrabold rotate-[-4deg]">
                LUNAS
              </div>
            </div>

            {/* QR Code Simulation */}
            <div className="flex flex-col items-center my-2 text-center">
              <div 
                className="bg-slate-200 border-2 border-slate-400 flex items-center justify-center font-bold text-[9px] mb-1"
                style={{ width: `${settings.qr_size_px}px`, height: `${settings.qr_size_px}px` }}
              >
                [ QR CODE ]
              </div>
              {settings.show_status_link && (
                <div className="text-[8px] text-slate-700 truncate w-full">
                  http://status/D1-SD-A-001
                </div>
              )}
            </div>

            {/* Footer Text */}
            <div className="text-center text-[9px] leading-tight text-slate-600 mt-2 border-t border-dashed border-black pt-1">
              {settings.footer_text}
            </div>

            {/* Simulated Tear Section */}
            {settings.show_booth_slip && (
              <div className="mt-4 pt-2 border-t-2 border-dashed border-black relative">
                <div className="text-[8px] font-bold text-center uppercase tracking-widest text-slate-500 mb-2">
                  ✂️ SOBEKAN PETUGAS BOOTH
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-black">D1-SD-A-001</div>
                  <div className="text-[9px] font-bold">Nama: DANIEL (SD)</div>
                  <div className="text-[9px] mt-1">Layanan: PHOTO 1x, FRAME 1x</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSettingsTab;
