import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import apiClient from "../../services/apiClient";
import env from "../../config/env";
import { QRCodeSVG } from "qrcode.react";

const PrintNota = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get(`/transactions/${id}`);
        setData(res.data.transaction);
      } catch (err) {
        console.error("Gagal memuat detail nota:", err);
        setError(true);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (data) {
      // Auto trigger print unless 'noprint' is set in query
      if (!searchParams.get("noprint")) {
        const timer = setTimeout(() => {
          window.print();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [data, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black font-sans">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Terjadi Kesalahan</h2>
          <p className="text-slate-600 mt-1">Data nota tidak ditemukan atau Anda tidak memiliki akses.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black font-mono">
        Loading nota...
      </div>
    );
  }

  // Fallback print settings if not customized in event
  const settings = data.print_settings || {
    width_cm: 10,
    height_cm: 16.5,
    margin_mm: 5,
    qr_size_px: 80,
    show_booth_slip: true,
    show_guardian_name: true,
    show_status_link: true,

  };

  const queueCode = data.queue_code || "";
  const statusUrl = `${env.publicAppUrl}/status/${queueCode}`;

  // Helper to extract operational summaries for photography booth tear slip
  const getBoothSlipSummary = (items) => {
    let photoSessions = 0;
    let prints = 0;
    let frames = 0;
    const additions = [];

    items.forEach((item) => {
      const name = (item.product_name || item.product_name_snapshot || "").toLowerCase();
      const cat = (item.product_category_name_snapshot || "").toLowerCase();
      const qty = item.quantity || 1;

      if (name.includes("foto") || name.includes("session") || cat.includes("foto") || cat.includes("session")) {
        photoSessions += qty;
      } else if (name.includes("cetak") || name.includes("print") || cat.includes("cetak") || cat.includes("print")) {
        prints += qty;
      } else if (name.includes("bingkai") || name.includes("frame") || cat.includes("bingkai") || cat.includes("frame")) {
        frames += qty;
      } else {
        additions.push(`${qty}x ${item.product_name || item.product_name_snapshot}`);
      }
    });

    return { photoSessions, prints, frames, additions };
  };

  const { photoSessions, prints, frames, additions } = getBoothSlipSummary(data.items || []);

  return (
    <>
      <style>
        {`
          @page {
            size: ${data.payment_status === "MENUNGGU_PEMBAYARAN" ? "8cm 9.5cm" : `${settings.width_cm}cm ${settings.height_cm}cm`};
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }

          /* ── PAKSA font nota selalu Courier New, override global CSS ── */
          .nota-print,
          .nota-print * {
            font-family: "Courier New", "Liberation Mono", "Consolas", monospace !important;
          }

          @media print {
            html, body {
              width: ${data.payment_status === "MENUNGGU_PEMBAYARAN" ? "8cm" : `${settings.width_cm}cm`};
              height: ${data.payment_status === "MENUNGGU_PEMBAYARAN" ? "9.5cm" : `${settings.height_cm}cm`};
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            body * {
              visibility: hidden;
            }

            .nota-print, .nota-print * {
              visibility: visible;
              font-family: "Courier New", "Liberation Mono", "Consolas", monospace !important;
            }

            .nota-print {
              position: absolute;
              left: 0;
              top: 0;
              width: ${data.payment_status === "MENUNGGU_PEMBAYARAN" ? "8cm" : `${settings.width_cm}cm`} !important;
              height: ${data.payment_status === "MENUNGGU_PEMBAYARAN" ? "9.5cm" : `${settings.height_cm}cm`} !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          }
        `}
      </style>

      {/* Control Buttons for Preview (hidden during print) */}
      <div className="bg-slate-100 p-4 border-b flex justify-center gap-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-indigo-600 text-white font-extrabold text-sm rounded-xl hover:bg-indigo-700 active:scale-95 transition-transform shadow-sm"
        >
          Cetak Nota
        </button>
        <button
          onClick={() => window.close()}
          className="px-6 py-2.5 bg-slate-200 text-slate-700 font-extrabold text-sm rounded-xl hover:bg-slate-300 active:scale-95 transition-transform"
        >
          Tutup Halaman
        </button>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4 print:contents">
        <div
          className="nota-print bg-white text-black shadow-md"
          style={{
            width: data.payment_status === "MENUNGGU_PEMBAYARAN" ? "8cm" : `${settings.width_cm}cm`,
            height: data.payment_status === "MENUNGGU_PEMBAYARAN" ? "9.5cm" : `${settings.height_cm}cm`,
            boxSizing: "border-box",
            padding: data.payment_status === "MENUNGGU_PEMBAYARAN" ? "4mm" : `${settings.margin_mm}mm`,
            fontFamily: '"Courier New", "Liberation Mono", "Consolas", monospace',
            overflow: "hidden",
          }}
        >
          {data.payment_status === "MENUNGGU_PEMBAYARAN" ? (
            /* ================= SLIP PENDAFTARAN (BELUM BAYAR) ================= */
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", fontSize: "10px", lineHeight: "1.2" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: "100", textTransform: "uppercase" }}>
                  {data.event_name || "PHOTOBOOTH EVENT"}
                </div>
                <div style={{ fontSize: "9px", fontWeight: "bold", margin: "2px 0" }}>TIKET PENDAFTARAN (UNPAID)</div>
                <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "bold" }}>Antrean Pembayaran</div>
                <div style={{ fontSize: "38px", fontWeight: "100", margin: "2px 0", letterSpacing: "1px" }}>
                  {data.payment_queue_code || data.queue_code || "-"}
                </div>
                <div style={{ fontSize: "9px", color: "#333", fontWeight: "bold" }}>
                  Reg: {data.registration_code || data.receipt_number}
                </div>

                <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
              </div>

              <div style={{ padding: "0 2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>Nama Peserta:</span>
                  <span style={{ fontWeight: "700" }}>{data.participant_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>Kategori:</span>
                  <span style={{ fontWeight: "100" }}>{data.category_name || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>Total Bayar:</span>
                  <span style={{ fontWeight: "100" }}>Rp {parseFloat(data.total_amount).toLocaleString("id-ID")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>Status:</span>
                  <span style={{ fontWeight: "100" }}>BELUM LUNAS</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "4px 0" }}>
                <QRCodeSVG value={`${env.publicAppUrl}/status/${data.registration_code || data.receipt_number}`} size={65} level="M" />
              </div>

              <div style={{ textAlign: "center", fontSize: "8px", borderTop: "1px dashed #000", paddingTop: "4px" }}>
                <div style={{ fontWeight: "100", textTransform: "uppercase" }}>Harap Menunggu panggilan TV Antrean menuju Kasir.</div>
                <div style={{ marginTop: "2px", color: "#333" }}>Scan QR untuk memantau status antrean Anda secara online.</div>
              </div>
            </div>
          ) : (
            /* ================= NOTA LUNAS (SUDAH BAYAR) ================= */
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* Receipt Body */}
              <div>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "0.2cm" }}>
                  <div style={{ fontSize: "16px", fontWeight: "100", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    P&G SMART PHOTO
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: "100", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <span>Ruko Airmadidi Graha Jl. Raya Manado Bitung Airmadidi Minahasa Utara</span>
                    <br /><span>NO Wa:  0811437878</span>
                  </div>
                  <div style={{ fontSize: "9px", marginTop: "2px" }}>
                    Nota Lunas Pembayaran
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed #000", margin: "0.1cm 0" }} />

                {/* Queue Number */}
                <div style={{ textAlign: "center", margin: "0.2cm 0" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "100" }}>
                    Nomor Antrian / Nota
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "100", lineHeight: 1.1 }}>
                    {queueCode}
                  </div>
                  <div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "100" }}>
                    {data.booth_name || "Otomatis"}
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed #000", margin: "0.1cm 0" }} />

                {/* Info */}
                <div style={{ fontSize: "15px", margin: "0.15cm 0", lineHeight: "1.4" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Nama Peserta:</span>
                    <span style={{ fontWeight: "100" }}>{data.participant_name}</span>
                  </div>
                  {settings.show_guardian_name && data.guardian_name && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span>Nama Wali:</span>
                      <span style={{ fontWeight: "100" }}>{data.guardian_name}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Kategori:</span>
                    <span style={{ fontWeight: "100" }}>{data.category_name || "-"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Waktu Pembayaran:</span>
                    <span style={{ fontWeight: "100" }}>{new Date(data.verified_at || data.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Metode</span>
                    <span style={{ fontWeight: "100" }}>{data.payment_method}</span>
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed #000", margin: "0.1cm 0" }} />

                {/* Items */}
                <div style={{ fontSize: "15px", margin: "0.15cm 0" }}>
                  {data.items?.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5px" }}>
                      <span>{item.quantity}x {item.product_name || item.product_name_snapshot}</span>
                      <span style={{ fontWeight: "100" }}>Rp {parseFloat(item.subtotal).toLocaleString("id-ID")}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "100", marginTop: "5px", borderTop: "1px dotted #000", pt: "2px" }}>
                    <span>Total Bayar:</span>
                    <span>Rp {parseFloat(data.total_amount).toLocaleString("id-ID")}</span>
                  </div>
                  {data.payment_method === "TUNAI" && data.amount_received && (
                    <div style={{ display: "flex", flexDirection: "column", fontSize: "15px", marginTop: "2px", color: "#333" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Uang Diterima:</span>
                        <span>Rp {parseFloat(data.amount_received).toLocaleString("id-ID")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Kembalian:</span>
                        <span>Rp {parseFloat(data.change_amount || 0).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                    <span>Tanggal Selesai:</span>
                    <span>2 Juli 2026</span>
                  </div>
                  <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                    <span>Tempat Pengambilan Foto:</span>
                    <span>MIS</span>
                  </div>
                </div>

                {/* Footer message */}
                <div style={{ fontSize: "15px", textAlign: "center", color: "#444", marginTop: "2px", lineHeight: 1.3 }}>
                  {settings.footer_text}
                </div>
              </div>

              {/* Tear off Slip */}
              {settings.show_booth_slip && (
                <div style={{ marginTop: "auto", paddingTop: "0cm" }}>
                  <div className="pb-4" style={{ borderTop: "2px dashed #000", position: "relative", margin: "0.2cm 1 0.1cm 0" }}>

                  </div>
                  <div style={{ textAlign: "center", padding: "0.05cm 0" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: "100" }}>SOBEKAN UNTUK PETUGAS FOTO</div>
                    <div style={{ fontSize: "20px", fontWeight: "100", margin: "1px 0" }}>{queueCode}</div>
                    <div className="flex justify-between">
                      <div style={{ fontSize: "9.5px", fontWeight: "100" }}>Nama: {data.participant_name} ({data.category_name || "-"})</div>
                      <div style={{ fontSize: "9px", fontWeight: "100", marginTop: "1px" }}>Booth: {data.booth_name || "Otomatis"}</div>
                    </div>
                    {/* Operational Summary */}
                    <div style={{ fontSize: "15.5px", border: "1px solid #000", padding: "3px", marginTop: "3px", textAlign: "left" }}>
                      <div>Sesi Foto : {photoSessions} kali</div>

                      {frames > 0 && <div>Bingkai    : {frames} pcs</div>}
                      {additions.length > 0 && (
                        <div style={{ fontSize: "8px", marginTop: "2px", borderTop: "1px dotted #000", paddingTop: "2px" }}>
                          Tambahan: {additions.join(", ")}
                        </div>
                      )}
                      {data.notes && (
                        <div style={{ fontSize: "8px", marginTop: "2px", color: "#444", borderTop: "1px dotted #000", paddingTop: "2px" }}>
                          Catatan : {data.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PrintNota;
