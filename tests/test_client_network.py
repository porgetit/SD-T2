# tests/test_client_network.py
# Pruebas para client/network.py (NetworkClient)

import asyncio
import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from client.network import NetworkClient
from shared.protocol import Message, MessageType, CommandType


# ── Fixtures ───────────────────────────────────────────────────────────────

class MockWS:
    """Mock de websocket retornado por websockets.connect()."""
    def __init__(self, incoming: list[dict] = None):
        self.sent_raw: list[str] = []
        self._incoming = asyncio.Queue()
        for msg in (incoming or []):
            self._incoming.put_nowait(json.dumps(msg))

    async def send(self, data: str):
        self.sent_raw.append(data)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return self._incoming.get_nowait()
        except asyncio.QueueEmpty:
            raise StopAsyncIteration


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_connect_calls_websockets_connect():
    """connect() debe intentar conectarse a la URL dada."""
    mock_ws    = MockWS()
    received   = []
    callback   = AsyncMock()

    with patch("client.network.websockets.connect", return_value=mock_ws) as mock_conn:
        # Hacemos que connect sea un asynccontextmanager-like o coroutine
        mock_conn.return_value = mock_ws
        client = NetworkClient(callback)
        # Patch connect para no abrir socket real
        import websockets as ws_lib
        with patch.object(ws_lib, "connect", new=AsyncMock(return_value=mock_ws)):
            await client.connect("ws://localhost:5000")

    assert client.ws == mock_ws


@pytest.mark.asyncio
async def test_send_serializes_message():
    """send() debe serializar el Message y enviarlo por el websocket."""
    callback = AsyncMock()
    client   = NetworkClient(callback)
    mock_ws  = MockWS()
    client.ws = mock_ws

    msg = Message(
        type=MessageType.COMMAND,
        sender="alice",
        payload={"command": CommandType.REGISTER, "nickname": "alice"}
    )

    await client.send(msg)

    assert len(mock_ws.sent_raw) == 1
    parsed = json.loads(mock_ws.sent_raw[0])
    assert parsed["sender"]  == "alice"
    assert parsed["type"]    == "COMMAND"


@pytest.mark.asyncio
async def test_send_without_connection_does_not_crash():
    """send() sin ws activo (ws=None) no debe lanzar excepción."""
    callback = AsyncMock()
    client   = NetworkClient(callback)
    client.ws = None

    msg = Message(type=MessageType.TEXT, sender="x", payload={"text": "hi", "target": "y"})
    await client.send(msg)   # No debería hacer nada
    callback.assert_not_called()


@pytest.mark.asyncio
async def test_listen_calls_callback_for_each_message():
    """_listen debe invocar el callback por cada mensaje que llega del servidor."""
    messages = [
        {"type": "TEXT",    "sender": "bob",    "payload": {"text": "hola", "target": "alice"}},
        {"type": "COMMAND", "sender": "server", "payload": {"command": "USER_LIST", "users": []}},
    ]
    mock_ws  = MockWS(incoming=messages)
    received = []

    async def callback(data):
        received.append(data)

    client    = NetworkClient(callback)
    client.ws = mock_ws

    await client._listen()

    assert len(received) == 2
    assert received[0]["type"] == "TEXT"
    assert received[1]["type"] == "COMMAND"
