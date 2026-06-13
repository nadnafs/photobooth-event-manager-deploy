import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ParticipantCategoryTab from '../../components/master/ParticipantCategoryTab';
import ProductCategoryTab from '../../components/master/ProductCategoryTab';
import ProductTab from '../../components/master/ProductTab';
import BoothTab from '../../components/master/BoothTab';
import PrintSettingsTab from './components/PrintSettingsTab';
import ReceiptSettingsTab from './components/ReceiptSettingsTab';

const DetailEvent = () => {
  const { id: eventId } = useParams();
  const [activeTab, setActiveTab] = useState('peserta');

  const tabs = [
    { id: 'peserta', name: 'Kategori Peserta' },
    { id: 'kategori_produk', name: 'Kategori Produk' },
    { id: 'produk', name: 'Produk / Layanan' },
    { id: 'booth', name: 'Booth / Layar' },
    { id: 'cetak', name: 'Pengaturan Cetak' },
    { id: 'nota', name: 'Pengaturan Nomor Nota' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/kasir/events" className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20}/></Link>
        <h1 className="text-2xl font-bold text-textMain">Pengaturan Detail Event</h1>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textMain hover:bg-slate-50'}`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === 'peserta' && <ParticipantCategoryTab eventId={eventId} />}
          {activeTab === 'kategori_produk' && <ProductCategoryTab eventId={eventId} />}
          { activeTab === 'produk' && <ProductTab eventId={eventId} /> }
          { activeTab === 'booth' && <BoothTab eventId={eventId} /> }
          { activeTab === 'cetak' && <PrintSettingsTab eventId={eventId} /> }
          { activeTab === 'nota' && <ReceiptSettingsTab eventId={eventId} /> }
        </div>
      </div>
    </div>
  );
};

export default DetailEvent;
