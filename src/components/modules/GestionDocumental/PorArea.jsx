// src/components/modules/GestionDocumental/PorArea.jsx

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDocuments, useProcesses } from '@/hooks/useDocuments';
import { useFileDownload } from '@/hooks/useFileDownload';
import DocumentViewerModal from './DocumentViewerModal';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { FileText, Eye, Download, X, ChevronLeft, Loader2 } from 'lucide-react';

const PROCESS_CONFIG = {
  'DP': { shortName: 'Dirección',     color: '#2e5244', gradient: 'from-[#2e5244] to-[#1a3028]', image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop' },
  'GS': { shortName: 'Calidad y SST', color: '#6dbd96', gradient: 'from-[#6dbd96] to-[#4a9c73]', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop' },
  'GC': { shortName: 'Clientes',      color: '#6f7b2c', gradient: 'from-[#6f7b2c] to-[#4d541e]', image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop' },
  'GP': { shortName: 'Producción',    color: '#2e5244', gradient: 'from-[#2e5244] to-[#1a3028]', image: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400&h=300&fit=crop' },
  'GR': { shortName: 'Proveedores',   color: '#6dbd96', gradient: 'from-[#6dbd96] to-[#4a9c73]', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop' },
  'GH': { shortName: 'Talento Humano',color: '#6f7b2c', gradient: 'from-[#6f7b2c] to-[#4d541e]', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=300&fit=crop' },
  'GA': { shortName: 'Administrativa',color: '#2e5244', gradient: 'from-[#2e5244] to-[#1a3028]', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop' },
};

const DOC_CATEGORIES = [
  { code: 'FO', label: 'Formatos',       emoji: '📋' },
  { code: 'IN', label: 'Instructivos',   emoji: '📘' },
  { code: 'PR', label: 'Procedimientos', emoji: '📑' },
  { code: 'GU', label: 'Guías',          emoji: '📖' },
  { code: 'MN', label: 'Manuales',       emoji: '📚' },
  { code: 'RE', label: 'Registros',      emoji: '📝' },
];

export default function PorArea() {
  const [selectedProcess,  setSelectedProcess]  = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredId,        setHoveredId]        = useState(null);
  const [documentToView,   setDocumentToView]   = useState(null);
  const [isViewerModalOpen,setIsViewerModalOpen] = useState(false);

  const { documents = [], loading } = useDocuments({});
  const { processes = [] }          = useProcesses();
  const { downloadDocument, downloading } = useFileDownload();

  const groupedData = useMemo(() => {
    const grouped = {};
    processes.filter(p => p.is_active).forEach(proc => {
      const config = PROCESS_CONFIG[proc.code];
      if (!config) return;
      grouped[proc.code] = {
        id: proc.id, code: proc.code,
        shortName: config.shortName, color: config.color,
        gradient: config.gradient,   image: config.image,
        categories: {}, totalDocs: 0,
      };
    });
    documents.forEach(doc => {
      const proc = processes.find(p => p.id === doc.process_id);
      if (!proc || !grouped[proc.code]) return;
      const typeCode = doc.document_type?.code || doc.document_type_code;
      if (!typeCode) return;
      if (!grouped[proc.code].categories[typeCode]) {
        const category = DOC_CATEGORIES.find(c => c.code === typeCode);
        grouped[proc.code].categories[typeCode] = {
          code: typeCode,
          label: category?.label || typeCode,
          emoji: category?.emoji || '📄',
          documents: [],
        };
      }
      grouped[proc.code].categories[typeCode].documents.push(doc);
      grouped[proc.code].totalDocs++;
    });
    return grouped;
  }, [documents, processes]);

  const processArray = Object.values(groupedData);
  const angleStep    = (2 * Math.PI) / (processArray.length || 1);

  const handleViewDocument = (doc) => {
    setDocumentToView(doc);
    setIsViewerModalOpen(true);
  };

  const handleDownload = async (doc) => {
    await downloadDocument(doc);
  };

  // ── DocumentCard ─────────────────────────────────────────────────────────
  const DocumentCard = ({ doc }) => {
    const pd = processArray.find(p => p.id === doc.process_id);
    return (
      <motion.div
        className="group flex items-center gap-2 p-2 rounded-lg border bg-white hover:shadow-md transition-all"
        style={{ borderColor: pd?.color || '#6dbd96' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${pd?.color}20` }}>
          <FileText className="h-4 w-4" style={{ color: pd?.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono font-bold" style={{ color: pd?.color }}>{doc.code}</span>
            <Badge variant="secondary" className="text-xs py-0 h-4">v{doc.version || 1}</Badge>
          </div>
          <p className="text-xs font-medium text-gray-900 truncate">{doc.name}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}
            disabled={!doc.file_path} className="h-7 w-7 p-0">
            <Eye className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}
            disabled={downloading === doc.id || !doc.file_path} className="h-7 w-7 p-0">
            {downloading === doc.id
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Download className="h-3 w-3" />}
          </Button>
        </div>
      </motion.div>
    );
  };

  // ── VISTA PRINCIPAL — órbita ──────────────────────────────────────────────
  if (!selectedProcess) {
    const rXpct = 35;
    const rYpct = 32;
    const cy    = 40; // centro en 44% → contenido más arriba

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 560,
          overflow: 'hidden',
          borderRadius: 40,
          background: 'linear-gradient(135deg, #3a6b56 0%, #4a8a6e 45%, #3d7060 100%)',
        }}
      >
        {/* Patrón puntos */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12, pointerEvents: 'none' }}>
          <defs>
            <pattern id="area-dots" x="0" y="0" width="38" height="38" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#a8dfc0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#area-dots)" />
        </svg>

        {/* Anillos orbitales */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          preserveAspectRatio="xMidYMid meet">
          <ellipse cx="50%" cy="285px" rx="42%" ry="34%"
            fill="none" stroke="#a8dfc0" strokeWidth="1" strokeDasharray="6 4" opacity="0.30" />
          <ellipse cx="50%" cy="275px" rx="24%" ry="20%"
            fill="none" stroke="#a8dfc0" strokeWidth="1" strokeDasharray="4 6" opacity="0.18" />
          <ellipse cx="50%" cy="265px" rx="11%" ry="9%"
            fill="none" stroke="#a8dfc0" strokeWidth="1" opacity="0.12" />
        </svg>

        {/* Glows */}
        <div style={{ position: 'absolute', top: '5%', left: '4%', width: 200, height: 200, borderRadius: '50%', background: '#6dbd96', opacity: 0.08, filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '4%', width: 240, height: 240, borderRadius: '50%', background: '#6dbd96', opacity: 0.07, filter: 'blur(90px)', pointerEvents: 'none' }} />

        {/* Órbita */}
        <div style={{ position: 'relative', width: '100%', minHeight: 560 }}>

          {/* Centro: logo */}
          <motion.div
            style={{ position: 'absolute', left: '360px', top: '180px', transform: 'translate(-50%, -50%)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
          >
            <motion.div
              style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,223,192,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img
              src="/garana1.png"
              alt="Garana Art"
              style={{ width: 350, height: 180, filter: 'brightness(0) invert(1)', opacity: 0.85, position: 'relative', zIndex: 1 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Cards */}
          {processArray.map((process, index) => {
            const angle   = index * angleStep - Math.PI / 2;
            const leftPct = 50 + Math.cos(angle) * rXpct;
            const topPct  = cy + Math.sin(angle) * rYpct;

            return (
              <motion.div
                key={process.code}
                style={{ position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)', zIndex: 10, cursor: 'pointer' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1, type: 'spring', stiffness: 120 }}
                whileHover={{ scale: 1.12, zIndex: 50 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedProcess(process.code)}
                onMouseEnter={() => setHoveredId(process.code)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Glow hover */}
                <motion.div
                  style={{ position: 'absolute', inset: 0, borderRadius: 12, backgroundColor: process.color, filter: 'blur(16px)', opacity: hoveredId === process.code ? 0.5 : 0, pointerEvents: 'none' }}
                  transition={{ duration: 0.25 }}
                />
                {/* Card */}
                <div style={{
                  position: 'relative', width: 96, height: 96, borderRadius: 12, overflow: 'hidden',
                  border: `2px solid ${hoveredId === process.code ? 'rgba(255,255,255,0.7)' : process.color + 'aa'}`,
                  background: `linear-gradient(135deg, ${process.color}ee, ${process.color}99)`,
                  boxShadow: `0 6px 24px ${process.color}55`,
                  transition: 'border-color 0.2s',
                }}>
                  <img src={process.image} alt={process.shortName}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${process.color}cc, ${process.color}88)` }} />
                  <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 1, padding: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{process.code}</span>
                    </div>
                    <span style={{ color: 'white', fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>{process.shortName}</span>
                    {process.totalDocs > 0 && (
                      <span style={{ fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', color: 'white' }}>
                        {process.totalDocs} docs
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 4, height: 4, borderRadius: '50%', background: 'white', opacity: 0.5 }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 6, width: 4, height: 4, borderRadius: '50%', background: 'white', opacity: 0.3 }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tip */}
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Selecciona un proceso para ver sus documentos
          </span>
        </div>

        {loading && (
          <motion.div
            style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'rgba(58,107,86,0.88)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div style={{ textAlign: 'center' }}>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: '#a8dfc0' }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Cargando procesos...</p>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // ── VISTA CATEGORÍAS ──────────────────────────────────────────────────────
  const processData = groupedData[selectedProcess];

  if (!selectedCategory) {
    return (
      <>
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setSelectedProcess(null)}
        />
        <motion.div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2" style={{ borderColor: processData.color }}>
            <div className="relative h-24 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${processData.color}dd, ${processData.color})` }}>
              <div className="text-center relative z-10">
                <h3 className="text-white text-lg font-bold px-4">{processData.shortName}</h3>
                <p className="text-white/90 text-sm mt-1">{processData.totalDocs} documentos</p>
              </div>
              <motion.button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30"
                whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedProcess(null)}
              >
                <X size={18} />
              </motion.button>
            </div>
            <div className="p-4 space-y-2">
              {Object.values(processData.categories).map((category, index) => (
                <motion.button
                  key={category.code}
                  className="w-full py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all flex items-center justify-between px-4 border border-gray-200"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ scale: 1.02, borderColor: processData.color }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCategory(category.code)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.emoji}</span>
                    <span className="font-semibold text-sm">{category.label}</span>
                  </div>
                  <Badge style={{ backgroundColor: processData.color, color: 'white' }}>
                    {category.documents.length}
                  </Badge>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  // ── VISTA DOCUMENTOS ──────────────────────────────────────────────────────
  const categoryData = processData.categories[selectedCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dedecc] via-[#f0f0e8] to-white p-3">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}
            className="gap-1 h-8" style={{ color: processData.color }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">{processData.shortName}</span>
            <span className="text-gray-400">›</span>
            <span className="text-lg">{categoryData.emoji}</span>
            <span className="font-semibold" style={{ color: processData.color }}>{categoryData.label}</span>
          </div>
        </div>

        <div className="space-y-2">
          {categoryData.documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>

        {documentToView && (
          <DocumentViewerModal
            isOpen={isViewerModalOpen}
            onClose={() => { setIsViewerModalOpen(false); setDocumentToView(null); }}
            document={documentToView}
          />
        )}
      </div>
    </div>
  );
}