# tests/conftest.py
# Fixtures y mocks compartidos para toda la suite de pruebas

import asyncio
import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch


# ── Fixture: mock de websocket del SERVIDOR ──────────────────────────────────

class MockServerWebSocket:
    """Simula un websocket del servidor (websockets lib) para pruebas."""
    def __init__(self, nickname=None):
        self.sent_messages: list[str] = []
        self.nickname = nickname

    async def send(self, data: str):
        self.sent_messages.append(data)

    def last_message(self) -> dict:
        """Retorna el último mensaje enviado como dict."""
        return json.loads(self.sent_messages[-1])

    def all_messages(self) -> list[dict]:
        return [json.loads(m) for m in self.sent_messages]


# ── Fixture: mock de conexión WS del CLIENTE (websockets.connect) ─────────────

class MockClientWebSocket:
    """Simula la conexión WS del cliente hacia el servidor."""
    def __init__(self):
        self.sent_raw: list[str] = []
        self._incoming: asyncio.Queue = asyncio.Queue()

    async def send(self, data: str):
        self.sent_raw.append(data)

    async def recv(self) -> str:
        return await self._incoming.get()

    def push_incoming(self, data: dict):
        """Simula un mensaje que llega desde el servidor."""
        self._incoming.put_nowait(json.dumps(data))

    def last_sent(self) -> dict:
        return json.loads(self.sent_raw[-1])

    def __aiter__(self):
        return self

    async def __anext__(self):
        return await self.recv()


# ── Fixture: mock del servidor completo (para router y core) ─────────────────

class MockChatServer:
    """Servidor mínimo para inyectar en MessageRouter."""
    def __init__(self):
        self.clients: dict = {}


# ── Fixtures pytest ──────────────────────────────────────────────────────────

@pytest.fixture
def server_ws():
    """Websocket de servidor sin nickname previo."""
    return MockServerWebSocket()


@pytest.fixture
def server_ws_registered():
    """Websocket de servidor con nickname ya asignado."""
    return MockServerWebSocket(nickname="alice")


@pytest.fixture
def mock_server():
    return MockChatServer()


@pytest.fixture
def client_ws():
    return MockClientWebSocket()
