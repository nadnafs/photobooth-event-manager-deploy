import React, { useEffect, useRef, useState } from "react";
import apiClient from "../../services/apiClient";
import { getSocket } from "../../services/socketService";
import { WifiOff } from "lucide-react";

const TvAntrian = () => {
  const [data, setData] = useState({
    event: null,
    current: null,
    next: [],
  });

  const [time, setTime] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(true);

  const [voiceActive, setVoiceActive] = useState(() => {
    return sessionStorage.getItem("voice_active") === "true";
  });

  const [calledFlash, setCalledFlash] = useState(false);

  const lastCallId = useRef(null);
  const flashTimeoutRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await apiClient.get("/queue/tv");

      setData({
        event: response.data?.event || null,
        current: response.data?.current || null,
        next: Array.isArray(response.data?.next)
          ? response.data.next
          : [],
      });
    } catch (error) {
      console.error("Gagal mengambil data TV antrean:", error);
    }
  };

  const convertQueueCodeToSpeech = (code) => {
    if (!code) return "";

    const characterMap = {
      0: "nol",
      1: "satu",
      2: "dua",
      3: "tiga",
      4: "empat",
      5: "lima",
      6: "enam",
      7: "tujuh",
      8: "delapan",
      9: "sembilan",
    };

    return String(code)
      .toUpperCase()
      .split("")
      .filter((character) => character !== "-" && character !== " ")
      .map((character) => characterMap[character] || character)
      .join(" ");
  };

  const speakQueueCode = (code) => {
    if (!code || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const readableCode = convertQueueCodeToSpeech(code);

    const utterance = new SpeechSynthesisUtterance(
      `Nomor antrean ${readableCode}, silakan menuju Kasir.`
    );

    utterance.lang = "id-ID";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(
      (voice) =>
        voice.lang?.toLowerCase() === "id-id" ||
        voice.lang?.toLowerCase().startsWith("id")
    );

    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const speakTest = () => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      "Tes suara antrean pembayaran berhasil."
    );

    utterance.lang = "id-ID";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(
      (voice) =>
        voice.lang?.toLowerCase() === "id-id" ||
        voice.lang?.toLowerCase().startsWith("id")
    );

    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const triggerCallAnimation = () => {
    setCalledFlash(false);

    requestAnimationFrame(() => {
      setCalledFlash(true);
    });

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    flashTimeoutRef.current = setTimeout(() => {
      setCalledFlash(false);
    }, 2000);
  };

  useEffect(() => {
    fetchData();

    const clockTimer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    const refreshTimer = setInterval(() => {
      fetchData();
    }, 5000);

    const socket = getSocket();

    setSocketConnected(socket.connected);

    const onConnect = () => {
      setSocketConnected(true);
      fetchData();
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onQueueCalled = (payload) => {
      fetchData();

      if (!payload?.callId) return;
      if (payload.callId === lastCallId.current) return;

      lastCallId.current = payload.callId;

      triggerCallAnimation();

      const isVoiceEnabled =
        sessionStorage.getItem("voice_active") === "true";

      if (isVoiceEnabled) {
        speakQueueCode(
          payload.queueCode ||
          payload.paymentQueueCode ||
          payload.payment_queue_code,
        );
      }
    };

    const onQueueTestVoice = () => {
      const isVoiceEnabled =
        sessionStorage.getItem("voice_active") === "true";

      if (isVoiceEnabled) {
        speakTest();
      }
    };

    const onGeneralUpdate = () => {
      fetchData();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("queue:called", onQueueCalled);
    socket.on("payment-queue:called", onQueueCalled);
    socket.on("payment-queue:recalled", onQueueCalled);

    socket.on("queue:test-voice", onQueueTestVoice);
    socket.on("payment-queue:test-voice", onQueueTestVoice);

    socket.on("queue_updated", onGeneralUpdate);
    socket.on("queue:updated", onGeneralUpdate);
    socket.on("payment-queue:updated", onGeneralUpdate);
    socket.on("payment:verified", onGeneralUpdate);
    socket.on("queue:finished", onGeneralUpdate);
    socket.on("queue:skipped", onGeneralUpdate);
    socket.on("tv:refresh", onGeneralUpdate);

    return () => {
      clearInterval(clockTimer);
      clearInterval(refreshTimer);

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);

      socket.off("queue:called", onQueueCalled);
      socket.off("payment-queue:called", onQueueCalled);
      socket.off("payment-queue:recalled", onQueueCalled);

      socket.off("queue:test-voice", onQueueTestVoice);
      socket.off("payment-queue:test-voice", onQueueTestVoice);

      socket.off("queue_updated", onGeneralUpdate);
      socket.off("queue:updated", onGeneralUpdate);
      socket.off("payment-queue:updated", onGeneralUpdate);
      socket.off("payment:verified", onGeneralUpdate);
      socket.off("queue:finished", onGeneralUpdate);
      socket.off("queue:skipped", onGeneralUpdate);
      socket.off("tv:refresh", onGeneralUpdate);
    };
  }, []);

  const handleActivateVoice = () => {
    sessionStorage.setItem("voice_active", "true");
    setVoiceActive(true);

    setTimeout(() => {
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        "Suara antrean telah aktif."
      );

      utterance.lang = "id-ID";
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(
        (voice) =>
          voice.lang?.toLowerCase() === "id-id" ||
          voice.lang?.toLowerCase().startsWith("id")
      );

      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      }

      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const timeText = time.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateText = time.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const footerText =
    "Silakan menunggu hingga nomor Anda dipanggil untuk melakukan pembayaran di Kasir.";

  const displayCode = data.current
    ? data.current.payment_queue_code ||
    data.current.queue_code ||
    data.current.receipt_number ||
    "-"
    : null;

  const currentParticipantName =
    data.current?.participant_name ||
    data.current?.participantName ||
    "";

  if (!data.event) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-950 text-white"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div className="space-y-4 px-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800">
            <svg
              className="h-12 w-12 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
            TIDAK ADA EVENT AKTIF
          </h1>

          <p className="text-lg text-slate-400 lg:text-xl">
            Silakan aktifkan event dari halaman Owner atau Kasir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!voiceActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="rounded-3xl bg-slate-900 p-8 text-center shadow-2xl max-w-md border border-slate-800">
            <h2 className="mb-3 text-2xl font-black text-white">Aktifkan Suara Antrean</h2>
            <p className="mb-8 text-slate-400">
              Tekan tombol di bawah satu kali agar TV dapat mengeluarkan suara panggilan.
            </p>
            <button
              onClick={handleActivateVoice}
              className="rounded-xl bg-indigo-600 px-8 py-4 font-black tracking-wide text-white transition-all hover:bg-indigo-500 hover:scale-105"
            >
              Aktifkan Suara
            </button>
          </div>
        </div>
      )}
      <div
        className="fixed inset-0 select-none overflow-hidden"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: "#0f172a",
        }}
      >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

        @keyframes flashIn {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }

          45% {
            opacity: 1;
            transform: scale(1.025);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes marqueeScroll {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        .tv-call-animation {
          animation: flashIn 0.55s ease-out forwards;
        }

        .tv-marquee-wrapper {
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          overflow: hidden;
          white-space: nowrap;
        }

        .tv-marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          white-space: nowrap;
          animation: marqueeScroll 35s linear infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .tv-call-animation,
          .tv-marquee-track {
            animation: none;
          }
        }
      `}</style>

      {!voiceActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/20">
              <svg
                className="h-10 w-10 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072M12 9a3 3 0 000 6m0 0v3m0-3H9m3 0h3m-3-9V3"
                />
              </svg>
            </div>

            <h2 className="mb-2 text-3xl font-black text-white">
              Aktifkan Suara
            </h2>

            <p className="mb-8 text-sm leading-relaxed text-slate-400">
              Tekan tombol di bawah satu kali agar perangkat TV dapat
              mengeluarkan suara panggilan antrean.
            </p>

            <button
              type="button"
              onClick={handleActivateVoice}
              className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-black text-white transition hover:bg-indigo-500 active:scale-95"
            >
              Aktifkan Suara Antrean
            </button>
          </div>
        </div>
      )}

      <div className="flex h-screen flex-col">
        {/* HEADER */}
        <header
          className="flex shrink-0 items-center justify-between px-8 lg:px-10"
          style={{
            height: "11vh",
            background: "#1e293b",
            borderBottom: "1px solid #334155",
          }}
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              {data.event.name}
            </p>

            <h1 className="truncate text-xl font-black leading-tight tracking-tight text-white lg:text-2xl">
              Silahkan Menuju Meja Pendaftaran/Kasir
            </h1>
          </div>

          <div className="ml-6 flex shrink-0 items-center gap-6">
            {!socketConnected && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
                <WifiOff size={14} />
                Realtime terputus
              </div>
            )}

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400">
                {dateText}
              </p>

              <p className="font-mono text-xl font-black tracking-wider text-white lg:text-2xl">
                {timeText}
              </p>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {/* CURRENT QUEUE */}
          <section
            className="flex min-w-0 flex-col items-center justify-center px-8"
            style={{
              width: "68%",
              borderRight: "1px solid #1e293b",
            }}
          >

            {displayCode ? (
              <div
                className={`w-full text-center ${calledFlash ? "tv-call-animation" : ""
                  }`}
              >
                <div
                  className="w-full whitespace-nowrap font-mono font-black leading-none"
                  style={{
                    fontSize: "clamp(4rem, 9vw, 8rem)",
                    color: "#ffffff",
                    letterSpacing: "0.03em",
                    lineHeight: 0.95,
                    textShadow:
                      "0 0 45px rgba(99,102,241,0.32), 0 0 100px rgba(99,102,241,0.12)",
                  }}
                >
                  {displayCode}
                </div>

                {currentParticipantName && (
                  <div
                    className="mx-auto mt-5 max-w-[85%] truncate px-4 font-black uppercase tracking-wide"
                    style={{
                      fontSize: "clamp(1.2rem, 2.2vw, 2rem)",
                      color: "#94a3b8",
                    }}
                  >
                    {currentParticipantName}
                  </div>
                )}

                <div
                  className="mt-6 inline-block rounded-full px-7 py-3 text-sm font-black uppercase tracking-widest"
                  style={{
                    background: "#1e293b",
                    color: "#818cf8",
                    border: "1px solid #312e81",
                  }}
                >
                  Silakan menuju Kasir untuk pembayaran
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div
                  className="font-mono font-black"
                  style={{
                    fontSize: "clamp(3rem, 7vw, 6rem)",
                    color: "#1e293b",
                    letterSpacing: "0.08em",
                  }}
                >
                  — — —
                </div>

                <p
                  className="mt-4 font-bold uppercase tracking-widest"
                  style={{
                    fontSize: "clamp(1rem, 2vw, 1.6rem)",
                    color: "#334155",
                  }}
                >
                  Menunggu Panggilan
                </p>
              </div>
            )}
          </section>

          {/* NEXT QUEUE */}
          <aside
            className="flex min-w-0 flex-col"
            style={{
              width: "32%",
              background: "#0f172a",
            }}
          >
            <div
              className="shrink-0 px-5 py-4 lg:px-6"
              style={{
                borderBottom: "1px solid #1e293b",
              }}
            >
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                Antrean Berikutnya
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {data.next.length > 0 ? (
                data.next.slice(0, 6).map((item, index) => {
                  const code =
                    item.payment_queue_code ||
                    item.queue_code ||
                    item.receipt_number ||
                    "-";

                  const participantName =
                    item.participant_name ||
                    item.participantName ||
                    "";

                  return (
                    <div
                      key={item.id || `${code}-${index}`}
                      className="flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 lg:gap-4 lg:px-5 lg:py-4"
                      style={{
                        background: "#1e293b",
                      }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                        style={{
                          background: "#0f172a",
                          color: "#64748b",
                        }}
                      >
                        {index + 1}
                      </div>

                      <div
                        className="shrink-0 whitespace-nowrap font-mono font-black"
                        style={{
                          fontSize: "clamp(1.15rem, 2vw, 1.8rem)",
                          color: "#e2e8f0",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {code}
                      </div>

                      <div
                        className="min-w-0 flex-1 truncate text-right font-semibold uppercase"
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748b",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {participantName}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center px-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                    Belum ada antrean berikutnya
                  </p>
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* FOOTER */}
        <footer
          className="flex shrink-0 items-center overflow-hidden"
          style={{
            height: "7vh",
            background: "#4f46e5",
          }}
        >
          <div className="tv-marquee-wrapper">
            <div className="tv-marquee-track">
              {[...Array(2)].flatMap((_, groupIndex) =>
                Array(6)
                  .fill(footerText)
                  .map((text, index) => (
                    <span
                      key={`${groupIndex}-${index}`}
                      className="shrink-0 whitespace-nowrap px-12 font-bold uppercase tracking-[0.12em] lg:px-16"
                      style={{
                        fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
                        color: "#c7d2fe",
                      }}
                    >
                      {text}
                      <span className="mx-8 opacity-50">◆</span>
                    </span>
                  )),
              )}
            </div>
          </div>
        </footer>
      </div>
      </div>
    </>
  );
};

export default TvAntrian;