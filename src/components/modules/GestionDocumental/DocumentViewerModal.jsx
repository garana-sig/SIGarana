// src/components/modules/GestionDocumental/DocumentViewerModal.jsx
// ═══════════════════════════════════════════════════════════════════
// Modal para visualizar documentos (PDF, Word, Excel, PowerPoint)
// v2 (oct 2026):
//   - Word / Excel / PowerPoint → Microsoft Office Online Viewer
//     (view.officeapps.live.com). Reemplaza a Google Docs Viewer, que
//     dejaba los Excel en blanco. Soporta .xls/.xlsx, celdas combinadas,
//     logos y varias hojas. Límites de Microsoft: Excel ≈ 5 MB, Word/PPT ≈ 10 MB.
//   - Excel → respaldo "Vista de datos" dentro de la app con SheetJS
//     (sin servicios externos). Se activa sola si el archivo supera el
//     límite de Microsoft, o con el botón si el visor no carga.
//   - Word / PPT → respaldo con Google Docs Viewer.
//   - PDF → visor nativo del navegador (sin cambios).
// Usado en: Procedimientos.jsx, PorArea.jsx, Home.jsx (props sin cambios).
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, Loader2, AlertCircle, Table2, MonitorPlay, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', amber: '#d97706' };

// Límites aproximados del visor de Microsoft (bytes)
const LIMITE_MS = { excel: 5 * 1024 * 1024, word: 10 * 1024 * 1024, powerpoint: 10 * 1024 * 1024 };
const SEG_AVISO = 15; // si el visor no termina de cargar en 15 s, se sugiere el respaldo

function getFileType(path) {
  if (!path) return 'unknown';
  const ext = path.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'xlsm'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
  return 'unknown';
}

const DocumentViewerModal = ({ document, isOpen, onClose }) => {
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [modo, setModo]           = useState('microsoft'); // microsoft | google | datos | nativo | ninguno
  const [iframeOk, setIframeOk]   = useState(false);
  const [lento, setLento]         = useState(false);
  const [tamano, setTamano]       = useState(null);

  // Vista de datos (SheetJS)
  const [hojas, setHojas]           = useState(null);   // [{ nombre, html }]
  const [hojaActiva, setHojaActiva] = useState(0);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState(null);

  const timerRef = useRef(null);
  const fileType = getFileType(document?.file_path);

  // ── Al abrir: URL firmada + tamaño + modo inicial ─────────────────
  useEffect(() => {
    if (isOpen && document?.file_path) loadDocument();
    return () => {
      clearTimeout(timerRef.current);
      setSignedUrl(null); setError(null); setLoading(true);
      setHojas(null); setHojaActiva(0); setErrorDatos(null);
      setIframeOk(false); setLento(false); setTamano(null); setModo('microsoft');
    };
  }, [isOpen, document]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600);
      if (urlError) throw urlError;
      setSignedUrl(data.signedUrl);

      // Tamaño del archivo (para saber si Microsoft lo puede mostrar)
      let size = document.file_size || null;
      if (!size) {
        try {
          const head = await fetch(data.signedUrl, { method: 'HEAD' });
          size = Number(head.headers.get('content-length')) || null;
        } catch { /* sin tamaño: se intenta igual */ }
      }
      setTamano(size);

      const tipo = getFileType(document.file_path);
      if (tipo === 'pdf') setModo('nativo');
      else if (tipo === 'unknown') setModo('ninguno');
      else if (tipo === 'excel' && size && size > LIMITE_MS.excel) setModo('datos');
      else if (['word', 'powerpoint'].includes(tipo) && size && size > LIMITE_MS[tipo]) setModo('google');
      else setModo('microsoft');
    } catch (err) {
      console.error('❌ Error cargando documento:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Aviso si el iframe tarda demasiado ────────────────────────────
  useEffect(() => {
    clearTimeout(timerRef.current);
    setIframeOk(false);
    setLento(false);
    if (signedUrl && (modo === 'microsoft' || modo === 'google')) {
      timerRef.current = setTimeout(() => setLento(true), SEG_AVISO * 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [modo, signedUrl]);

  // ── Vista de datos (Excel → tablas HTML con SheetJS) ──────────────
  useEffect(() => {
    if (modo !== 'datos' || hojas || !document?.file_path) return;
    (async () => {
      setCargandoDatos(true);
      setErrorDatos(null);
      try {
        const { data, error: dlErr } = await supabase.storage.from('documents').download(document.file_path);
        if (dlErr) throw dlErr;
        const wb = XLSX.read(await data.arrayBuffer(), { type: 'array', cellStyles: true });
        const lista = wb.SheetNames.map((nombre) => ({
          nombre,
          // sheet_to_html escapa el contenido de las celdas y respeta celdas combinadas
          html: XLSX.utils.sheet_to_html(wb.Sheets[nombre], { header: '', footer: '' }),
        }));
        setHojas(lista);
        setHojaActiva(0);
      } catch (err) {
        console.error('❌ Error leyendo Excel:', err);
        setErrorDatos('No se pudo leer el archivo. Descárgalo para abrirlo en Excel.');
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, [modo, hojas, document]);

  // ── Descargar ─────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      const { data, error: dlErr } = await supabase.storage.from('documents').download(document.file_path);
      if (dlErr) throw dlErr;
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name || document.file_path.split('/').pop();
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Error descargando archivo:', err);
      alert('Error al descargar el archivo: ' + err.message);
    }
  };

  // ── URL del visor según el modo ───────────────────────────────────
  const viewerUrl = (() => {
    if (!signedUrl) return null;
    if (modo === 'nativo') return signedUrl;
    if (modo === 'microsoft') return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
    if (modo === 'google') return `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`;
    return null;
  })();

  if (!isOpen || !document) return null;

  const esOffice = ['word', 'excel', 'powerpoint'].includes(fileType);
  const respaldo = fileType === 'excel' ? 'datos' : 'google';
  const excedeMS = tamano && LIMITE_MS[fileType] && tamano > LIMITE_MS[fileType];

  const ModoBtn = ({ id, icon: Icon, label, disabled, title }) => (
    <button
      type="button"
      onClick={() => setModo(id)}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
      style={{
        background: modo === id ? C.green : 'transparent',
        color: modo === id ? 'white' : disabled ? '#b0b0b0' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b flex-wrap" style={{ borderColor: C.sand }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-5 w-5 flex-shrink-0" style={{ color: C.mint }} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold truncate" style={{ color: C.green }}>{document.name}</h2>
              <p className="text-sm text-gray-600 truncate">
                {document.code} • v{String(document.version).padStart(2, '0')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Selector de vista (solo Office) */}
            {esOffice && !loading && !error && (
              <div className="inline-flex gap-0.5 p-0.5 rounded-lg" style={{ background: C.sand }}>
                <ModoBtn id="microsoft" icon={MonitorPlay} label="Vista Office"
                  disabled={excedeMS} title={excedeMS ? 'El archivo supera el tamaño que admite el visor de Microsoft' : ''} />
                {fileType === 'excel'
                  ? <ModoBtn id="datos" icon={Table2} label="Vista de datos" />
                  : <ModoBtn id="google" icon={RefreshCw} label="Visor alterno" />}
              </div>
            )}

            <button onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: C.olive, color: C.olive }} title="Descargar archivo">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2" title="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-600">Cargando documento...</p>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: C.amber }} />
              <p className="font-medium mb-2" style={{ color: '#854f0b' }}>Error al cargar el documento</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: C.mint }}>
                <Download className="h-4 w-4" />Descargar Documento
              </button>
            </div>
          )}

          {/* Visor en iframe (PDF nativo / Microsoft / Google) */}
          {!loading && !error && viewerUrl && (
            <>
              {!iframeOk && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Loader2 className="h-10 w-10 animate-spin mb-3" style={{ color: C.mint }} />
                  <p className="text-gray-500 text-sm">Abriendo visor…</p>
                </div>
              )}
              <iframe
                key={viewerUrl}
                src={viewerUrl}
                className="w-full h-full border-0 relative"
                title={`Visor de ${document.name}`}
                onLoad={() => { setIframeOk(true); setLento(false); clearTimeout(timerRef.current); }}
              />
              {/* Aviso: el visor externo no responde → ofrecer respaldo */}
              {lento && esOffice && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg"
                  style={{ background: '#fffbeb', border: `1px solid ${C.amber}55`, maxWidth: '92%' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: C.amber }} />
                  <span className="text-sm" style={{ color: '#854f0b' }}>¿El visor no carga?</span>
                  <button onClick={() => setModo(respaldo)} className="text-sm font-semibold underline" style={{ color: C.green }}>
                    {fileType === 'excel' ? 'Ver como tabla' : 'Probar visor alterno'}
                  </button>
                  <span className="text-gray-400">·</span>
                  <button onClick={handleDownload} className="text-sm font-semibold underline" style={{ color: C.olive }}>Descargar</button>
                </div>
              )}
            </>
          )}

          {/* Vista de datos (Excel) */}
          {!loading && !error && modo === 'datos' && (
            <div className="h-full flex flex-col">
              {cargandoDatos && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin mb-3" style={{ color: C.mint }} />
                  <p className="text-gray-500 text-sm">Leyendo el archivo…</p>
                </div>
              )}
              {errorDatos && (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <AlertCircle className="h-10 w-10 mb-3" style={{ color: C.amber }} />
                  <p className="text-sm mb-4" style={{ color: '#854f0b' }}>{errorDatos}</p>
                  <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: C.mint }}>
                    <Download className="h-4 w-4" />Descargar
                  </button>
                </div>
              )}
              {hojas && !cargandoDatos && (
                <>
                  {hojas.length > 1 && (
                    <div className="flex gap-1 px-3 pt-2 overflow-x-auto bg-white border-b" style={{ borderColor: C.sand }}>
                      {hojas.map((h, i) => (
                        <button key={h.nombre} onClick={() => setHojaActiva(i)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-t-md whitespace-nowrap"
                          style={{ background: i === hojaActiva ? C.green : '#f3f4f6', color: i === hojaActiva ? 'white' : '#374151' }}>
                          {h.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex-1 overflow-auto bg-white p-3">
                    <style>{`
                      .sig-xls table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
                      .sig-xls td { border: 1px solid #d9dcd3; padding: 3px 6px; vertical-align: top; white-space: pre-wrap; min-width: 40px; }
                      .sig-xls tr:first-child td { background: #f4f6f2; }
                    `}</style>
                    <div className="sig-xls" dangerouslySetInnerHTML={{ __html: hojas[hojaActiva]?.html || '' }} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tipo no soportado */}
          {!loading && !error && fileType === 'unknown' && (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium mb-2">No se puede visualizar este tipo de archivo</p>
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white mt-2" style={{ backgroundColor: C.mint }}>
                <Download className="h-4 w-4" />Descargar Archivo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="p-3 border-t bg-gray-50" style={{ borderColor: C.sand }}>
            <p className="text-xs text-gray-500 text-center">
              {modo === 'nativo' && '📄 Visualizando PDF'}
              {modo === 'microsoft' && '📊 Visualizando con Microsoft Office Online'}
              {modo === 'google' && '📊 Visualizando con visor alterno (Google)'}
              {modo === 'datos' && '📋 Vista de datos: muestra el contenido sin el formato visual del Excel'}
              {excedeMS && ' • El archivo supera el tamaño que admite el visor de Microsoft'}
              {' • '}Si no se visualiza correctamente, usa el botón "Descargar"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewerModal;