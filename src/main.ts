import { parseKmz } from './kmz'
import { render } from './renderer'
import type { Feature } from './types'

const dropPhoto = document.getElementById('drop-photo') as HTMLDivElement
const dropKmz = document.getElementById('drop-kmz') as HTMLDivElement
const photoInput = document.getElementById('photo-input') as HTMLInputElement
const kmzInput = document.getElementById('kmz-input') as HTMLInputElement
const titleInput = document.getElementById('title-input') as HTMLInputElement
const subtitleInput = document.getElementById('subtitle-input') as HTMLInputElement
const photoName = document.getElementById('photo-name') as HTMLSpanElement
const kmzName = document.getElementById('kmz-name') as HTMLSpanElement
const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLDivElement
const loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement
const canvas = document.getElementById('map-canvas') as HTMLCanvasElement
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLParagraphElement

let photoFile: File | null = null
let kmzFile: File | null = null
let textTimer: ReturnType<typeof setTimeout> | null = null

function setStatus(msg: string) {
  statusEl.textContent = msg
}

function setFile(type: 'photo' | 'kmz', file: File) {
  if (type === 'photo') {
    photoFile = file
    photoName.textContent = file.name
    dropPhoto.classList.add('selected')
  } else {
    kmzFile = file
    kmzName.textContent = file.name
    dropKmz.classList.add('selected')
  }
  if (photoFile && kmzFile) generate()
}

async function generate() {
  if (!photoFile || !kmzFile) return
  setStatus('読み込み中...')
  downloadBtn.disabled = true

  const isFirstRender = !canvasWrapper.classList.contains('visible')
  if (!isFirstRender) {
    loadingOverlay.classList.add('active')
  }

  try {
    const features: Feature[] = await parseKmz(kmzFile)
    if (features.length === 0) throw new Error('Placemark が見つかりませんでした')

    setStatus('描画中...')
    await render(canvas, photoFile, features, titleInput.value.trim(), subtitleInput.value.trim())
    canvasWrapper.classList.add('visible')
    downloadBtn.disabled = false
    setStatus('')
  } catch (e) {
    setStatus(`エラー: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    loadingOverlay.classList.remove('active')
  }
}

function scheduleGenerate() {
  if (!photoFile || !kmzFile) return
  if (textTimer) clearTimeout(textTimer)
  textTimer = setTimeout(generate, 600)
}

function bindDropArea(el: HTMLDivElement, input: HTMLInputElement, type: 'photo' | 'kmz') {
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over') })
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'))
  el.addEventListener('drop', e => {
    e.preventDefault()
    el.classList.remove('drag-over')
    const file = e.dataTransfer?.files[0]
    if (file) setFile(type, file)
  })
  el.addEventListener('click', () => input.click())
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) setFile(type, file)
  })
}

bindDropArea(dropPhoto, photoInput, 'photo')
bindDropArea(dropKmz, kmzInput, 'kmz')

titleInput.addEventListener('input', scheduleGenerate)
subtitleInput.addEventListener('input', scheduleGenerate)

downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = 'map.png'
  a.click()
})
