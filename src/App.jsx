import React, { useState, useEffect } from "react";
import { Download, Play, Check, AlertCircle, Trash2, RefreshCw, Link, FileVideo } from "lucide-react";

// API en producción
const API_BASE = "https://videoapi-copia-production.up.railway.app";

function App() {
  const [downloads, setDownloads] = useState([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Cargar app → traer historial
  useEffect(() => {
    obtenerDescargas();
  }, []);

  // Mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotification({ message: mensaje, type: tipo });
    setTimeout(() => setNotification(null), 4000);
  };

  // Obtener lista de descargas
  const obtenerDescargas = async () => {
    try {
      const response = await fetch(`${API_BASE}/downloads`);
      if (!response.ok) throw new Error("Error al cargar las descargas");
      const data = await response.json();
      setDownloads(data);
    } catch (error) {
      console.error("Error:", error);
      mostrarNotificacion("Error al cargar las descargas", 'error');
    }
  };

  // Iniciar nueva descarga
  const manejarDescarga = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error("Error en la descarga");
      const data = await response.json();

      // Nuevo elemento con estado inicial
      setDownloads((prev) => [
        { id: data.download_id, url, status: "pending", progress: 0 },
        ...prev,
      ]);
      setUrl("");

      // Comenzar a monitorear este download_id
      monitorearEstado(data.download_id);
      mostrarNotificacion("¡Descarga iniciada exitosamente!", 'success');
    } catch (error) {
      console.error("Error:", error);
      mostrarNotificacion("Error al iniciar la descarga", 'error');
    } finally {
      setLoading(false);
    }
  };

  // Monitorear estado de descarga
  const monitorearEstado = (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${id}`);
        const data = await res.json();

        setDownloads((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...data } : d))
        );

        if (data.status === "completed") {
          clearInterval(interval);
          mostrarNotificacion("¡Descarga completada exitosamente!", 'success');
        }
        if (data.status === "error") {
          clearInterval(interval);
          mostrarNotificacion("Error en la descarga", 'error');
        }
      } catch (err) {
        console.error("Error polling:", err);
        clearInterval(interval);
      }
    }, 3000);
  };

  // Forzar descarga directa del archivo
  const guardarArchivo = async (id, filename = "video.mp4") => {
    try {
      const response = await fetch(`${API_BASE}/download/${id}/file`);
      if (!response.ok) throw new Error("Error al obtener el archivo");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      mostrarNotificacion("¡Archivo guardado exitosamente!", 'success');
    } catch (error) {
      console.error("Error al guardar:", error);
      mostrarNotificacion("No se pudo guardar el archivo", 'error');
    }
  };

  // Obtener ícono y color del estado
  const obtenerEstadoVisual = (status) => {
    switch (status) {
      case 'pending':
        return { icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: 'text-yellow-400', text: 'Pendiente' };
      case 'downloading':
        return { icon: <Download className="w-4 h-4" />, color: 'text-blue-400', text: 'Descargando' };
      case 'completed':
        return { icon: <Check className="w-4 h-4" />, color: 'text-green-400', text: 'Completado' };
      case 'error':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400', text: 'Error' };
      default:
        return { icon: <RefreshCw className="w-4 h-4" />, color: 'text-gray-400', text: 'Desconocido' };
    }
  };

  // Formatear visualización de URL
  const formatearUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
  };

  // Manejar presión de tecla Enter
  const manejarTecla = (e) => {
    if (e.key === 'Enter') {
      manejarDescarga();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-900/80 border-green-400/30 text-green-100' 
            : 'bg-red-900/80 border-red-400/30 text-red-100'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <FileVideo className="w-8 h-8" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Descargador de Videos
            </h1>
          </div>
          <p className="text-gray-300 text-lg">Descarga videos de tus plataformas favoritas</p>
        </div>

        {/* Input Section */}
        <div className="w-full max-w-2xl mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={manejarTecla}
                  placeholder="Pega la URL de tu video aquí..."
                  className="w-full pl-12 pr-4 py-4 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={manejarDescarga}
                disabled={loading || !url.trim()}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 min-w-[140px] justify-center"
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
            </div>
          </div>
        </div>

        {/* Downloads List */}
        <div className="w-full max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Descargas Recientes</h2>
            <button
              onClick={obtenerDescargas}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Actualizar descargas"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {downloads.length === 0 ? (
              <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <FileVideo className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 text-lg">No hay descargas aún</p>
                <p className="text-gray-500 text-sm">Comienza agregando una URL de video arriba</p>
              </div>
            ) : (
              downloads.map((d) => {
                const estadoVisual = obtenerEstadoVisual(d.status);
                return (
                  <div
                    key={d.id || d.url}
                    className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg hover:bg-white/15 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`flex items-center gap-2 ${estadoVisual.color}`}>
                            {estadoVisual.icon}
                            <span className="font-medium">{estadoVisual.text}</span>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg text-white mb-1 truncate">
                          {d.title || "Video"}
                        </h3>
                        
                        <p className="text-gray-400 text-sm truncate">
                          {formatearUrl(d.url)}
                        </p>

                        {/* Barra de progreso */}
                        {(d.status === "downloading" || d.status === "completed") && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-300">
                                Progreso: {d.progress || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  d.status === "completed" 
                                    ? "bg-gradient-to-r from-green-400 to-green-500" 
                                    : "bg-gradient-to-r from-blue-400 to-blue-500"
                                }`}
                                style={{ width: `${d.status === "completed" ? 100 : (d.progress || 10)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2">
                        {d.status === "completed" && d.id && (
                          <button
                            onClick={() => guardarArchivo(d.id, `${d.title || "video"}.mp4`)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Guardar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;