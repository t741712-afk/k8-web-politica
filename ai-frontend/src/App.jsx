import { useEffect, useRef, useState } from "react";
import "./index.css";

// API_BASE apunta al prefijo /asistente para que nginx del contenedor
// reciba /api/... y lo proxíe al ppf-ai-backend
const API_BASE = "";

export default function App() {
  const fileInputRef = useRef(null);
  const chatHistoryRef = useRef(null);

  const initialAssistantMessage = {
    role: "assistant",
    content:
      "¡Hola! Soy el asistente virtual del Partido por el Futuro (PPF). Puedo informarte sobre nuestro programa electoral para las elecciones de mayo de 2027, el proceso de afiliación, encuestas y próximos actos. ¿En qué puedo ayudarte?",
  };

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([initialAssistantMessage]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadStage, setUploadStage] = useState("idle");

  const [stats, setStats] = useState({
    incoming_files: 0,
    clean_files: 0,
    quarantine_files: 0,
    blocked_ai_attempts_demo: 0,
    total_ai_events: 0,
    prompt_injection_blocked: 0,
    sensitive_data_request_blocked: 0,
    harmful_output_blocked: 0,
    portal_status: "Operativo",
  });

  const notices = [
    "Presentación del programa electoral completo: 15 de junio de 2026 en Madrid (WiZink Center).",
    "Nueva encuesta activa: ¿Cuál es tu principal preocupación de cara a 2027? Participa ahora.",
    "El PPF supera los 45.000 afiliados. Únete al partido y forma parte del cambio.",
  ];

  const quickActions = [
    { title: "Afiliarse al PPF", subtitle: "Hazte militante desde 5€/mes" },
    { title: "Programa electoral", subtitle: "Consulta nuestras propuestas por área" },
    { title: "Próximos actos", subtitle: "Mítines y jornadas en toda España" },
    { title: "Encuestas ciudadanas", subtitle: "Tu opinión construye nuestro programa" },
  ];

  const suggestedQuestions = [
    "¿Cuál es el programa del PPF en materia de vivienda?",
    "¿Cómo puedo afiliarme al partido?",
    "¿Qué propone el PPF para mejorar la sanidad pública?",
    "¿Cuándo son las próximas elecciones y qué encuestas hay activas?",
  ];

  const propuestas = [
    {
      id: "PROP-EDU-01",
      title: "Educación pública gratuita y de calidad",
      area: "Educación",
      status: "En programa",
      updated: "01/05/2026",
      statusClass: "status-review",
    },
    {
      id: "PROP-VIV-01",
      title: "100.000 viviendas públicas de alquiler asequible",
      area: "Vivienda",
      status: "Propuesta estrella",
      updated: "01/05/2026",
      statusClass: "status-done",
    },
    {
      id: "PROP-ECO-01",
      title: "SMI a 1.400€ y jornada de 37,5h",
      area: "Economía",
      status: "En negociación",
      updated: "15/05/2026",
      statusClass: "status-pending",
    },
  ];

  const securityPillars = [
    {
      title: "Chatbot protegido con IA",
      points: [
        "Validación de entradas y salidas con Trend Vision One AI Guard.",
        "Bloqueo automático de prompt injection y contenido dañino.",
        "Alineado con OWASP Top 10 for LLM Applications y MITRE ATLAS.",
      ],
    },
    {
      title: "Canal documental seguro",
      points: [
        "Análisis antimalware en tiempo real con Trend File Security SDK.",
        "Cuarentena automática de archivos maliciosos.",
        "Trazabilidad completa: hash SHA256, scan ID, versión del motor.",
      ],
    },
    {
      title: "Protección del clúster Kubernetes",
      points: [
        "Trend Vision One Container Security activo en los 3 nodos.",
        "Runtime Security, Vulnerability Scanning y Malware Scanning.",
        "File Integrity Monitoring y Audit Log Collection.",
      ],
    },
  ];

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (!response.ok) throw new Error("No se pudieron cargar estadísticas");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error cargando stats:", error);
      }
    };
    loadStats();
  }, [uploadStatus]);

  const sendChatMessage = async (forcedMessage = null) => {
    const rawMessage = forcedMessage ?? chatInput;
    const trimmedMessage = rawMessage.trim();
    if (!trimmedMessage || chatLoading) return;

    const userMessage = { role: "user", content: trimmedMessage };
    const thinkingMessage = { role: "assistant", content: "Analizando tu consulta...", temporary: true };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (!response.ok) throw new Error("Error en /api/chat");
      const data = await response.json();

      setMessages((prev) => {
        const withoutTemporary = prev.filter((msg) => !msg.temporary);
        return [
          ...withoutTemporary,
          {
            role: "assistant",
            content: data.reply || "El backend no devolvió respuesta.",
            guard_action: data.guard_action || null,
            guard_reason: data.guard_reason || null,
            guard_source: data.guard_source || null,
          },
        ];
      });
    } catch (error) {
      console.error("Error en chatbot:", error);
      setMessages((prev) => {
        const withoutTemporary = prev.filter((msg) => !msg.temporary);
        return [...withoutTemporary, { role: "assistant", content: "No se ha podido conectar con el asistente." }];
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = async (event) => {
    if (event.key === "Enter") await sendChatMessage();
  };

  const handleSuggestedQuestion = async (question) => {
    await sendChatMessage(question);
  };

  const clearConversation = () => {
    setMessages([initialAssistantMessage]);
    setChatInput("");
  };

  const openFileSelector = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelection = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadResult(null);
    setUploadStage("selected");
    setUploadStatus(`Archivo seleccionado: ${file.name}`);
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) {
      setUploadStatus("Primero tienes que seleccionar un archivo.");
      return;
    }
    try {
      setUploadLoading(true);
      setUploadStage("uploading");
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error en /api/files/upload");
      const data = await response.json();
      setUploadResult(data);

      if (data.verdict === "clean") {
        setUploadStage("clean");
        setUploadStatus("Documento analizado y validado correctamente.");
      } else {
        setUploadStage("quarantine");
        setUploadStatus("Archivo bloqueado por política de seguridad.");
      }
    } catch (error) {
      console.error("Error en subida:", error);
      setUploadStage("idle");
      setUploadStatus("No se ha podido subir el archivo.");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="topbar-left">
            <span>Programa electoral</span>
            <span>Encuestas</span>
            <span>Transparencia</span>
          </div>
          <div className="topbar-right">
            <span>Accesibilidad</span>
            <span>Elecciones Mayo 2027</span>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <div className="brand">
            <div className="crest crest-logo">
              <div className="ppf-logo">PPF</div>
            </div>
            <div className="brand-text">
              <div className="eyebrow">Partido por el Futuro</div>
              <h1>Asistente Virtual del PPF</h1>
              <p>Programa electoral, afiliación, encuestas y canal seguro de documentación</p>
            </div>
          </div>
          <div className="header-actions">
            <div className="session-box">Elecciones Generales · Mayo 2027</div>
            <button className="primary-btn">Afiliarse al PPF</button>
          </div>
        </div>

        <nav className="nav">
          <div className="container nav-inner">
            <a href="/">Inicio</a>
            <a href="/asistente" className="active">Asistente IA</a>
            <a href="/#programa">Programa</a>
            <a href="/#afiliacion">Afiliarse</a>
            <a href="/#encuestas">Encuestas</a>
            <a href="/#actos">Actos</a>
          </div>
        </nav>
      </header>

      <main className="container main-content">
        <section className="hero-grid">
          <div className="hero-panel">
            <div className="hero-badge">Portal del militante y ciudadano</div>
            <h2>Chatbot del PPF con IA y canal seguro de documentación</h2>
            <p>
              Consulta nuestro programa electoral para mayo de 2027, infórmate sobre el proceso
              de afiliación, participa en encuestas y sube documentación de forma segura.
              Todo protegido con Trend Vision One AI Guard y File Security.
            </p>
            <div className="hero-buttons">
              <button className="light-btn">Ver programa electoral</button>
              <button className="ghost-btn">Afiliarse al partido</button>
            </div>
          </div>

          <div className="summary-card premium-summary-card">
            <div className="summary-top">
              <div>
                <div className="section-label">Estado del portal</div>
                <h3 className="summary-title">Panel de actividad y protección IA</h3>
                <p className="summary-subtitle">
                  Indicadores en tiempo real del canal documental y del asistente.
                </p>
              </div>
              <div className="portal-status-badge">
                <span className="status-dot-live"></span>
                {stats.portal_status}
              </div>
            </div>

            <div className="premium-kpi-grid">
              <div className="premium-kpi-card kpi-clean">
                <div className="premium-kpi-icon">✓</div>
                <div className="premium-kpi-label">Docs validados</div>
                <div className="premium-kpi-value">{stats.clean_files}</div>
                <div className="premium-kpi-help">Documentos analizados y limpios</div>
              </div>
              <div className="premium-kpi-card kpi-quarantine">
                <div className="premium-kpi-icon">!</div>
                <div className="premium-kpi-label">En cuarentena</div>
                <div className="premium-kpi-value">{stats.quarantine_files}</div>
                <div className="premium-kpi-help">Archivos retenidos por política</div>
              </div>
              <div className="premium-kpi-card kpi-pending">
                <div className="premium-kpi-icon">…</div>
                <div className="premium-kpi-label">Pendientes</div>
                <div className="premium-kpi-value">{stats.incoming_files}</div>
                <div className="premium-kpi-help">Pendientes de análisis</div>
              </div>
              <div className="premium-kpi-card kpi-ai">
                <div className="premium-kpi-icon">AI</div>
                <div className="premium-kpi-label">Bloqueos IA</div>
                <div className="premium-kpi-value">{stats.blocked_ai_attempts_demo}</div>
                <div className="premium-kpi-help">Bloqueados por Trend AI Guard</div>
              </div>
            </div>

            <div className="ai-summary-strip">
              <div className="ai-summary-item">
                <span className="ai-summary-label">Eventos IA totales</span>
                <span className="ai-summary-value">{stats.total_ai_events}</span>
              </div>
              <div className="ai-summary-item">
                <span className="ai-summary-label">Prompt injections bloqueados</span>
                <span className="ai-summary-value">{stats.prompt_injection_blocked}</span>
              </div>
              <div className="ai-summary-item">
                <span className="ai-summary-label">Solicitudes sensibles bloqueadas</span>
                <span className="ai-summary-value">{stats.sensitive_data_request_blocked}</span>
              </div>
              <div className="ai-summary-item">
                <span className="ai-summary-label">Salidas dañinas bloqueadas</span>
                <span className="ai-summary-value">{stats.harmful_output_blocked}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="focus-grid">
          <div className="card featured-chat-card">
            <div className="card-header">
              <div>
                <div className="section-label">Asistente electoral</div>
                <h3>Chatbot del Partido por el Futuro</h3>
              </div>
              <div className="chat-header-actions">
                <div className="tag tag-violet">Llama 3.3 70B · Groq</div>
                <button className="secondary-btn small-btn" onClick={clearConversation}>
                  Nueva conversación
                </button>
              </div>
            </div>

            <div className="chat-area">
              <div className="chat-history" ref={chatHistoryRef}>
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`chat-message ${message.role === "user" ? "user-message" : "bot-message"} ${message.temporary ? "temporary-message" : ""}`}
                  >
                    <div className="chat-role">
                      {message.role === "user" ? "Tú" : "Asistente PPF"}
                    </div>
                    <p>{message.content}</p>
                    {message.role === "assistant" && message.guard_action && message.guard_action !== "allowed" && (
                      <div className="chat-guard-alert">
                        <strong>Trend AI Guard:</strong> {message.guard_reason || "Contenido bloqueado"}
                      </div>
                    )}
                    {message.role === "assistant" && message.guard_action === "allowed" && message.guard_source === "trend_ai_guard" && (
                      <div className="chat-guard-ok">Validado por Trend AI Guard</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="suggested-questions">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    className="suggestion-chip"
                    onClick={() => handleSuggestedQuestion(question)}
                    disabled={chatLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>

              <div className="chat-input-row">
                <input
                  type="text"
                  placeholder="Pregunta sobre el programa, afiliación, encuestas..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                  disabled={chatLoading}
                />
                <button className="primary-btn" onClick={() => sendChatMessage()} disabled={chatLoading}>
                  {chatLoading ? "Enviando..." : "Enviar"}
                </button>
              </div>
              <div className="micro-copy">
                Asistente protegido con Trend Vision One AI Guard
              </div>
            </div>
          </div>

          <div className="card featured-upload-card">
            <div className="card-header">
              <div>
                <div className="section-label">Canal documental</div>
                <h3>Subir documentación al partido</h3>
              </div>
              <div className="tag tag-rose">File Security</div>
            </div>

            <div className="upload-box large-upload-box">
              <div className="upload-icon">↑</div>
              <div className="upload-title">Canal seguro de documentos</div>
              <p>
                Sube encuestas, informes, avales de candidatura, documentación de afiliación
                o cualquier fichero relacionado con el partido. Análisis antimalware en tiempo real.
              </p>

              <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelection} />

              <div className="upload-buttons">
                <button className="primary-btn" onClick={openFileSelector}>Seleccionar archivo</button>
                <button className="secondary-btn" onClick={uploadSelectedFile} disabled={uploadLoading}>
                  {uploadLoading ? "Analizando..." : "Enviar al partido"}
                </button>
              </div>

              <div className="upload-result-box">
                {uploadResult && (
                  <div className={`upload-badge ${uploadResult.verdict === "clean" ? "badge-clean" : "badge-blocked"}`}>
                    {uploadResult.verdict === "clean" ? "✔ Archivo seguro" : "✖ Archivo bloqueado"}
                  </div>
                )}
                <div className="micro-copy upload-status-copy">
                  {uploadStatus || "Canal protegido con Trend Vision One File Security"}
                </div>
              </div>

              <div className="upload-pipeline">
                <div className={`pipeline-step ${uploadStage !== "idle" ? "step-active" : ""}`}>
                  <div className="pipeline-icon">1</div>
                  <div className="pipeline-text">
                    <div className="pipeline-title">Carga</div>
                    <div className="pipeline-subtitle">Selección del fichero</div>
                  </div>
                </div>
                <div className="pipeline-line"></div>
                <div className={`pipeline-step ${["selected","uploading","clean","quarantine"].includes(uploadStage) ? "step-active" : ""}`}>
                  <div className="pipeline-icon">2</div>
                  <div className="pipeline-text">
                    <div className="pipeline-title">Recepción</div>
                    <div className="pipeline-subtitle">Entrada en canal seguro</div>
                  </div>
                </div>
                <div className="pipeline-line"></div>
                <div className={`pipeline-step ${["uploading","clean","quarantine"].includes(uploadStage) ? "step-active" : ""}`}>
                  <div className="pipeline-icon">3</div>
                  <div className="pipeline-text">
                    <div className="pipeline-title">Análisis</div>
                    <div className="pipeline-subtitle">Trend File Security SDK</div>
                  </div>
                </div>
                <div className="pipeline-line"></div>
                <div className={`pipeline-step ${["clean","quarantine"].includes(uploadStage) ? "step-active" : ""} ${uploadStage === "clean" ? "step-clean" : ""} ${uploadStage === "quarantine" ? "step-blocked" : ""}`}>
                  <div className="pipeline-icon">4</div>
                  <div className="pipeline-text">
                    <div className="pipeline-title">Resultado</div>
                    <div className="pipeline-subtitle">
                      {uploadStage === "clean" ? "Validado" : uploadStage === "quarantine" ? "Cuarentena" : "Pendiente"}
                    </div>
                  </div>
                </div>
              </div>

              {uploadResult && (
                <div className="upload-details-card">
                  <div className="upload-details-row"><span className="details-label">Archivo</span><span className="details-value">{uploadResult.filename}</span></div>
                  <div className="upload-details-row"><span className="details-label">Veredicto</span><span className="details-value">{uploadResult.verdict}</span></div>
                  <div className="upload-details-row"><span className="details-label">Tipo</span><span className="details-value">{uploadResult.file_type || "N/D"}</span></div>
                  <div className="upload-details-row"><span className="details-label">Malware</span><span className="details-value">{uploadResult.malware_count ?? "N/D"}</span></div>
                  <div className="upload-details-row"><span className="details-label">Scan ID</span><span className="details-value">{uploadResult.scan_id || "N/D"}</span></div>
                  <div className="upload-details-row"><span className="details-label">Versión scanner</span><span className="details-value">{uploadResult.scanner_version || "N/D"}</span></div>
                  <div className="upload-details-row"><span className="details-label">SHA256</span><span className="details-value details-break">{uploadResult.file_sha256 || "N/D"}</span></div>
                  <div className="upload-details-row"><span className="details-label">Tiempo análisis</span><span className="details-value">{uploadResult.elapsed_time ? `${uploadResult.elapsed_time} µs` : "N/D"}</span></div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="content-grid lower-priority-grid">
          <div className="left-column">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="section-label">Noticias del partido</div>
                  <h3>Últimas novedades PPF</h3>
                </div>
              </div>
              <div className="stack">
                {notices.map((notice) => (
                  <div key={notice} className="notice-item">{notice}</div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="section-label">Programa electoral</div>
                  <h3>Propuestas destacadas</h3>
                </div>
                <button className="secondary-btn">Ver todo el programa</button>
              </div>
              <div className="stack">
                {propuestas.map((item) => (
                  <div key={item.id} className="expediente-item">
                    <div className="expediente-main">
                      <div className="exp-id">{item.id}</div>
                      <div className="exp-title">{item.title}</div>
                      <div className="exp-meta">Área: {item.area} · Actualizado: {item.updated}</div>
                    </div>
                    <div className={`status-pill ${item.statusClass}`}>{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="right-column">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="section-label">Acciones rápidas</div>
                  <h3>Participa con el PPF</h3>
                </div>
              </div>
              <div className="stack">
                {quickActions.map((item) => (
                  <div key={item.title} className="quick-item">
                    <div className="quick-title">{item.title}</div>
                    <div className="quick-subtitle">{item.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="section-label">Seguridad activa</div>
                  <h3>Capas de protección Trend</h3>
                </div>
              </div>
              <div className="stack">
                {securityPillars.map((pillar) => (
                  <div key={pillar.title} className="security-block">
                    <div className="security-title">{pillar.title}</div>
                    <div className="security-points">
                      {pillar.points.map((point) => (
                        <div key={point} className="security-point">
                          <span className="dot"></span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-title">Partido por el Futuro (PPF)</div>
            <p>Portal del militante y ciudadano para las elecciones generales de mayo de 2027.</p>
          </div>
          <div>
            <div className="footer-title">Partido</div>
            <ul>
              <li>Programa electoral</li>
              <li>Candidatos</li>
              <li>Transparencia</li>
            </ul>
          </div>
          <div>
            <div className="footer-title">Contacto</div>
            <ul>
              <li>Tel: 900 XXX XXX</li>
              <li>info@ppf2027.es</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
