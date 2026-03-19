# Definición de mensajes y comandos (Pydantic)
from enum import Enum
from pydantic import BaseModel
from typing import Any, Optional

class MessageType(str, Enum):
    TEXT    = "TEXT"
    COMMAND = "COMMAND"
    BINARY  = "BINARY"

class CommandType(str, Enum):
    # ── Presencia ──────────────────────────────────────────────────
    REGISTER        = "REGISTER"
    REGISTER_OK     = "REGISTER_OK"
    REGISTER_FAIL   = "REGISTER_FAIL"
    LIST_USERS      = "LIST_USERS"
    USER_LIST       = "USER_LIST"
    USER_JOINED     = "USER_JOINED"       # broadcast al conectarse
    USER_LEFT       = "USER_LEFT"         # broadcast al desconectarse
    # ── Autenticación ──────────────────────────────────────────────
    AUTH_REGISTER   = "AUTH_REGISTER"     # crear cuenta persistida
    AUTH_LOGIN      = "AUTH_LOGIN"        # autenticar con credenciales
    AUTH_OK         = "AUTH_OK"           # respuesta exitosa (retorna perfil)
    AUTH_FAIL       = "AUTH_FAIL"         # respuesta de error
    UPDATE_PROFILE  = "UPDATE_PROFILE"    # actualizar avatar / contraseña
    # ── Chat ───────────────────────────────────────────────────────
    REQUEST_CHAT    = "REQUEST_CHAT"
    ACCEPT_CHAT     = "ACCEPT_CHAT"
    REJECT_CHAT     = "REJECT_CHAT"
    END_CHAT        = "END_CHAT"
    # ── Archivos ───────────────────────────────────────────────────
    REQ_SEND_FILES  = "REQ_SEND_FILES"
    ACCEPT_FILES    = "ACCEPT_FILES"
    REJECT_FILES    = "REJECT_FILES"
    FILES_RECEIVED  = "FILES_RECEIVED"

class Message(BaseModel):
    type: MessageType
    sender: str
    payload: dict[str, Any]