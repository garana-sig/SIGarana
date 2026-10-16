// src/components/modules/GestionDocumental/PorArea.jsx

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDocuments, useProcesses } from '@/hooks/useDocuments';
import { useFileDownload } from '@/hooks/useFileDownload';
import DocumentViewerModal from './DocumentViewerModal';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { FileText, Eye, Download, X, ChevronLeft, Loader2 } from 'lucide-react';

// 🆕 Sin imágenes externas; color + tono oscuro para el degradado del nodo
const PROCESS_CONFIG = {
  'DP': { shortName: 'Dirección',           color: '#2e5244', colorDark: '#1a3028' },
  'GS': { shortName: 'Calidad y SST',       color: '#6dbd96', colorDark: '#3f8a66' },
  'GC': { shortName: 'Clientes',            color: '#8a9a36', colorDark: '#4d541e' },
  'GP': { shortName: 'Producción',          color: '#3a6b56', colorDark: '#1f3d31' },
  'GR': { shortName: 'Proveedores',         color: '#4a9c73', colorDark: '#2c6a4b' },
  'GH': { shortName: 'Talento Humano',      color: '#6f7b2c', colorDark: '#454d1a' },
  'GF': { shortName: 'Admin. y Financiera', color: '#2e5244', colorDark: '#162a22' },
};
const DEFAULT_PROCESS_STYLE = { color: '#3a6b56', colorDark: '#1f3d31' };

// Mismo orden que los tipos de documento del tablero
const DOC_CATEGORIES = [
  { code: 'MN', label: 'Manuales',       emoji: '📚' },
  { code: 'PR', label: 'Procedimientos', emoji: '📑' },
  { code: 'IN', label: 'Instructivos',   emoji: '📘' },
  { code: 'GU', label: 'Guías',          emoji: '📖' },
  { code: 'RE', label: 'Registros',      emoji: '📝' },
  { code: 'PL', label: 'Planes',         emoji: '🗓️' },
  { code: 'FO', label: 'Formatos',       emoji: '📋' },
];
const categoryOrder = (code) => {
  const i = DOC_CATEGORIES.findIndex(c => c.code === code);
  return i === -1 ? 99 : i;
};

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
      // 🆕 Procesos nuevos (sin config) también aparecen, con estilo por defecto
      const config = PROCESS_CONFIG[proc.code] || { ...DEFAULT_PROCESS_STYLE, shortName: proc.name };
      grouped[proc.code] = {
        id: proc.id, code: proc.code, name: proc.name,
        shortName: config.shortName, color: config.color, colorDark: config.colorDark,
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

  const handleViewDocument = (doc) => {
    setDocumentToView(doc);
    setIsViewerModalOpen(true);
  };

  const handleDownload = async (doc) => {
    await downloadDocument(doc);
  };

  // ── DocumentCard ─────────────────────────────────────────────────────────
  // 🆕 Toda la tarjeta es clicable y abre el documento directamente (antes
  // solo funcionaba el ícono pequeño del ojo). Los botones internos usan
  // stopPropagation para no disparar el click de la tarjeta dos veces.
  const DocumentCard = ({ doc }) => {
    const pd = processArray.find(p => p.id === doc.process_id);
    const openable = Boolean(doc.file_path);
    return (
      <motion.div
        className={`group flex items-center gap-2 p-2 rounded-lg border bg-white hover:shadow-md transition-all ${
          openable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
        }`}
        style={{ borderColor: pd?.color || '#6dbd96' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: openable ? 1.01 : 1 }}
        onClick={() => openable && handleViewDocument(doc)}
        role="button"
        tabIndex={openable ? 0 : -1}
        onKeyDown={(e) => {
          if (openable && (e.key === 'Enter' || e.key === ' ')) handleViewDocument(doc);
        }}
        title={openable ? `Abrir ${doc.name}` : 'Archivo no disponible'}
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
          <Button variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); handleViewDocument(doc); }}
            disabled={!doc.file_path} className="h-7 w-7 p-0">
            <Eye className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
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
  // 🆕 Rediseño: TODO (anillos, líneas, logo y procesos) usa el mismo sistema
  // de coordenadas en % del contenedor, así el centro y la elipse nunca se
  // desfasan. SVG con viewBox 0..100 + preserveAspectRatio="none" = mismos %.
  if (!selectedProcess) {
    const CX = 50, CY = 50;   // centro (en %)
    const RX = 38, RY = 36;   // radios de la elipse donde van los procesos (en %)
    const n  = processArray.length || 1;
    const nodes = processArray.map((process, index) => {
      const angle = (index / n) * 2 * Math.PI - Math.PI / 2; // primero arriba
      return { process, x: CX + Math.cos(angle) * RX, y: CY + Math.sin(angle) * RY };
    });

    const ProcessNode = ({ process, compact = false }) => {
      const isHover = hoveredId === process.code;
      const size = compact ? 92 : 104;
      return (
        <div style={{ position: 'relative' }}>
          {/* Glow hover */}
          <div style={{
            position: 'absolute', inset: -6, borderRadius: '50%', backgroundColor: process.color,
            filter: 'blur(14px)', opacity: isHover ? 0.55 : 0, transition: 'opacity 0.25s', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'relative', width: size, height: size, borderRadius: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            background: `radial-gradient(circle at 30% 25%, ${process.color}, ${process.colorDark})`,
            border: `2px solid ${isHover ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'}`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)`,
            transition: 'border-color 0.2s', padding: 8, textAlign: 'center',
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '0.04em' }}>{process.code}</span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.95)', lineHeight: 1.15 }}>
              {process.shortName}
            </span>
            <span style={{
              fontSize: 8.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
              background: 'rgba(255,255,255,0.22)', color: 'white', marginTop: 1,
            }}>
              {process.totalDocs} docs
            </span>
          </div>
        </div>
      );
    };

    const CenterLogo = ({ size = 210 }) => (
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Anillo giratorio */}
        <motion.div
          style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1.5px dashed rgba(168,223,192,0.55)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        />
        {/* Halo */}
        <motion.div
          style={{ position: 'absolute', inset: -30, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,223,192,0.25) 0%, transparent 70%)', pointerEvents: 'none' }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Disco central */}
        <div style={{
          position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
          border: '1.5px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          {/* La imagen tiene mucho margen: se recorta con overflow para que el logo se vea grande */}
          <div style={{ width: size * 0.8, height: size * 0.46, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/garana1.png" alt="Garana"
              style={{ width: size * 1.3, maxWidth: 'none', height: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          </div>
          <span style={{ fontSize: size * 0.13, fontWeight: 800, color: 'white', letterSpacing: '0.18em', lineHeight: 1 }}>SIG</span>
          <span style={{ fontSize: Math.max(8, size * 0.045), color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Sistema Integrado de Gestión
          </span>
        </div>
      </div>
    );

    const openProcess = (code) => setSelectedProcess(code);

    return (
      <div style={{
        position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 32,
        background: 'linear-gradient(135deg, #2f5a48 0%, #3f7a62 50%, #2f5a48 100%)',
      }}>
        {/* Patrón de puntos */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12, pointerEvents: 'none' }}>
          <defs>
            <pattern id="area-dots" x="0" y="0" width="34" height="34" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#a8dfc0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#area-dots)" />
        </svg>

        {/* ── Escritorio / tablet: órbita ── */}
        <div className="hidden md:block" style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', minHeight: 540, maxHeight: 720 }}>

          {/* Elipses + líneas (mismos % que los nodos) */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <ellipse cx={CX} cy={CY} rx={RX + 6} ry={RY + 6} fill="none" stroke="#a8dfc0" strokeOpacity="0.12"
              strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#a8dfc0" strokeOpacity="0.45"
              strokeWidth="1.5" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
            <ellipse cx={CX} cy={CY} rx={RX * 0.55} ry={RY * 0.55} fill="none" stroke="#a8dfc0" strokeOpacity="0.15"
              strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {nodes.map(({ process, x, y }) => (
              <line key={process.code} x1={CX} y1={CY} x2={x} y2={y}
                stroke={hoveredId === process.code ? '#ffffff' : '#a8dfc0'}
                strokeOpacity={hoveredId === process.code ? 0.7 : 0.18}
                strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {/* Centro */}
          <motion.div
            style={{ position: 'absolute', left: `${CX}%`, top: `${CY}%`, x: '-50%', y: '-50%', zIndex: 20 }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, type: 'spring' }}
          >
            <CenterLogo size={210} />
          </motion.div>

          {/* Procesos sobre la elipse */}
          {nodes.map(({ process, x, y }, index) => (
            <motion.div
              key={process.code}
              style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%', zIndex: 10, cursor: 'pointer' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.08, type: 'spring', stiffness: 120 }}
              whileHover={{ scale: 1.1, zIndex: 50 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openProcess(process.code)}
              onMouseEnter={() => setHoveredId(process.code)}
              onMouseLeave={() => setHoveredId(null)}
              title={process.name}
            >
              <ProcessNode process={process} />
            </motion.div>
          ))}

          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              Selecciona un proceso para ver sus documentos
            </span>
          </div>
        </div>

        {/* ── Celular: logo arriba + cuadrícula ── */}
        <div className="md:hidden" style={{ position: 'relative', padding: '28px 16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <CenterLogo size={160} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 14, justifyItems: 'center' }}>
            {processArray.map(process => (
              <motion.div key={process.code} whileTap={{ scale: 0.95 }} style={{ cursor: 'pointer' }}
                onClick={() => openProcess(process.code)}>
                <ProcessNode process={process} compact />
              </motion.div>
            ))}
          </div>
        </div>

        {loading && (
          <motion.div
            style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(47,90,72,0.88)', backdropFilter: 'blur(6px)' }}
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
              {Object.values(processData.categories)
                .sort((a, b) => categoryOrder(a.code) - categoryOrder(b.code))
                .map((category, index) => (
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