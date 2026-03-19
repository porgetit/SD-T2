# Lógica de negocio del cliente
# FIX: self.peer actualizado; integrado con AppState
# Transforma eventos del servidor al formato aplanado que espera el frontend React
from .network import NetworkClient
from .events import EventQueue
from .models import AppState, ConnectionStatus
from shared.protocol import Message, MessageType, CommandType


class ChatService:
    def __init__(self):
        self.network = NetworkClient(self._on_incoming)
        self.events  = EventQueue()
        self.state   = AppState()

    # ── Propiedades de conveniencia ────────────────────────────────────────

    @property
    def nickname(self) -> str:
        return self.state.nickname

    @property
    def peer(self) -> str:
        return self.state.current_peer or ""

    def set_peer(self, target: str):
        self.state.current_peer = target

    # ── Transformador de eventos WS ────────────────────────────────────────

    async def _on_incoming(self, data: dict):
        """
        Transforma los mensajes del servidor al formato aplanado {type, sender, payload}
        que espera el frontend React, y los publica en el EventQueue.
        """
        msg_type = data.get("type", "")
        sender   = data.get("sender", "server")
        payload  = data.get("payload", {})
        cmd      = payload.get("command", "")

        # Construir evento aplanado
        if msg_type == "COMMAND" and cmd:
            flat_event = {"type": cmd, "sender": sender, "payload": payload}

            # Actualizar estado local en función del comando
            if cmd == CommandType.AUTH_OK or cmd == CommandType.REGISTER_OK:
                self.state.status = ConnectionStatus.CONNECTED
                if payload.get("avatar_b64"):
                    self.state.avatar_b64 = payload["avatar_b64"]

            elif cmd in (CommandType.AUTH_FAIL, CommandType.REGISTER_FAIL):
                self.state.status = ConnectionStatus.DISCONNECTED

            elif cmd == CommandType.USER_LIST:
                self.state.connected_users = payload.get("users", [])

            elif cmd == CommandType.REQUEST_CHAT:
                self.state.pending_chat_requests.append(sender)

            elif cmd == CommandType.ACCEPT_CHAT:
                # Quien aceptó es el sender del mensaje
                peer = sender
                self.set_peer(peer)
                self.state.status = ConnectionStatus.IN_SESSION

            elif cmd == CommandType.REJECT_CHAT or cmd == CommandType.END_CHAT:
                self.state.current_peer = None
                self.state.status = ConnectionStatus.CONNECTED

        elif msg_type == "TEXT":
            flat_event = {"type": "TEXT", "sender": sender, "payload": payload}

        elif msg_type == "BINARY":
            flat_event = {"type": "BINARY", "sender": sender, "payload": payload}

        else:
            flat_event = data  # pass-through para eventos no reconocidos

        await self.events.publish(flat_event)

    # ── Acciones ───────────────────────────────────────────────────────────

    async def connect_to_server(self, url: str, nickname: str, password: str):
        self.state.nickname = nickname
        self.state.status   = ConnectionStatus.CONNECTING
        await self.network.connect(url)
        msg = Message(
            type=MessageType.COMMAND,
            sender=nickname,
            payload={"command": CommandType.AUTH_LOGIN, "nickname": nickname, "password": password}
        )
        await self.network.send(msg)

    async def register_on_server(self, url: str, nickname: str, password: str, avatar_b64: str = ""):
        """Crear cuenta nueva en el servidor y luego hacer login."""
        self.state.nickname = nickname
        self.state.status   = ConnectionStatus.CONNECTING
        await self.network.connect(url)
        msg = Message(
            type=MessageType.COMMAND,
            sender=nickname,
            payload={"command": CommandType.AUTH_REGISTER, "nickname": nickname,
                     "password": password, "avatar_b64": avatar_b64}
        )
        await self.network.send(msg)

    async def request_chat(self, target: str):
        msg = Message(
            type=MessageType.COMMAND,
            sender=self.nickname,
            payload={"command": CommandType.REQUEST_CHAT, "target": target}
        )
        self.set_peer(target)
        await self.network.send(msg)

    async def accept_chat(self):
        """Acepta la primera solicitud pendiente."""
        requests = self.state.pending_chat_requests
        if not requests:
            return
        target = requests.pop(0)
        self.set_peer(target)
        self.state.status = ConnectionStatus.IN_SESSION
        msg = Message(
            type=MessageType.COMMAND,
            sender=self.nickname,
            payload={"command": CommandType.ACCEPT_CHAT, "target": target}
        )
        await self.network.send(msg)

    async def reject_chat(self):
        """Rechaza la primera solicitud pendiente."""
        requests = self.state.pending_chat_requests
        if not requests:
            return
        target = requests.pop(0)
        msg = Message(
            type=MessageType.COMMAND,
            sender=self.nickname,
            payload={"command": CommandType.REJECT_CHAT, "target": target}
        )
        await self.network.send(msg)

    async def send_text(self, target: str, text: str):
        msg = Message(
            type=MessageType.TEXT,
            sender=self.nickname,
            payload={"text": text, "target": target}
        )
        await self.network.send(msg)

    async def end_chat(self):
        if self.peer:
            msg = Message(
                type=MessageType.COMMAND,
                sender=self.nickname,
                payload={"command": CommandType.END_CHAT, "target": self.peer}
            )
            await self.network.send(msg)
        self.state.current_peer = None
        self.state.status       = ConnectionStatus.CONNECTED

    async def update_profile(self, password: str = None, avatar_b64: str = None):
        payload: dict = {"command": CommandType.UPDATE_PROFILE}
        if password:   payload["password"]   = password
        if avatar_b64: payload["avatar_b64"] = avatar_b64
        msg = Message(
            type=MessageType.COMMAND,
            sender=self.nickname,
            payload=payload
        )
        await self.network.send(msg)

    async def disconnect(self):
        """Cierra la conexión WebSocket."""
        if self.network.ws:
            await self.network.ws.close()
            self.network.ws = None
        self.state.status = ConnectionStatus.DISCONNECTED


