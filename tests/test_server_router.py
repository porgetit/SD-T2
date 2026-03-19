# tests/test_server_router.py
# Pruebas para server/router.py (con mocks de websocket y servidor)

import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock
from tests.conftest import MockChatServer, MockServerWebSocket
from server.router import MessageRouter
from server.models import ClientInfo
from shared.protocol import MessageType, CommandType


# ── Helpers ────────────────────────────────────────────────────────────────

def make_raw(type_: str, sender: str, payload: dict) -> dict:
    """Construye un dict de mensaje (equivalente al json.loads de core.py)."""
    return {"type": type_, "sender": sender, "payload": payload}


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def router():
    server = MockChatServer()
    return MessageRouter(server), server


# ── Tests: REGISTER ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_new_user(router):
    """Registrar un usuario nuevo debe agregarlo a clients y responder REGISTER_OK."""
    rt, server = router
    ws = MockServerWebSocket()
    raw = make_raw("COMMAND", "alice", {"command": "REGISTER", "nickname": "alice"})

    nickname = await rt.dispatch(raw, ws)

    assert nickname == "alice"
    assert "alice" in server.clients
    assert isinstance(server.clients["alice"], ClientInfo)
    assert ws.last_message()["payload"]["command"] == CommandType.REGISTER_OK


@pytest.mark.asyncio
async def test_register_duplicate_nickname(router):
    """Registrar un nickname ya tomado debe responder REGISTER_FAIL."""
    rt, server = router
    ws1 = MockServerWebSocket(nickname="alice")
    server.clients["alice"] = ClientInfo(nickname="alice", websocket=ws1)

    ws2 = MockServerWebSocket()
    raw = make_raw("COMMAND", "alice", {"command": "REGISTER", "nickname": "alice"})

    nickname = await rt.dispatch(raw, ws2)

    assert nickname is None
    assert ws2.last_message()["payload"]["command"] == CommandType.REGISTER_FAIL


# ── Tests: LIST_USERS ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users(router):
    """LIST_USERS debe retornar todos los nicknames en clients."""
    rt, server = router
    ws_alice = MockServerWebSocket(nickname="alice")
    ws_bob   = MockServerWebSocket(nickname="bob")
    server.clients["alice"] = ClientInfo(nickname="alice", websocket=ws_alice)
    server.clients["bob"]   = ClientInfo(nickname="bob", websocket=ws_bob)

    ws_req = MockServerWebSocket(nickname="charlie")
    ws_req.nickname = "charlie"
    raw = make_raw("COMMAND", "charlie", {"command": "LIST_USERS"})

    await rt.dispatch(raw, ws_req)

    response = ws_req.last_message()
    assert response["payload"]["command"] == CommandType.USER_LIST
    assert set(response["payload"]["users"]) == {"alice", "bob"}


# ── Tests: REQUEST_CHAT ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_request_chat_forwarded(router):
    """REQUEST_CHAT debe forwarded el mensaje al websocket del target."""
    rt, server = router
    ws_bob = MockServerWebSocket(nickname="bob")
    server.clients["bob"] = ClientInfo(nickname="bob", websocket=ws_bob)

    ws_alice = MockServerWebSocket(nickname="alice")
    ws_alice.nickname = "alice"
    raw = make_raw("COMMAND", "alice", {"command": "REQUEST_CHAT", "target": "bob"})

    await rt.dispatch(raw, ws_alice)

    assert len(ws_bob.sent_messages) == 1
    assert ws_bob.last_message()["payload"]["command"] == "REQUEST_CHAT"


@pytest.mark.asyncio
async def test_request_chat_unknown_target(router):
    """REQUEST_CHAT a un usuario inexistente no debe lanzar excepciones."""
    rt, server = router
    ws = MockServerWebSocket(nickname="alice")
    ws.nickname = "alice"
    raw = make_raw("COMMAND", "alice", {"command": "REQUEST_CHAT", "target": "nobody"})

    # No debe lanzar excepción
    await rt.dispatch(raw, ws)
    assert len(ws.sent_messages) == 0


# ── Tests: TEXT y BINARY ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_text_forwarded_to_target(router):
    """Mensaje de texto debe llegar al peer target."""
    rt, server = router
    ws_bob = MockServerWebSocket(nickname="bob")
    server.clients["bob"] = ClientInfo(nickname="bob", websocket=ws_bob)

    ws_alice = MockServerWebSocket(nickname="alice")
    ws_alice.nickname = "alice"
    raw = make_raw("TEXT", "alice", {"text": "hola", "target": "bob"})

    await rt.dispatch(raw, ws_alice)

    assert len(ws_bob.sent_messages) == 1
    assert ws_bob.last_message()["payload"]["text"] == "hola"


@pytest.mark.asyncio
async def test_binary_forwarded_to_target(router):
    """Mensaje binario (chunk de archivo) debe llegar al peer target."""
    rt, server = router
    ws_bob = MockServerWebSocket(nickname="bob")
    server.clients["bob"] = ClientInfo(nickname="bob", websocket=ws_bob)

    ws_alice = MockServerWebSocket(nickname="alice")
    ws_alice.nickname = "alice"
    raw = make_raw("BINARY", "alice", {"chunk": "base64data==", "target": "bob"})

    await rt.dispatch(raw, ws_alice)

    assert len(ws_bob.sent_messages) == 1


@pytest.mark.asyncio
async def test_text_unknown_target_no_crash(router):
    """Mensaje a target desconocido no debe lanzar excepción."""
    rt, _ = router
    ws = MockServerWebSocket(nickname="alice")
    ws.nickname = "alice"
    raw = make_raw("TEXT", "alice", {"text": "hola", "target": "nadie"})
    await rt.dispatch(raw, ws)
