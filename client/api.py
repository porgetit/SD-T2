# Fachada FastAPI — API completa para el frontend React
# Rutas bajo /api según lo que espera el frontend React.
# El WS local se expone como /ws (el proxy de Vite redirige /ws durante dev).
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .service import ChatService
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="ChatNet Client API")
service = ChatService()

# ── Servir archivos estáticos del frontend compilado ────────────────────────
_DIST = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

# ── Modelos de Request ───────────────────────────────────────────────────────

class RegisterReq(BaseModel):
    server_url: str
    username: str
    password: str
    avatar_b64: Optional[str] = ""

class ConnectReq(BaseModel):
    server_url: str
    nickname: str
    password: str

class ChatReq(BaseModel):
    target: str

class MessageReq(BaseModel):
    target: str
    text: str

class AccountReq(BaseModel):
    username: str
    password: Optional[str] = None
    avatar_b64: Optional[str] = None

# ── Autenticación ────────────────────────────────────────────────────────────

@app.post("/api/register", summary="Registrar una cuenta nueva en el servidor")
async def register(req: RegisterReq):
    """Crea la cuenta en el servidor. La confirmación llega por WebSocket (AUTH_OK)."""
    await service.register_on_server(
        req.server_url, req.username, req.password, req.avatar_b64 or ""
    )
    return {"status": "pending"}

@app.post("/api/connect", summary="Iniciar sesión en el servidor")
async def connect(req: ConnectReq):
    """Autentica al usuario. La confirmación llega por WebSocket (AUTH_OK)."""
    await service.connect_to_server(req.server_url, req.nickname, req.password)
    return {"status": "pending"}

@app.post("/api/disconnect", summary="Cerrar sesión")
async def disconnect():
    await service.disconnect()
    return {"status": "ok"}

# ── Estado y usuarios ────────────────────────────────────────────────────────

@app.get("/api/state", summary="Estado actual del cliente")
async def get_state():
    """Shape exacto que espera el frontend: {connection, nickname, peer, known_users}."""
    return {
        "connection":  service.state.status,
        "nickname":    service.state.nickname,
        "avatar_b64":  service.state.avatar_b64,
        "peer":        service.state.current_peer or "",
        "known_users": service.state.connected_users,
    }

@app.get("/api/users", summary="Lista de usuarios conectados al servidor")
async def list_users():
    from shared.protocol import Message, MessageType, CommandType
    msg = Message(
        type=MessageType.COMMAND,
        sender=service.nickname,
        payload={"command": CommandType.LIST_USERS}
    )
    await service.network.send(msg)
    return {"users": service.state.connected_users}

# ── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/api/chat/request", summary="Solicitar chat con un usuario")
async def request_chat(req: ChatReq):
    await service.request_chat(req.target)
    return {"status": "ok"}

@app.post("/api/chat/accept", summary="Aceptar solicitud de chat entrante")
async def accept_chat():
    await service.accept_chat()
    return {"status": "ok"}

@app.post("/api/chat/reject", summary="Rechazar solicitud de chat entrante")
async def reject_chat():
    await service.reject_chat()
    return {"status": "ok"}

@app.post("/api/chat/end", summary="Finalizar el chat actual")
async def end_chat():
    await service.end_chat()
    return {"status": "ok"}

# ── Mensajes ─────────────────────────────────────────────────────────────────

@app.post("/api/message", summary="Enviar mensaje de texto al peer actual")
async def send_message(req: MessageReq):
    await service.send_text(req.target, req.text)
    return {"status": "ok"}

@app.post("/api/send", summary="Alias de /api/message (legacy, query param)")
async def send_legacy(text: str = Query(...)):
    await service.send_text(text)
    return {"status": "ok"}

# ── Cuenta ────────────────────────────────────────────────────────────────────

@app.put("/api/account", summary="Actualizar perfil (username/password/avatar)")
async def update_account(req: AccountReq):
    await service.update_profile(
        password   = req.password or None,
        avatar_b64 = req.avatar_b64 or None,
    )
    return {"status": "ok"}

# ── WebSocket de eventos en tiempo real ──────────────────────────────────────

@app.websocket("/ws")
async def ws_local(websocket: WebSocket):
    """Canal de eventos en tiempo real. Emite {type, sender, payload} aplanado."""
    await websocket.accept()
    queue = service.events.subscribe()
    try:
        while True:
            event = await queue.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        service.events.unsubscribe(queue)

# ── SPA fallback ──────────────────────────────────────────────────────────────

@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    """Sirve index.html para el routing de React Router en producción."""
    index = os.path.join(_DIST, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return {"error": "Frontend no compilado. Ejecuta 'npm run build' en gui/."}