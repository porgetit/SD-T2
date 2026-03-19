# server/user_store.py
# Persistencia de usuarios en disco (users.json)
# Modelo: { nickname, password_hash, avatar_b64, created_at }

import json
import hashlib
import os
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional

# Ruta del archivo de base de datos
_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "users.json")


@dataclass
class UserRecord:
    nickname: str
    password_hash: str
    avatar_b64: str = ""
    created_at: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "UserRecord":
        return UserRecord(
            nickname    = d["nickname"],
            password_hash = d["password_hash"],
            avatar_b64  = d.get("avatar_b64", ""),
            created_at  = d.get("created_at", ""),
        )


def _hash_password(password: str) -> str:
    """SHA-256 del password. Sin salt — suficiente para sistema educativo."""
    return hashlib.sha256(password.encode()).hexdigest()


def _load_db() -> dict[str, UserRecord]:
    """Carga el archivo users.json. Retorna dict vacío si no existe."""
    if not os.path.exists(_DB_PATH):
        return {}
    try:
        with open(_DB_PATH, "r", encoding="utf-8") as f:
            raw: dict = json.load(f)
        return {k: UserRecord.from_dict(v) for k, v in raw.items()}
    except (json.JSONDecodeError, KeyError):
        return {}


def _save_db(db: dict[str, UserRecord]) -> None:
    """Escribe el estado actual al archivo users.json."""
    with open(_DB_PATH, "w", encoding="utf-8") as f:
        json.dump({k: v.to_dict() for k, v in db.items()}, f, indent=2, ensure_ascii=False)


# ── API pública ─────────────────────────────────────────────────────────────

def register(nickname: str, password: str, avatar_b64: str = "") -> tuple[bool, str]:
    """
    Registra un nuevo usuario.
    Retorna (True, "") si tuvo éxito, o (False, motivo) si falló.
    """
    if not nickname or len(nickname) < 3:
        return False, "El nickname debe tener al menos 3 caracteres."
    if not password or len(password) < 6:
        return False, "La contraseña debe tener al menos 6 caracteres."

    db = _load_db()
    if nickname in db:
        return False, "El nickname ya está registrado."

    db[nickname] = UserRecord(
        nickname      = nickname,
        password_hash = _hash_password(password),
        avatar_b64    = avatar_b64,
        created_at    = datetime.utcnow().isoformat(),
    )
    _save_db(db)
    return True, ""


def authenticate(nickname: str, password: str) -> tuple[bool, Optional[UserRecord]]:
    """
    Verifica credenciales.
    Retorna (True, UserRecord) si son válidas, (False, None) si no.
    """
    db = _load_db()
    record = db.get(nickname)
    if record is None:
        return False, None
    if record.password_hash != _hash_password(password):
        return False, None
    return True, record


def get_user(nickname: str) -> Optional[UserRecord]:
    """Retorna el UserRecord de un nickname, o None si no existe."""
    return _load_db().get(nickname)


def update_user(nickname: str, new_password: Optional[str] = None, avatar_b64: Optional[str] = None) -> bool:
    """
    Actualiza el perfil de un usuario existente.
    Retorna True si el usuario existe y se actualizó.
    """
    db = _load_db()
    record = db.get(nickname)
    if record is None:
        return False

    if new_password:
        if len(new_password) >= 6:
            record.password_hash = _hash_password(new_password)
    if avatar_b64 is not None:
        record.avatar_b64 = avatar_b64

    _save_db(db)
    return True
