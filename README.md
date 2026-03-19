# ChatNet: Architecture & Project Status
Proyecto de Sistema Distribuido P2P/Cliente-Servidor (SD-T2) desarrollado con **Python (FastAPI + WebSockets)** en el backend y una UI construida en **React (Vite + Zustand)**. Se provee de distribución autónoma mediante la empaquetación con **PyInstaller**.

## 🚀 Estado Actual del Proyecto (v1.0)
El sistema actual es completamente funcional en términos de comunicación de texto asíncrona uno a uno.

### ✅ Características Implementadas
1. **Frontend Moderno e Independiente (`gui/`)**:
   * App React construida con TailwindCSS y manejador de estados global (Zustand).
   * Interfaz de registro, login y listado de usuarios moderna (avatares renderizados, indicadores de conexión).
2. **Cliente Proxy Puente (`client/` y `client_app.py`)**:
   * Fachada de **FastAPI** que traduce llamadas HTTP REST (`POST /api/message`, `GET /api/users`) del navegador a payloads WebSockets.
   * Empaquetado en un ejecutable monolítico (`client_app.exe`) usando PyInstaller combinando el código Python junto con los estáticos del build React (`dist/`).
3. **Servidor Central (`server/` y `server_app.py`)**:
   * Enrutamiento asíncrono sobre Python `websockets`.
   * **Base de Datos FlatFile (`users.json`)**: Manejo de persistencia de usuarios, con encriptación SHA-256 para contraseñas.
   * Control de Contactos e imáganes de perfil serializadas nativamente en Base64; las mismas viajan sin requerir HTTP estático por dentro del WebSocket hacia los clientes para rellenar la _Sidebar_ y el _Chat_.

---

## 🏗️ Arquitectura de Comunicación
El sistema no utiliza JSON Web Tokens (JWT) ni sesiones HTTP tradicionales. La **Conexión es la Sesión**. 

```mermaid
graph LR
    subgraph Frontend React
    UI[Navegador JS/TS]
    end
    subgraph Cliente Local (PyInstaller Executable)
    API[FastAPI Local]
    Proxy[WebSocket Client]
    end
    subgraph Servidor Central
    Router[MessageRouter]
    DB[(users.json)]
    end

    UI -- REST HTTP --> API
    API -- Inyecta Payload --> Proxy
    Proxy -- WebSocket WSS/WS --> Router
    Router -- Lee/Escribe --> DB
    Router -- Broadcast de WS --> Proxy
    Proxy -- Emite Evento --> UI
```

---

## 🔮 Roadmap y Tareas Pendientes (TODO)

Si bien la arquitectura principal está solidificada, la aplicación carece de sistemas multimedia pesados o de multidifusión. Las siguientes prioridades deben ser afrontadas en los próximos ciclos de desarrollo.

### 1. Sistema de Envío de Archivos (Attachments) 📎
* **Servidor Central**: Refinar la función asíncrona `_handle_binary` en `server/router.py`. Implementar límite de peso (ej. 10MB) de ser necesario.
* **Protocolo**: Ampliar `shared/protocol.py` para distinguir el mimetype del archivo dentro del enumerador del Payload.
* **Frontend**: Añadir control de _Drag & Drop_ en la ventana de chat y adjuntar inputs `<input type="file" />` en `MessageInput.tsx`. 
* **Proxy**: Permitir que el FastAPI convierta buffers entrantes por POST en datos RAW del socket de su _NetworkTask_.

### 2. Sistema de Creación de Grupos (Multicast) 👥
* Acutalmente la lógica `getOrCreateChat` del Frontend y la ruteadora estática de Python asumen una relación **1:1** (`peerId`).
* **Servidor Central**: Ampliar `users.json` o añadir `groups.json` para gestionar administradores y participantes de cada _room_.
* **Protocolo**: Inyectar nuevos comandos `GROUP_CREATE`, `GROUP_JOIN` y `GROUP_LEAVE`. Enviar mensajes TEXT donde `target` sea el ID del grupo, no de usuario, demandando un _Broadcast Selectivo_ en el router.
* **Frontend**: Expandir la UI de Sidebar para tener una etiqueta separada "GRUPOS", rediseñando la ventana de _Account_ para permitir la creación modal del grupo.

### 3. Ajuste de Aceptación Asíncrona (Implicit Connect) ⚙️
El sistema actual guarda los intentos de primer contacto asíncronos en los registros `contacts` y `pending_incoming` de las variables de persistencia JSON. Sin embargo, por una desincronización residual visual en el React _Store_, parece que los chats operan un auto-acepte general. Se requiere depurar específicamente por qué el frontend reacciona asimilando los saludos entrantes como chats activos en vez de disparar el estado `disabled="true"` de la caja bloqueada hasta que el receptor no conteste de vuelta.
