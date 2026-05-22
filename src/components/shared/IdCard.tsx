import React, { useRef, useState } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Button } from '@/src/components/ui/Button';
import { Download, Building, MapPin, Smartphone, User } from 'lucide-react';

interface IdCardProps {
  companyName: string;
  ownerName?: string;
  entityId: string;
  address?: string;
  phone?: string;
  className?: string;
}

export function IdCard({ companyName, ownerName, entityId, address, phone, className }: IdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Dynamic imports — jspdf + html2canvas are ~120 KB, loaded only on click
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${companyName.replace(/\s+/g, '_')}_ID_Card.pdf`);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        ref={cardRef}
        className="bg-white p-6 rounded-2xl shadow-lg border border-[rgba(60,60,67,0.08)] w-full max-w-sm flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md z-10 mt-4 mb-3 border-4 border-white flex items-center justify-center text-emerald-600">
          <Building className="w-10 h-10" />
        </div>
        <h3 className="font-bold text-xl text-slate-900 mb-1">{companyName}</h3>
        {ownerName && <p className="text-sm font-medium text-slate-500 mb-4">{ownerName}</p>}
        <div className="w-full space-y-2 mb-6 text-left bg-slate-50 p-3 rounded-lg border border-slate-100">
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 leading-tight">{address}</p>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600">{phone}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-600 font-mono">ID: {entityId}</p>
          </div>
        </div>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={handleDownload}
        iconLeft={Download}
        disabled={downloading}
        loading={downloading}
        className="mt-6 w-full"
      >
        {downloading ? 'Generating PDF...' : 'Download PDF'}
      </Button>
    </div>
  );
}