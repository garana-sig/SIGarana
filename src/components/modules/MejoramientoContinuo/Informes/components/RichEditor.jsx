// src/components/modules/MejoramientoContinuo/Informes/components/RichEditor.jsx
// FIX duplicate 'underline': usar useMemo para estabilizar extensiones entre renders
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit   from '@tiptap/starter-kit';
import ImageExt     from '@tiptap/extension-image';
import {Table}        from '@tiptap/extension-table';
import {TableRow}     from '@tiptap/extension-table-row';
import {TableHeader}  from '@tiptap/extension-table-header';
import {TableCell}    from '@tiptap/extension-table-cell';
import Underline    from '@tiptap/extension-underline';
import Placeholder  from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Image as ImageIcon, ChevronDown,
} from 'lucide-react';

const EDITOR_STYLE = `
  .tiptap-editor .ProseMirror { min-height: 88px; outline: none; font-size: 12.5px; line-height: 1.65; color: #374151; }
  .tiptap-editor .ProseMirror p { margin: 0 0 4px; }
  .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 20px; margin: 4px 0; }
  .tiptap-editor .ProseMirror li { margin: 2px 0; }
  .tiptap-editor .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 4px 0; cursor: pointer; }
  .tiptap-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 12px; }
  .tiptap-editor .ProseMirror th, .tiptap-editor .ProseMirror td { border: 1px solid #d1d5db; padding: 5px 8px; min-width: 40px; vertical-align: top; }
  .tiptap-editor .ProseMirror th { background: #f3f4f6; font-weight: 600; text-align: left; }
  .tiptap-editor .ProseMirror td.selectedCell, .tiptap-editor .ProseMirror th.selectedCell { background: #6dbd9620; }
  .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before { color: #d1d5db; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
`;

let styleInjected = false;

function ToolBtn({ onClick, active, title, children }) {
  return (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors select-none cursor-pointer ${active ? 'bg-[#2e5244] text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
      {children}
    </button>
  );
}

// TableMenu con position:fixed para no ser recortado por overflow:hidden del padre
function TableMenu({ editor, buttonRef, onClose }) {
  const menuRef = useRef(null);
  const [pos,   setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const sections = [
    { group: 'Filas', items: [
      { label: '↑ Fila arriba',     fn: () => editor.chain().focus().addRowBefore().run()   },
      { label: '↓ Fila abajo',      fn: () => editor.chain().focus().addRowAfter().run()    },
      { label: '✕ Eliminar fila',   fn: () => editor.chain().focus().deleteRow().run(),  danger: true },
    ]},
    { group: 'Columnas', items: [
      { label: '← Col. izquierda',  fn: () => editor.chain().focus().addColumnBefore().run() },
      { label: '→ Col. derecha',    fn: () => editor.chain().focus().addColumnAfter().run()  },
      { label: '✕ Eliminar col.',   fn: () => editor.chain().focus().deleteColumn().run(), danger: true },
    ]},
    { group: 'Tabla', items: [
      { label: '🗑 Eliminar tabla', fn: () => editor.chain().focus().deleteTable().run(), danger: true },
    ]},
  ];

  return (
    <div ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl py-1 min-w-[195px]">
      {sections.map((sec, si) => (
        <div key={si}>
          {si > 0 && <div className="border-t border-gray-100 my-1"/>}
          <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{sec.group}</p>
          {sec.items.map((item, ii) => (
            <button key={ii} type="button"
              onMouseDown={e => { e.preventDefault(); item.fn(); onClose(); }}
              className={`w-full flex items-center px-3 py-1.5 text-xs transition-colors cursor-pointer text-left ${item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function RichEditor({ content = '', onChange, placeholder = 'Escribe aquí...', minHeight = 88, readOnly = false }) {
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableBtnRef = useRef(null);

  if (!styleInjected) {
    const tag = document.createElement('style');
    tag.textContent = EDITOR_STYLE;
    document.head.appendChild(tag);
    styleInjected = true;
  }

  // FIX duplicate: useMemo garantiza que el array de extensiones se crea UNA sola vez
  // independientemente de cuántas veces React re-renderice o HMR refresque
  const extensions = useMemo(() => [
    StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false }),
    Underline,
    ImageExt.configure({ allowBase64: true, inline: false }),
    Table.configure({ resizable: false }),
    TableRow, TableHeader, TableCell,
    Placeholder.configure({ placeholder }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []); // array vacío → se crea solo al montar

  const editor = useEditor({
    extensions,
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const img   = items.find(i => i.type.startsWith('image/'));
        if (!img) return false;
        const file = img.getAsFile(); if (!file) return false;
        const reader = new FileReader();
        reader.onload = e => {
          view.dispatch(view.state.tr.replaceSelectionWith(
            view.state.schema.nodes.image.create({ src: e.target.result })
          ));
        };
        reader.readAsDataURL(file);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) editor.commands.setContent(content ?? '', false);
  }, [content, editor]);

  if (!editor) return null;

  const inTable = editor.isActive('table');

  const handleImageFile = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => editor.chain().focus().setImage({ src: ev.target.result }).run();
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className={`tiptap-editor border rounded-lg ${readOnly ? 'bg-gray-50' : 'bg-white'}`}>
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-gray-50 flex-wrap">
          <ToolBtn title="Negrita"    onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}><Bold size={12}/></ToolBtn>
          <ToolBtn title="Cursiva"    onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}><Italic size={12}/></ToolBtn>
          <ToolBtn title="Subrayado"  onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon size={12}/></ToolBtn>
          <div className="w-px h-4 bg-gray-200 mx-1"/>
          <ToolBtn title="Lista"          onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}><List size={12}/></ToolBtn>
          <ToolBtn title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={12}/></ToolBtn>
          <div className="w-px h-4 bg-gray-200 mx-1"/>

          {/* Tabla — usa ref para calcular posición del menú */}
          <button ref={tableBtnRef} type="button"
            onMouseDown={e => {
              e.preventDefault();
              if (!inTable) { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }
              else { setTableMenuOpen(v => !v); }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors select-none cursor-pointer ${inTable ? 'bg-[#2e5244] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            title={inTable ? 'Opciones de tabla' : 'Insertar tabla 3×3'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
            Tabla {inTable && <ChevronDown size={10}/>}
          </button>

          <ToolBtn title="Insertar imagen" onClick={handleImageFile}><ImageIcon size={12}/></ToolBtn>
        </div>
      )}
      <div className="px-3 py-2" style={{ minHeight }}>
        <EditorContent editor={editor}/>
      </div>

      {/* Menú de tabla renderizado fuera del editor para evitar clipping */}
      {tableMenuOpen && inTable && (
        <TableMenu editor={editor} buttonRef={tableBtnRef} onClose={() => setTableMenuOpen(false)}/>
      )}
    </div>
  );
}