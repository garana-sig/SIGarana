// src/components/modules/MejoramientoContinuo/SurveyConfigModal.jsx
// Modal compartido para configurar períodos y preguntas de cualquier encuesta

import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, CheckCircle2, Calendar, HelpCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useSurveys } from '@/hooks/useSurveys';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c' };

// ─── MODAL PRINCIPAL ───────────────────────────────────────────────────────────
// Props:
//   surveyTypeCode  — 'customer_satisfaction' | 'work_climate'
//   surveyTypeName  — nombre legible para el título
//   onClose         — función para cerrar
export default function SurveyConfigModal({ surveyTypeCode, surveyTypeName, onClose }) {
  const [activeTab, setActiveTab] = useState('periods'); // 'periods' | 'questions'

  const {
    periods, questions, loading, error, reload,
    createPeriod, updatePeriod, activatePeriod, deletePeriod,
    createQuestion, updateQuestion, toggleQuestion,
  } = useSurveys(surveyTypeCode);

  // ── Estados de sub-modales ────────────────────────────────────────────────
  const [periodModal, setPeriodModal]   = useState(null); // null | { mode: 'create'|'edit', data? }
  const [questionModal, setQuestionModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }
  const [actionMsg, setActionMsg]         = useState(null); // { type: 'success'|'error', text }

  const showMsg = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  // ── Handlers Períodos ─────────────────────────────────────────────────────
  const handleSavePeriod = async (formData) => {
    const isEdit = periodModal?.mode === 'edit';
    const result = isEdit
      ? await updatePeriod(periodModal.data.id, formData)
      : await createPeriod(formData);
    if (result.success) {
      showMsg('success', isEdit ? 'Período actualizado' : 'Período creado');
      setPeriodModal(null);
    } else {
      showMsg('error', result.error);
    }
  };

  const handleActivatePeriod = async (id, name) => {
    const result = await activatePeriod(id);
    if (result.success) showMsg('success', `"${name}" activado`);
    else showMsg('error', result.error);
  };

  const handleDeletePeriod = async () => {
    const result = await deletePeriod(confirmDelete.id);
    if (result.success) showMsg('success', 'Período eliminado');
    else showMsg('error', result.error);
    setConfirmDelete(null);
  };

  // ── Handlers Preguntas ────────────────────────────────────────────────────
  const handleSaveQuestion = async (formData) => {
    const isEdit = questionModal?.mode === 'edit';
    const result = isEdit
      ? await updateQuestion(questionModal.data.id, formData)
      : await createQuestion(formData);
    if (result.success) {
      showMsg('success', isEdit ? 'Pregunta actualizada' : 'Pregunta creada');
      setQuestionModal(null);
    } else {
      showMsg('error', result.error);
    }
  };

  const handleToggleQuestion = async (q) => {
    const result = await toggleQuestion(q.id, q.is_active);
    if (result.success)
      showMsg('success', `Pregunta ${q.is_active ? 'desactivada' : 'activada'}`);
    else showMsg('error', result.error);
  };

  // ── Categorías únicas para el select de preguntas ────────────────────────
  const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={s.modal}>
        {/* Header */}
        <div style={s.modalHeader}>
          <div>
            <h2 style={s.modalTitle}>Configurar encuesta</h2>
            <p style={s.modalSubtitle}>{surveyTypeName}</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Mensaje de acción */}
        {actionMsg && (
          <div style={{ ...s.actionMsg, ...(actionMsg.type === 'error' ? s.actionMsgError : s.actionMsgSuccess) }}>
            {actionMsg.type === 'success' ? '✓' : '⚠'} {actionMsg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={s.tabs}>
          {[
            { id: 'periods',   label: `Períodos (${periods.length})`,    icon: <Calendar size={14} /> },
            { id: 'questions', label: `Preguntas (${questions.length})`, icon: <HelpCircle size={14} /> },
          ].map(tab => (
            <button key={tab.id} style={{ ...s.tab, ...(activeTab === tab.id ? s.tabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={s.body}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Cargando...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>
              Error: {error} <button onClick={reload} style={{ color: C.green, marginLeft: 8 }}>Reintentar</button>
            </div>
          ) : (

            /* ── TAB PERÍODOS ── */
            activeTab === 'periods' ? (
              <div>
                <div style={s.tabToolbar}>
                  <span style={s.tabToolbarLabel}>
                    {periods.length} período{periods.length !== 1 ? 's' : ''} registrado{periods.length !== 1 ? 's' : ''}
                  </span>
                  <Button size="sm" style={s.addBtn}
                    onClick={() => setPeriodModal({ mode: 'create' })}>
                    <Plus size={14} className="mr-1" /> Nuevo período
                  </Button>
                </div>

                {periods.length === 0 ? (
                  <div style={s.empty}>No hay períodos creados aún.</div>
                ) : (
                  <div style={s.list}>
                    {periods.map(p => (
                      <div key={p.id} style={s.listItem}>
                        <div style={s.listItemLeft}>
                          <div style={s.listItemTitle}>
                            {p.name}
                            {p.is_active && (
                              <span style={s.activeBadge}>Activo</span>
                            )}
                          </div>
                          <div style={s.listItemSub}>
                            Semestre {p.semester} · {p.year}
                            {p.start_date && ` · ${fmtDate(p.start_date)} – ${fmtDate(p.end_date)}`}
                            {p.access_code
                              ? <span style={{ color: '#16a34a', fontWeight: 600 }}>🔒 Con código</span>
                              : <span style={{ color: '#aaa' }}>🔓 Abierta</span>}
                          </div>
                        </div>
                        <div style={s.listItemActions}>
                          {!p.is_active && (
                            <button style={s.actionBtn} title="Activar período"
                              onClick={() => handleActivatePeriod(p.id, p.name)}>
                              <CheckCircle2 size={15} color={C.mint} />
                            </button>
                          )}
                          <button style={s.actionBtn} title="Editar"
                            onClick={() => setPeriodModal({ mode: 'edit', data: p })}>
                            <Pencil size={14} color={C.olive} />
                          </button>
                          <button style={s.actionBtn} title="Eliminar"
                            onClick={() => setConfirmDelete({ type: 'period', id: p.id, name: p.name })}>
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (

              /* ── TAB PREGUNTAS ── */
              <div>
                <div style={s.tabToolbar}>
                  <span style={s.tabToolbarLabel}>
                    {questions.filter(q => q.is_active).length} activas · {questions.filter(q => !q.is_active).length} inactivas
                  </span>
                  <Button size="sm" style={s.addBtn}
                    onClick={() => setQuestionModal({ mode: 'create' })}>
                    <Plus size={14} className="mr-1" /> Nueva pregunta
                  </Button>
                </div>

                {questions.length === 0 ? (
                  <div style={s.empty}>No hay preguntas registradas.</div>
                ) : (
                  <div style={s.list}>
                    {questions.map(q => (
                      <div key={q.id} style={{ ...s.listItem, opacity: q.is_active ? 1 : 0.5 }}>
                        <div style={{ ...s.listItemLeft, flex: 1 }}>
                          <div style={s.listItemTitle}>
                            <span style={s.qOrderBadge}>{q.order_index}</span>
                            {q.question_text}
                          </div>
                          <div style={s.listItemSub}>
                            {q.category && <span style={{ ...s.catChip, color: C.green }}>{q.category}</span>}
                            <span style={{ color: q.question_type === 'scale' ? C.olive : '#888' }}>
                              {q.question_type === 'scale' ? '⭐ Escala 1-5' : '📝 Texto libre'}
                            </span>
                            {q.is_required && <span style={{ color: '#ef4444', fontSize: 11 }}>• Requerido</span>}
                          </div>
                        </div>
                        <div style={s.listItemActions}>
                          <button style={s.actionBtn} title={q.is_active ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggleQuestion(q)}>
                            {q.is_active
                              ? <ToggleRight size={18} color={C.mint} />
                              : <ToggleLeft  size={18} color="#aaa" />}
                          </button>
                          <button style={s.actionBtn} title="Editar"
                            onClick={() => setQuestionModal({ mode: 'edit', data: q })}>
                            <Pencil size={14} color={C.olive} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Sub-modal: Período ── */}
      {periodModal && (
        <PeriodFormModal
          mode={periodModal.mode}
          data={periodModal.data}
          onSave={handleSavePeriod}
          onClose={() => setPeriodModal(null)}
        />
      )}

      {/* ── Sub-modal: Pregunta ── */}
      {questionModal && (
        <QuestionFormModal
          mode={questionModal.mode}
          data={questionModal.data}
          categories={categories}
          onSave={handleSaveQuestion}
          onClose={() => setQuestionModal(null)}
        />
      )}

      {/* ── Sub-modal: Confirmar eliminación ── */}
      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDeletePeriod}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

// ─── Modal formulario de Período ──────────────────────────────────────────────
function PeriodFormModal({ mode, data, onSave, onClose }) {
  const [form, setForm] = useState({
    name:        data?.name        || '',
    semester:    data?.semester    || '1',
    year:        data?.year        || new Date().getFullYear(),
    start_date:  data?.start_date  || '',
    end_date:    data?.end_date    || '',
    is_active:   data?.is_active   || false,
    access_code: data?.access_code || '',
  });
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name     = 'Requerido';
    if (!form.semester)       e.semester = 'Requerido';
    if (!form.year)           e.year     = 'Requerido';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <SubModal title={mode === 'create' ? 'Nuevo período' : 'Editar período'} onClose={onClose}>
      <Field label="Nombre del período *" error={errors.name}>
        <input style={{ ...sf.input, ...(errors.name ? sf.inputErr : {}) }}
          placeholder="Ej: I Semestre 2026"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Semestre *" error={errors.semester}>
          <select style={sf.input} value={form.semester}
            onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
            <option value="1">I Semestre</option>
            <option value="2">II Semestre</option>
          </select>
        </Field>
        <Field label="Año *" error={errors.year}>
          <input style={{ ...sf.input, ...(errors.year ? sf.inputErr : {}) }}
            type="number" min="2020" max="2030"
            value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Fecha inicio">
          <input style={sf.input} type="date" value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </Field>
        <Field label="Fecha fin">
          <input style={sf.input} type="date" value={form.end_date}
            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
        </Field>
      </div>
      {/* Código de acceso */}
      <Field label="Código de acceso (opcional)">
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...sf.input, letterSpacing: form.access_code ? 2 : 0, paddingRight: 72, fontFamily: 'monospace', textTransform: 'uppercase' }}
            type={showCode ? 'text' : 'password'}
            placeholder="Sin código = encuesta abierta"
            value={form.access_code}
            onChange={e => setForm(f => ({ ...f, access_code: e.target.value.toUpperCase() }))}
            maxLength={20}
          />
          <button type="button"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
              color: '#888', fontWeight: 600, padding: '2px 6px' }}
            onClick={() => setShowCode(v => !v)}>
            {showCode ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>
          Si lo dejas vacío, cualquier persona con el enlace puede responder.
        </p>
      </Field>

      {mode === 'create' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          Activar este período al crear (desactivará el actual)
        </label>
      )}
      <div style={sf.footer}>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" style={sf.saveBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando...' : mode === 'create' ? 'Crear período' : 'Guardar cambios'}
        </Button>
      </div>
    </SubModal>
  );
}

// ─── Modal formulario de Pregunta ─────────────────────────────────────────────
function QuestionFormModal({ mode, data, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    question_text:  data?.question_text  || '',
    question_type:  data?.question_type  || 'scale',
    category:       data?.category       || '',
    order_index:    data?.order_index    || '',
    is_required:    data?.is_required !== false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [newCategory, setNewCategory] = useState('');

  const validate = () => {
    const e = {};
    if (!form.question_text.trim()) e.question_text = 'Requerido';
    if (!form.order_index)          e.order_index   = 'Requerido';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const cat = newCategory.trim() || form.category;
    await onSave({ ...form, category: cat || null });
    setSaving(false);
  };

  return (
    <SubModal title={mode === 'create' ? 'Nueva pregunta' : 'Editar pregunta'} onClose={onClose}>
      <Field label="Texto de la pregunta *" error={errors.question_text}>
        <textarea style={{ ...sf.input, ...(errors.question_text ? sf.inputErr : {}), resize: 'vertical' }}
          rows={3} placeholder="Escribe la pregunta..."
          value={form.question_text}
          onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Tipo de pregunta">
          <select style={sf.input} value={form.question_type}
            onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))}>
            <option value="scale">⭐ Escala 1-5</option>
            <option value="text">📝 Texto libre</option>
          </select>
        </Field>
        <Field label="Orden *" error={errors.order_index}>
          <input style={{ ...sf.input, ...(errors.order_index ? sf.inputErr : {}) }}
            type="number" min="1" placeholder="Ej: 1"
            value={form.order_index}
            onChange={e => setForm(f => ({ ...f, order_index: e.target.value }))} />
        </Field>
      </div>
      <Field label="Categoría (para clima laboral)">
        {categories.length > 0 ? (
          <select style={sf.input} value={form.category}
            onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setNewCategory(''); }}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">+ Nueva categoría...</option>
          </select>
        ) : null}
        {(form.category === '__new__' || categories.length === 0) && (
          <input style={{ ...sf.input, marginTop: 6 }} placeholder="Nombre de la nueva categoría"
            value={newCategory} onChange={e => setNewCategory(e.target.value)} />
        )}
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_required}
          onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} />
        Pregunta requerida (no se puede enviar sin responder)
      </label>
      <div style={sf.footer}>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" style={sf.saveBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando...' : mode === 'create' ? 'Crear pregunta' : 'Guardar cambios'}
        </Button>
      </div>
    </SubModal>
  );
}

// ─── Modal de confirmación ─────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <SubModal title="Confirmar eliminación" onClose={onClose} small>
      <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
      <div style={sf.footer}>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" style={{ ...sf.saveBtn, backgroundColor: '#ef4444', boxShadow: 'none' }}
          onClick={onConfirm}>Eliminar</Button>
      </div>
    </SubModal>
  );
}

// ─── Sub-modal base ────────────────────────────────────────────────────────────
function SubModal({ title, children, onClose, small }) {
  return (
    <>
      <div style={{ ...s.backdrop, zIndex: 1010 }} onClick={onClose} />
      <div style={{ ...s.modal, zIndex: 1020, maxWidth: small ? 400 : 520, maxHeight: '80vh' }}>
        <div style={s.modalHeader}>
          <h3 style={{ ...s.modalTitle, fontSize: 17 }}>{title}</h3>
          <button style={s.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ ...s.body, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{label}</label>
      {children}
      {error && <p style={{ color: '#ef4444', fontSize: 11, margin: 0 }}>{error}</p>}
    </div>
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  backdrop: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 1000, backdropFilter: 'blur(2px)',
  },
  modal: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff', borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    zIndex: 1001, width: '90%', maxWidth: 680,
    maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 24px 16px', borderBottom: '1px solid #f0f0e8',
    flexShrink: 0,
  },
  modalTitle:    { color: C.green, fontSize: 19, fontWeight: 800, margin: 0 },
  modalSubtitle: { color: C.olive, fontSize: 12, margin: '2px 0 0' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#aaa',
    padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center',
  },
  actionMsg: {
    margin: '0 24px', padding: '8px 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, flexShrink: 0,
  },
  actionMsgSuccess: { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  actionMsgError:   { backgroundColor: '#fff8f8', color: '#ef4444', border: '1px solid #fecaca' },
  tabs: {
    display: 'flex', gap: 4, padding: '12px 24px 0',
    borderBottom: '1px solid #f0f0e8', flexShrink: 0,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    border: 'none', background: 'none', cursor: 'pointer', color: '#888',
    borderBottom: '2px solid transparent',
  },
  tabActive: { color: C.green, borderBottom: `2px solid ${C.green}` },
  body: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  tabToolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  tabToolbarLabel: { fontSize: 12, color: '#aaa' },
  addBtn: { backgroundColor: C.green, color: '#fff', border: 'none', fontSize: 12 },
  empty: { textAlign: 'center', padding: '32px 16px', color: '#aaa', fontSize: 13 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderRadius: 10, border: '1.5px solid #eee',
    backgroundColor: '#fafafa', gap: 10,
  },
  listItemLeft:    { flex: 1 },
  listItemTitle:   { fontSize: 13, fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  listItemSub:     { fontSize: 11, color: '#aaa', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  listItemActions: { display: 'flex', gap: 6, flexShrink: 0 },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' },
  activeBadge: {
    fontSize: 10, fontWeight: 700, backgroundColor: `${C.mint}25`,
    color: C.green, padding: '2px 8px', borderRadius: 10,
  },
  qOrderBadge: {
    minWidth: 22, height: 22, borderRadius: '50%', backgroundColor: `${C.green}18`,
    color: C.green, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  catChip: { fontSize: 11, fontWeight: 600 },
};

const sf = {
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #ddd', fontSize: 13, color: '#333',
    outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputErr: { borderColor: '#ef4444' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  saveBtn: { backgroundColor: C.green, color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(46,82,68,0.3)' },
};