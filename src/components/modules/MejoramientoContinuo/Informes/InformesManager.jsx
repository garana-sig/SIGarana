// src/components/modules/MejoramientoContinuo/Informes/InformesManager.jsx
import { useState, useEffect }     from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, Eye, Edit2, Trash2,
  CheckCircle2, Send, AlertTriangle, FileBarChart,
  FolderOpen, Filter, AlertCircle, MessageSquare,
  Loader2, X, Printer,
} from 'lucide-react';

import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label }    from '@/app/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';

import { useAuth }                 from '@/context/AuthContext';
import { useInformes }             from '@/hooks/useInformes';
import { getProcessConfig, getProcessItems } from './constants/processItems';
import { printInforme }            from '../../../../utils/printReport';
import { InformePDFTemplate }      from './InformeWizard';
import InformeWizard               from './InformeWizard';

// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
  : '—';

const STATUS_CONFIG = {
  draft:              { label:'Borrador',            color:'#9ca3af', bg:'#f3f4f6', icon:Edit2        },
  submitted:          { label:'Pendiente revisión',  color:'#d97706', bg:'#fff7ed', icon:Send          },
  reviewed:           { label:'Aprobado ✓',          color:'#2e5244', bg:'#f0f7f4', icon:CheckCircle2  },
  revision_requested: { label:'Requiere corrección', color:'#dc2626', bg:'#fef2f2', icon:AlertTriangle },
};

function StatTile({ label, value, icon: Icon, color, bg }) {
  return (
    <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
      className="rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm" style={{ background:bg }}>
      <div className="rounded-lg p-2.5" style={{ backgroundColor:`${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }}/>
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight" style={{ color }}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Vista previa — con botón Imprimir/PDF
// ─────────────────────────────────────────────────────────────────────────────
function PreviewModal({ report, onClose, onLoadData }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadData(report).then(d => { setData(d); setLoading(false); });
  }, [report.id]);

  const handlePrint = () => {
    if (!data) return;
    printInforme({
      formData: {
        title:          report.title,
        period:         report.period,
        process_id:     report.process_id,
        responsible_id: report.responsible_id,
      },
      sections:           data.sections,
      indicators:         data.indicators,
      selectedIndicators: data.selectedIndicators,
      processId:          report.process_id,
      processList:        data.processes,
      users:              data.users,
      getProcessItems,
      getProcessConfig,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden"
        style={{ height:'90vh', display:'flex', flexDirection:'column' }}
        aria-describedby="preview-desc"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ background:'linear-gradient(135deg,#2e5244,#6dbd96)' }}>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{report.title}</p>
            <p className="text-white/70 text-xs mt-0.5" id="preview-desc">
              {report.process?.name} · {report.period}
              {report.responsible?.full_name && ` · ${report.responsible.full_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {/* Botón imprimir/PDF — disponible cuando el contenido cargó */}
            {!loading && data && (
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors"
                title="Imprimir o guardar como PDF">
                <Printer size={13}/> Imprimir / PDF
              </button>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-0.5">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2 text-sm">
              <Loader2 className="animate-spin h-5 w-5"/> Cargando contenido...
            </div>
          ) : !data ? (
            <div className="text-center py-20 text-gray-400 text-sm">No se pudo cargar el contenido</div>
          ) : (
            <div className="p-4">
              <InformePDFTemplate
                formData={{
                  title:          report.title,
                  period:         report.period,
                  process_id:     report.process_id,
                  responsible_id: report.responsible_id,
                }}
                sections={data.sections}
                indicators={data.indicators}
                selectedIndicators={data.selectedIndicators}
                processId={report.process_id}
                processList={data.processes}
                users={data.users}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Revisión — email al autor en ambos casos
// ─────────────────────────────────────────────────────────────────────────────
function ReviewModal({ report, onConfirm, onClose, saving }) {
  const [notes,    setNotes]    = useState(report.review_notes ?? '');
  const [approved, setApproved] = useState(true);
  const canSubmit = approved || notes.trim().length > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="review-info">
        <DialogHeader>
          <DialogTitle className="text-[#2e5244] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#6dbd96]"/> Revisión del informe
          </DialogTitle>
        </DialogHeader>
        <div id="review-info" className="space-y-4 py-1">
          <div className="rounded-xl p-4 space-y-1.5 text-sm" style={{ background:'#f5f5ef' }}>
            {[
              ['Título',        report.title],
              ['Proceso',       report.process?.name  ?? '—'],
              ['Período',       report.period],
              ['Elaborado por', report.creator?.full_name ?? '—'],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">{k}</span>
                <span className="font-medium text-gray-800 text-right truncate">{v}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setApproved(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${approved ? 'bg-[#2e5244] text-white border-[#2e5244]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#2e5244]'}`}>
              ✅ Aprobar
            </button>
            <button onClick={() => setApproved(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${!approved ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200 hover:border-red-400'}`}>
              🔄 Pedir corrección
            </button>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Observaciones
              {!approved
                ? <span className="text-red-500"> * obligatorio</span>
                : <span className="text-gray-400 font-normal"> (opcional)</span>}
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={approved ? 'Comentarios adicionales...' : 'Describe qué debe corregir el usuario...'}
              rows={3}
              className={`resize-none text-sm ${!approved && !notes.trim() ? 'border-red-300' : ''}`}
            />
            <div className={`mt-2 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${approved ? 'bg-[#f0f7f4] text-[#2e5244]' : 'bg-red-50 text-red-600'}`}>
              <Send size={11} className="shrink-0"/>
              {approved
                ? 'Se enviará email de aprobación al autor.'
                : 'El informe vuelve a estado editable y el autor recibirá las correcciones por email.'}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={() => { if (canSubmit) onConfirm({ approved, notes }); }}
            disabled={saving || !canSubmit}
            style={{ background: approved ? '#2e5244' : '#dc2626', color:'white' }}>
            {saving ? 'Guardando...' : (approved ? 'Aprobar y notificar' : 'Solicitar corrección')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function InformesManager({ onBack }) {
  const { isAdmin, isGerencia, hasPermission, user } = useAuth();

  const {
    informes, loading, error,
    fetchInformes, reviewInforme, deleteInforme,
    loadFullReportData,
  } = useInformes();

  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [wizardOpen,    setWizardOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [reviewTarget,  setReviewTarget]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);

  const canCreate = isAdmin || isGerencia || hasPermission('auditorias:informes:create');
  const canReview = isAdmin || isGerencia || hasPermission('auditorias:informes:review');

  useEffect(() => { fetchInformes(); }, [fetchInformes]);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = informes.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      [r.title, r.period, r.process?.name, r.creator?.full_name].some(f => f?.toLowerCase().includes(q));
    return matchSearch && (filterStatus==='all' || r.status===filterStatus);
  });

  const stats = {
    total:     informes.length,
    submitted: informes.filter(r=>r.status==='submitted').length,
    reviewed:  informes.filter(r=>r.status==='reviewed').length,
    pending:   informes.filter(r=>r.status==='revision_requested').length,
  };

  const handleReview = async (decision) => {
    setSaving(true);
    const result = await reviewInforme(reviewTarget.id, decision);
    setSaving(false);
    if (result.success) {
      setReviewTarget(null);
      showToast(decision.approved ? 'Informe aprobado — autor notificado' : 'Corrección solicitada — autor notificado');
    } else {
      showToast(result.error ?? 'Error al revisar', 'error');
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const result = await deleteInforme(deleteTarget.id);
    setSaving(false);
    setDeleteTarget(null);
    result.success ? showToast('Informe eliminado') : showToast(result.error ?? 'Error', 'error');
  };

  const canEdit   = r => isAdmin || isGerencia || (r.created_by===user?.id && ['draft','revision_requested'].includes(r.status));
  const canDelete = r => isAdmin || (r.created_by===user?.id && r.status==='draft');

  if (wizardOpen || editTarget) {
    return (
      <InformeWizard
        editTarget={editTarget}
        onClose={() => { setWizardOpen(false); setEditTarget(null); }}
        onSuccess={() => {
          setWizardOpen(false); setEditTarget(null);
          fetchInformes();
          showToast(editTarget ? 'Informe actualizado' : 'Informe enviado');
        }}
      />
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#2e5244] hover:bg-[#2e524410]">
          <ArrowLeft className="h-4 w-4 mr-1"/> Volver
        </Button>
        <div className="h-5 w-px bg-gray-200"/>
        <div>
          <h2 className="text-xl font-bold text-[#2e5244]">Informes de Gestión</h2>
          <p className="text-xs text-gray-400">Elaboración, envío y seguimiento de informes por proceso</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total"            value={stats.total}     icon={FileBarChart}  color="#2e5244" bg="#f0f7f4"/>
        <StatTile label="Pendientes"       value={stats.submitted} icon={Send}          color="#d97706" bg="#fff7ed"/>
        <StatTile label="Aprobados"        value={stats.reviewed}  icon={CheckCircle2}  color="#6dbd96" bg="#f0fdf4"/>
        <StatTile label="Con correcciones" value={stats.pending}   icon={AlertTriangle} color="#dc2626" bg="#fef2f2"/>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
            <Input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar informe..." className="pl-8 h-8 text-xs w-52"/>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-44">
              <Filter className="h-3 w-3 mr-1.5 text-gray-400 shrink-0"/>
              <SelectValue placeholder="Estado"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setWizardOpen(true)}
            className="h-8 text-xs gap-1.5 shrink-0" style={{ background:'#2e5244', color:'white' }}>
            <Plus className="h-3.5 w-3.5"/> Nuevo Informe
          </Button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-[#6dbd96] rounded-full animate-spin mx-auto mb-3"/>
          Cargando informes...
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle className="h-10 w-10 mx-auto text-red-400 mb-2"/>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="h-14 w-14 mx-auto text-gray-200 mb-3"/>
          <p className="text-gray-400 text-sm font-medium">
            {informes.length===0 ? 'Aún no hay informes' : 'Sin resultados para los filtros aplicados'}
          </p>
          {informes.length===0 && canCreate && (
            <Button size="sm" variant="outline" onClick={()=>setWizardOpen(true)}
              className="mt-4 text-xs border-[#6dbd96] text-[#2e5244]">
              <Plus className="h-3.5 w-3.5 mr-1.5"/> Crear primer informe
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background:'linear-gradient(135deg,#2e5244 0%,#6dbd96 100%)' }}>
                  {/* Sin columna consecutivo */}
                  {['Título','Proceso','Período','Estado',
                    ...(isAdmin||isGerencia ? ['Elaborado por','Fecha'] : ['Fecha']),
                    'Acciones'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-white/90 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const sc     = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
                  const proc   = getProcessConfig(r.process_id);
                  const StIcon = sc.icon;
                  return (
                    <motion.tr key={r.id}
                      initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} transition={{ delay:i*0.025 }}
                      className="border-b border-gray-50 hover:bg-[#f5f5ef50] transition-colors">

                      {/* Título */}
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="text-xs font-semibold text-gray-800 truncate">{r.title}</p>
                        {r.review_notes && r.status==='revision_requested' && (
                          <p className="text-xs text-red-500 truncate mt-0.5">💬 {r.review_notes}</p>
                        )}
                      </td>

                      {/* Proceso */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{ background:`${proc?.color??'#9ca3af'}15`, color:proc?.color??'#9ca3af', border:`1px solid ${proc?.color??'#9ca3af'}30` }}>
                          {proc?.icon} {r.process?.name??'—'}
                        </span>
                      </td>

                      {/* Período */}
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.period}</td>

                      {/* Estado */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                          style={{ background:sc.bg, color:sc.color }}>
                          <StIcon size={10}/> {sc.label}
                        </span>
                      </td>

                      {(isAdmin||isGerencia) && (
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.creator?.full_name??'—'}</td>
                      )}
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>

                      {/* Acciones */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-0.5">
                          {/* Ver / Imprimir */}
                          <button title="Ver e imprimir informe"
                            onClick={() => setPreviewTarget(r)}
                            className="p-1.5 rounded-lg hover:bg-[#6dbd9620] transition-colors">
                            <Eye className="h-3.5 w-3.5 text-[#6dbd96]"/>
                          </button>
                          {/* Revisar */}
                          {canReview && r.status==='submitted' && (
                            <button title="Revisar" onClick={() => setReviewTarget(r)}
                              className="p-1.5 rounded-lg hover:bg-[#2e524420] transition-colors">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#2e5244]"/>
                            </button>
                          )}
                          {/* Editar */}
                          {canEdit(r) && (
                            <button title="Editar" onClick={() => setEditTarget(r)}
                              className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors">
                              <Edit2 className="h-3.5 w-3.5 text-orange-400"/>
                            </button>
                          )}
                          {/* Eliminar */}
                          {canDelete(r) && (
                            <button title="Eliminar" onClick={() => setDeleteTarget(r)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="h-3.5 w-3.5 text-red-400"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 flex justify-between items-center">
            <span>Mostrando {filtered.length} de {informes.length} informes</span>
            {stats.submitted>0 && (isAdmin||isGerencia) && (
              <span className="text-[#d97706] font-medium">
                {stats.submitted} pendiente{stats.submitted!==1?'s':''} de revisión
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modales */}
      {previewTarget && (
        <PreviewModal report={previewTarget} onClose={() => setPreviewTarget(null)} onLoadData={loadFullReportData}/>
      )}

      {reviewTarget && (
        <ReviewModal report={reviewTarget} onConfirm={handleReview} onClose={() => setReviewTarget(null)} saving={saving}/>
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm" aria-describedby="del-desc">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5"/> Eliminar informe
              </DialogTitle>
            </DialogHeader>
            <p id="del-desc" className="text-sm text-gray-600 py-2">
              ¿Eliminar <strong>{deleteTarget.title}</strong>? Esta acción no se puede deshacer.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0,y:20,scale:0.95 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:20,scale:0.95 }}
            className="fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl text-sm font-medium z-50 flex items-center gap-2"
            style={toast.type==='error' ? { background:'#ef4444',color:'white' } : { background:'#2e5244',color:'white' }}>
            {toast.type==='error' ? <AlertCircle className="h-4 w-4 shrink-0"/> : <CheckCircle2 className="h-4 w-4 shrink-0"/>}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}