"use client"

import { useState, useEffect } from "react"
import { Download, Check, AlertCircle, RefreshCw, Link, FileVideo, Monitor, Smartphone, Video } from "lucide-react"

// API en producción
const API_BASE = "https://videoapi-copia-production.up.railway.app"

function App() {
  const [downloads, setDownloads] = useState([])
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingFormats, setLoadingFormats] = useState(false)
  const [notification, setNotification] = useState(null)
  const [availableFormats, setAvailableFormats] = useState(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [selectedFormat, setSelectedFormat] = useState("")

  // Cargar app → traer historial
  useEffect(() => {
    obtenerDescargas()
  }, [])

  // Mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = "success") => {
    setNotification({ message: mensaje, type: tipo })
    setTimeout(() => setNotification(null), 4000)
  }

  // Obtener lista de descargas
  const obtenerDescargas = async () => {
    try {
      const response = await fetch(`${API_BASE}/downloads`)
      if (!response.ok) throw new Error("Error al cargar las descargas")
      const data = await response.json()
      setDownloads(data)
    } catch (error) {
      console.error("Error:", error)
      mostrarNotificacion("Error al cargar las descargas", "error")
    }
  }

  // Obtener formatos disponibles
  const obtenerFormatos = async () => {
    if (!url.trim()) return

    setLoadingFormats(true)
    try {
      const encodedUrl = encodeURIComponent(url)
      const response = await fetch(`${API_BASE}/formats/${encodedUrl}`)

      if (!response.ok) throw new Error("Error al obtener formatos")

      const data = await response.json()
      setAvailableFormats(data.formats)
      setVideoTitle(data.title)

      // Seleccionar automáticamente el primer formato como predeterminado
      if (data.formats && data.formats.length > 0) {
        setSelectedFormat(data.formats[0].format_id)
      }

      mostrarNotificacion("Formatos cargados exitosamente", "success")
    } catch (error) {
      console.error("Error:", error)
      mostrarNotificacion("Error al obtener los formatos del video", "error")
      setAvailableFormats(null)
      setVideoTitle("")
    } finally {
      setLoadingFormats(false)
    }
  }

  // Iniciar nueva descarga con formato específico
  const manejarDescarga = async () => {
    if (!url.trim() || !selectedFormat) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          format: selectedFormat,
        }),
      })

      if (!response.ok) throw new Error("Error en la descarga")
      const data = await response.json()

      // Nuevo elemento con estado inicial
      setDownloads((prev) => [
        {
          id: data.download_id,
          url,
          title: videoTitle || "Video",
          status: "pending",
          progress: 0,
          format: selectedFormat,
        },
        ...prev,
      ])

      // Limpiar formulario
      setUrl("")
      setAvailableFormats(null)
      setVideoTitle("")
      setSelectedFormat("")

      // Comenzar a monitorear este download_id
      monitorearEstado(data.download_id)
      mostrarNotificacion("¡Descarga iniciada exitosamente!", "success")
    } catch (error) {
      console.error("Error:", error)
      mostrarNotificacion("Error al iniciar la descarga", "error")
    } finally {
      setLoading(false)
    }
  }

  // Monitorear estado de descarga
  const monitorearEstado = (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${id}`)
        const data = await res.json()

        setDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)))

        if (data.status === "completed") {
          clearInterval(interval)
          mostrarNotificacion("¡Descarga completada exitosamente!", "success")
        }
        if (data.status === "error") {
          clearInterval(interval)
          mostrarNotificacion("Error en la descarga", "error")
        }
      } catch (err) {
        console.error("Error polling:", err)
        clearInterval(interval)
      }
    }, 3000)
  }

  // Forzar descarga directa del archivo
  const guardarArchivo = async (id, filename = "video.mp4") => {
    try {
      const response = await fetch(`${API_BASE}/download/${id}/file`)
      if (!response.ok) throw new Error("Error al obtener el archivo")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      mostrarNotificacion("¡Archivo guardado exitosamente!", "success")
    } catch (error) {
      console.error("Error al guardar:", error)
      mostrarNotificacion("No se pudo guardar el archivo", "error")
    }
  }

  // Obtener ícono y color del estado
  const obtenerEstadoVisual = (status) => {
    switch (status) {
      case "pending":
        return { icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: "text-yellow-400", text: "Pendiente" }
      case "downloading":
        return { icon: <Download className="w-4 h-4" />, color: "text-blue-400", text: "Descargando" }
      case "completed":
        return { icon: <Check className="w-4 h-4" />, color: "text-green-400", text: "Completado" }
      case "error":
        return { icon: <AlertCircle className="w-4 h-4" />, color: "text-red-400", text: "Error" }
      default:
        return { icon: <RefreshCw className="w-4 h-4" />, color: "text-gray-400", text: "Desconocido" }
    }
  }

  // Formatear visualización de URL
  const formatearUrl = (url) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname + urlObj.pathname
    } catch {
      return url.length > 50 ? url.substring(0, 50) + "..." : url
    }
  }

  // Obtener ícono de calidad
  const obtenerIconoCalidad = (resolution) => {
    if (!resolution) return <Video className="w-4 h-4" />

    const height = Number.parseInt(resolution.split("x")[1])
    if (height >= 1080) return <Monitor className="w-4 h-4 text-green-400" />
    if (height >= 720) return <Monitor className="w-4 h-4 text-blue-400" />
    return <Smartphone className="w-4 h-4 text-yellow-400" />
  }

  // Manejar presión de tecla Enter
  const manejarTecla = (e) => {
    if (e.key === "Enter") {
      if (!availableFormats) {
        obtenerFormatos()
      } else if (selectedFormat) {
        manejarDescarga()
      }
    }
  }

  // Cancelar selección de formatos
  const cancelarSeleccion = () => {
    setAvailableFormats(null)
    setVideoTitle("")
    setSelectedFormat("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgb(59 130 246 / 0.1) 0%, transparent 50%), 
                           radial-gradient(circle at 75% 75%, rgb(147 51 234 / 0.1) 0%, transparent 50%)`,
          }}
        ></div>
      </div>

      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
            notification.type === "success"
              ? "bg-white border-emerald-200 text-emerald-800 shadow-emerald-100"
              : "bg-white border-red-200 text-red-800 shadow-red-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1 rounded-full ${notification.type === "success" ? "bg-emerald-100" : "bg-red-100"}`}>
              {notification.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center p-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/25">
              <FileVideo className="w-10 h-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-slate-900 mb-1">Video Downloader</h1>
              <p className="text-slate-600 text-lg">Descarga videos de alta calidad</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-3xl mb-12">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-900/5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <Link className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={manejarTecla}
                  placeholder="Pega la URL de tu video aquí..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {!availableFormats ? (
                <button
                  onClick={obtenerFormatos}
                  disabled={loadingFormats || !url.trim()}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 flex items-center gap-3 min-w-[160px] justify-center text-white"
                >
                  {loadingFormats ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Ver Formatos
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={manejarDescarga}
                  disabled={loading || !selectedFormat}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 flex items-center gap-3 min-w-[160px] justify-center text-white"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Descargar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {availableFormats && (
          <div className="w-full max-w-3xl mb-12">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Seleccionar Formato</h3>
                <button
                  onClick={cancelarSeleccion}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {videoTitle && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-slate-500 text-sm font-medium mb-1">Título del video:</p>
                  <p className="text-slate-900 font-semibold truncate">{videoTitle}</p>
                </div>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {availableFormats.map((format, index) => (
                  <label
                    key={`${format.format_id}-${index}`}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                      selectedFormat === format.format_id
                        ? "bg-blue-50 border-blue-200 shadow-md shadow-blue-100"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="format"
                        value={format.format_id}
                        checked={selectedFormat === format.format_id}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        {obtenerIconoCalidad(format.resolution)}
                        <div>
                          <span className="font-semibold text-slate-900">
                            {format.quality_label || `${format.ext.toUpperCase()}`}
                          </span>
                          {format.resolution && <p className="text-sm text-slate-500">{format.resolution}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded-lg">
                        {format.ext.toUpperCase()}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Historial de Descargas</h2>
            <button
              onClick={obtenerDescargas}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors shadow-sm"
              title="Actualizar descargas"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="space-y-4">
            {downloads.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="p-4 bg-slate-100 rounded-3xl w-fit mx-auto mb-6">
                  <FileVideo className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-slate-600 text-xl font-semibold mb-2">No hay descargas aún</p>
                <p className="text-slate-500">Comienza agregando una URL de video arriba</p>
              </div>
            ) : (
              downloads.map((d) => {
                const estadoVisual = obtenerEstadoVisual(d.status)
                return (
                  <div
                    key={d.id || d.url}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-xl font-medium text-sm ${
                              d.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : d.status === "downloading"
                                  ? "bg-blue-100 text-blue-700"
                                  : d.status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {estadoVisual.icon}
                            <span>{estadoVisual.text}</span>
                          </div>
                          {d.format && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">
                              {d.format}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-xl text-slate-900 mb-2 truncate">{d.title || "Video"}</h3>

                        <p className="text-slate-500 text-sm truncate font-medium">{formatearUrl(d.url)}</p>

                        {(d.status === "downloading" || d.status === "completed") && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Progreso: {d.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  d.status === "completed" ? "bg-emerald-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${d.status === "completed" ? 100 : d.progress || 10}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {d.status === "completed" && d.id && (
                          <button
                            onClick={() => guardarArchivo(d.id, `${d.title || "video"}.mp4`)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Guardar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
