# Estado del cliente
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

class ConnectionStatus(str, Enum):
    DISCONNECTED = "DISCONNECTED"
    CONNECTING   = "CONNECTING"
    CONNECTED    = "CONNECTED"
    IN_SESSION   = "IN_SESSION"

@dataclass
class AppState:
    """Estado global del cliente para ser consultado por la API"""
    status: ConnectionStatus = ConnectionStatus.DISCONNECTED
    nickname: str = ""
    avatar_b64: str = ""                             # Avatar del usuario autenticado
    current_peer: Optional[str] = None
    connected_users: List[str] = field(default_factory=list)
    pending_chat_requests: List[str] = field(default_factory=list)

@dataclass
class FileTransferStatus:
    """Seguimiento de una transferencia de archivo activa"""
    filename: str
    total_size: int
    bytes_sent: int = 0
    is_incoming: bool = True
    sender: str = ""