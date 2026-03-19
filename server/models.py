# Estado del servidor (Clientes y Sesiones)
from dataclasses import dataclass, field
from websockets.server import WebSocketServerProtocol

@dataclass
class ClientInfo:
    nickname: str
    websocket: WebSocketServerProtocol
    avatar_b64: str = ""      # Avatar del usuario (base64) para broadcasts de presencia