// Supabase Edge Function: generate-document v3.0
// Estrategia: docxtemplater para texto → inyección OOXML directa para fotos
// Sin módulos externos de imágenes — 100% compatible con cualquier plantilla

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import PizZip from "https://esm.sh/pizzip@3.1.6"
import Docxtemplater from "https://esm.sh/docxtemplater@3.42.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── Utilidades ────────────────────────────────────────────────────────────────
function getExtension(url: string): string {
  const clean = url.split("?")[0]
  const ext   = clean.split(".").pop()?.toLowerCase() ?? "jpg"
  return ["jpg","jpeg","png","gif","webp"].includes(ext) ? ext : "jpg"
}

function getMimeType(ext: string): string {
  const map: Record<string,string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" }
  return map[ext] ?? "image/jpeg"
}

/** Escapa caracteres especiales XML para texto dentro de tags */
function escapeXml(str: string): string {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}

// ── Inyecta fotos en el DOCX generado usando OOXML directo ────────────────────
async function injectPhotosIntoDocx(
  zip: PizZip,
  photos: Array<{ url: string; caption?: string }>
): Promise<void> {
  if (!photos || photos.length === 0) return

  // 1. Descargar imágenes
  type MediaItem = { name: string; data: Uint8Array; ext: string; mime: string; relId: string }
  const mediaItems: MediaItem[] = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    if (!photo?.url) continue
    try {
      const resp = await fetch(photo.url)
      if (!resp.ok) { console.warn(`⚠️ No se pudo descargar foto ${i+1}: ${resp.status}`); continue }
      const buf  = await resp.arrayBuffer()
      const ext  = getExtension(photo.url)
      const mime = getMimeType(ext)
      const name = `evidence_${i + 1}.${ext}`
      mediaItems.push({ name, data: new Uint8Array(buf), ext, mime, relId: `rIdEv${i + 1}` })
      console.log(`  ✅ Foto ${i+1} descargada (${buf.byteLength} bytes)`)
    } catch (e) {
      console.warn(`  ⚠️ Error foto ${i+1}:`, e)
    }
  }

  if (mediaItems.length === 0) { console.log("⚠️ Ninguna foto pudo descargarse"); return }

  // 2. Agregar archivos de imagen al zip
  for (const item of mediaItems) {
    zip.file(`word/media/${item.name}`, item.data)
  }

  // 3. Actualizar [Content_Types].xml con los MIME types necesarios
  const ctPath    = "[Content_Types].xml"
  let ctContent   = zip.file(ctPath)?.asText() ?? ""
  const addedMimes = new Set<string>()
  for (const item of mediaItems) {
    if (!ctContent.includes(`ContentType="${item.mime}"`) && !addedMimes.has(item.mime)) {
      ctContent = ctContent.replace(
        "</Types>",
        `<Default Extension="${item.ext}" ContentType="${item.mime}"/></Types>`
      )
      addedMimes.add(item.mime)
    }
  }
  zip.file(ctPath, ctContent)

  // 4. Agregar relationships al word/_rels/document.xml.rels
  const relsPath = "word/_rels/document.xml.rels"
  let relsContent = zip.file(relsPath)?.asText() ?? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  const newRels   = mediaItems
    .map(item =>
      `<Relationship Id="${item.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${item.name}"/>`
    )
    .join("")
  relsContent = relsContent.replace("</Relationships>", newRels + "</Relationships>")
  zip.file(relsPath, relsContent)

  // 5. Construir XML de la sección de fotos
  // Dimensiones: 14 cm ancho × 9 cm alto en EMUs (1 cm = 360000 EMU)
  const IMG_CX = 5040000  // 14 cm
  const IMG_CY = 3240000  // 9 cm

  let sectionXml = `
<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:pPr><w:pageBreakBefore/></w:pPr>
</w:p>
<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:pPr>
    <w:pStyle w:val="Heading2"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:t>Evidencias Fotográficas</w:t></w:r>
</w:p>`

  for (let i = 0; i < mediaItems.length; i++) {
    const item    = mediaItems[i]
    const photo   = photos.find(p => getExtension(p.url ?? "") === item.ext) ?? photos[i] ?? {}
    const caption = escapeXml((photo as any).caption ?? `Foto ${i + 1}`)
    const imgId   = 200 + i
    const imgName = `EvidenciaFoto${i + 1}`

    sectionXml += `
<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
     xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
     xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="120"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${IMG_CX}" cy="${IMG_CY}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${imgId}" name="${imgName}" descr="${caption}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${imgId}" name="${imgName}"/>
                <pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${item.relId}">
                  <a:extLst>
                    <a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}">
                      <a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/>
                    </a:ext>
                  </a:extLst>
                </a:blip>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr bwMode="auto">
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="${IMG_CX}" cy="${IMG_CY}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
                <a:ln><a:noFill/></a:ln>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="80" w:after="320"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:i/><w:color w:val="555555"/><w:sz w:val="18"/></w:rPr>
    <w:t>${caption}</w:t>
  </w:r>
</w:p>`
  }

  // 6. Inyectar el XML antes de </w:body>
  const docPath = "word/document.xml"
  let docXml    = zip.file(docPath)?.asText() ?? ""

  if (!docXml.includes("</w:body>")) {
    console.error("❌ No se encontró </w:body> en el documento")
    return
  }

  docXml = docXml.replace("</w:body>", sectionXml + "\n</w:body>")
  zip.file(docPath, docXml)

  console.log(`✅ ${mediaItems.length} foto(s) inyectadas en el documento`)
}

// ── Handler principal ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { template_code, data } = await req.json()
    if (!template_code) throw new Error("template_code es requerido")
    if (!data)          throw new Error("data es requerido")

    console.log("📋 Generando documento:", template_code)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Buscar plantilla
    const { data: template, error: tErr } = await supabase
      .from("document_template")
      .select("*")
      .eq("code",      template_code)
      .eq("is_active", true)
      .single()

    if (tErr || !template) throw new Error(`Plantilla no encontrada: ${template_code}`)
    console.log("📄 Plantilla:", template.name)

    // Descargar plantilla
    const { data: fileData, error: dErr } = await supabase
      .storage.from(template.bucket_name).download(template.file_path)

    if (dErr || !fileData) throw new Error(`Error descargando plantilla: ${dErr?.message}`)

    const arrayBuffer = await fileData.arrayBuffer()
    const sig = new Uint8Array(arrayBuffer.slice(0, 2))
    if (sig[0] !== 80 || sig[1] !== 75) throw new Error("El archivo no es un DOCX válido")

    // Preparar datos para docxtemplater (sin fotos — las inyectamos aparte)
    const templateData = {
      consecutive:      data.consecutive      || "",
      title:            data.title            || "",
      location:         data.location         || "",
      objective:        data.objective        || "",
      agenda:           data.agenda           || "",
      development:      data.development      || "",
      created_by_name:  data.created_by_name  || "",
      approved_by_name: data.approved_by_name || "",
      meeting_date: data.meeting_date
        ? new Date(data.meeting_date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
        : "",
      attendees: (data.attendees || []).map((a: any) => ({
        name:     a.name     || "",
        position: a.position || "",
      })),
      commitments: (data.commitments || []).map((c: any) => ({
        activity:         c.activity         || "",
        responsible_name: c.responsible_name || "",
        due_date: c.due_date
          ? new Date(c.due_date).toLocaleDateString("es-CO")
          : "",
      })),
    }

    // Renderizar texto con docxtemplater
    const zip = new PizZip(arrayBuffer)
    const doc = new Docxtemplater(zip, {
      delimiters:    { start: "[[", end: "]]" },
      paragraphLoop: true,
      linebreaks:    true,
      nullGetter:    () => "",
    })

    try {
      doc.render(templateData)
    } catch (e: any) {
      console.error("❌ Error docxtemplater:", e)
      throw new Error(`Error procesando etiquetas del documento: ${e.message}`)
    }

    // Obtener zip renderizado y agregar fotos por OOXML directo
    const renderedZip = doc.getZip()
    const photos = Array.isArray(data.photos) ? data.photos.filter((p: any) => p?.url) : []

    if (photos.length > 0) {
      console.log(`📸 Inyectando ${photos.length} foto(s)...`)
      await injectPhotosIntoDocx(renderedZip, photos)
    }

    // Generar archivo final
    const generatedDoc = renderedZip.generate({
      type:        "arraybuffer",
      compression: "DEFLATE",
    })

    const filename = `${data.consecutive || template_code}_${Date.now()}.docx`
    console.log("✅ Documento generado:", filename)

    return new Response(generatedDoc, {
      headers: {
        ...corsHeaders,
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })

  } catch (error: any) {
    console.error("❌ Error:", error)
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})