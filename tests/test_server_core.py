# tests/test_server_core.py
# Pruebas para server/core.py (con mocks del router y websocket)

import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from server.core import ChatServer


# ── Helpers ────────────────────────────────────────────────────────────────

class MockWebSocket:
    """Simula un websocket de un cliente conectado."""
    def __init__(self, messages: list[dict]):
        self._messages = [json.dumps(m) for m in messages]
        self._idx = 0
        self.nickname = None
        self.sent = []

    async def send(self, data: str):
        self.sent.append(data)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._idx >= len(self._messages):
            raise StopAsyncIteration
        msg = self._messages[self._idx]
        self._idx += 1
        return msg


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_handle_connection_calls_router_dispatch():
    """handle_connection debe llamar a router.dispatch para cada mensaje recibido."""
    server = ChatServer("0.0.0.0", 5000)

    msg = {"type": "COMMAND", "sender": "alice", "payload": {"command": "REGISTER", "nickname": "alice"}}
    ws  = MockWebSocket([msg])

    # Patcheamos el dispatch para que retorne "alice" (nickname registrado)
    server.router.dispatch = AsyncMock(return_value="alice")

    await server.handle_connection(ws)

    server.router.dispatch.assert_called_once_with(json.loads(json.dumps(msg)), ws)


@pytest.mark.asyncio
async def test_handle_connection_cleans_up_on_disconnect():
    """Al desconectarse, el nickname debe eliminarse de self.clients."""
    import websockets.exceptions

    server = ChatServer("0.0.0.0", 5000)

    class FaultyWS:
        def __init__(self):
            self.nickname = "alice"
            self._first = True

        def __aiter__(self):
            return self

        async def __anext__(self):
            if self._first:
                self._first = False
                return json.dumps({"type": "COMMAND", "sender": "alice",
                                   "payload": {"command": "REGISTER", "nickname": "alice"}})
            raise websockets.exceptions.ConnectionClosed(None, None)

    ws = FaultyWS()
    server.clients["alice"] = MagicMock()          # Simula cliente ya registrado
    server.router.dispatch = AsyncMock(return_value="alice")

    await server.handle_connection(ws)

    assert "alice" not in server.clients


@pytest.mark.asyncio
async def test_handle_connection_no_crash_on_unknown_nickname():
    """Si nickname es None (dispatch retorna None), el finally no debe lanzar KeyError."""
    server = ChatServer("0.0.0.0", 5000)
    ws     = MockWebSocket([{"type": "BINARY", "sender": "x", "payload": {"chunk": "", "target": "y"}}])

    server.router.dispatch = AsyncMock(return_value=None)

    # No debe lanzar excepción
    await server.handle_connection(ws)


def test_server_init():
    """ChatServer se inicializa con los atributos correctos."""
    server = ChatServer("127.0.0.1", 9999)
    assert server.host    == "127.0.0.1"
    assert server.port    == 9999
    assert server.clients == {}
    assert server.router  is not None
