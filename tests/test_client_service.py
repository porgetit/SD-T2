# tests/test_client_service.py
# Pruebas para client/service.py (ChatService) con mocks de red

import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from client.service import ChatService
from client.models import ConnectionStatus
from shared.protocol import CommandType


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def service_with_mock_network():
    """ChatService con NetworkClient mockeado para no abrir sockets reales."""
    svc = ChatService()
    svc.network.connect = AsyncMock()
    svc.network.send    = AsyncMock()
    return svc


# ── Tests: connect_to_server ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_connect_to_server_sets_nickname(service_with_mock_network):
    svc = service_with_mock_network
    await svc.connect_to_server("ws://localhost:5000", "alice")

    assert svc.nickname == "alice"
    assert svc.state.nickname == "alice"


@pytest.mark.asyncio
async def test_connect_to_server_sets_connecting_status(service_with_mock_network):
    svc = service_with_mock_network
    await svc.connect_to_server("ws://localhost:5000", "alice")

    # Debe enviar REGISTER y actualizar el estado
    svc.network.send.assert_called_once()
    sent_msg = svc.network.send.call_args[0][0]
    assert sent_msg.payload["command"] == CommandType.REGISTER


# ── Tests: _on_incoming (manejo de eventos del servidor) ──────────────────

@pytest.mark.asyncio
async def test_on_incoming_register_ok_updates_status(service_with_mock_network):
    svc = service_with_mock_network
    data = {"type": "COMMAND", "sender": "server",
            "payload": {"command": "REGISTER_OK", "nickname": "alice"}}
    await svc._on_incoming(data)
    assert svc.state.status == ConnectionStatus.CONNECTED


@pytest.mark.asyncio
async def test_on_incoming_user_list_updates_state(service_with_mock_network):
    svc = service_with_mock_network
    data = {"type": "COMMAND", "sender": "server",
            "payload": {"command": "USER_LIST", "users": ["alice", "bob"]}}
    await svc._on_incoming(data)
    assert "alice" in svc.state.connected_users
    assert "bob"   in svc.state.connected_users


@pytest.mark.asyncio
async def test_on_incoming_accept_chat_updates_peer(service_with_mock_network):
    svc = service_with_mock_network
    svc.state.nickname = "alice"
    data = {"type": "COMMAND", "sender": "bob",
            "payload": {"command": "ACCEPT_CHAT", "target": "alice"}}
    await svc._on_incoming(data)
    assert svc.peer == "bob"
    assert svc.state.status == ConnectionStatus.IN_SESSION


@pytest.mark.asyncio
async def test_on_incoming_publishes_to_event_queue(service_with_mock_network):
    svc   = service_with_mock_network
    queue = svc.events.subscribe()
    data  = {"type": "TEXT", "sender": "bob", "payload": {"text": "hola", "target": "alice"}}

    await svc._on_incoming(data)

    received = queue.get_nowait()
    assert received == data


# ── Tests: set_peer / request_chat ────────────────────────────────────────

@pytest.mark.asyncio
async def test_set_peer_updates_state(service_with_mock_network):
    svc = service_with_mock_network
    svc.set_peer("bob")
    assert svc.peer == "bob"
    assert svc.state.current_peer == "bob"


@pytest.mark.asyncio
async def test_request_chat_sends_command(service_with_mock_network):
    svc = service_with_mock_network
    svc.state.nickname = "alice"
    await svc.request_chat("bob")

    svc.network.send.assert_called_once()
    msg = svc.network.send.call_args[0][0]
    assert msg.payload["command"] == CommandType.REQUEST_CHAT
    assert msg.payload["target"]  == "bob"
    assert svc.peer == "bob"


# ── Tests: send_text ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_send_text_uses_current_peer(service_with_mock_network):
    svc = service_with_mock_network
    svc.state.nickname = "alice"
    svc.set_peer("bob")

    await svc.send_text("hola bob")

    msg = svc.network.send.call_args[0][0]
    assert msg.payload["text"]   == "hola bob"
    assert msg.payload["target"] == "bob"


# ── Tests: end_chat ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_end_chat_sends_end_command(service_with_mock_network):
    svc = service_with_mock_network
    svc.state.nickname = "alice"
    svc.set_peer("bob")

    await svc.end_chat()

    svc.network.send.assert_called_once()
    msg = svc.network.send.call_args[0][0]
    assert msg.payload["command"] == CommandType.END_CHAT
    assert svc.state.current_peer is None


@pytest.mark.asyncio
async def test_end_chat_without_peer_does_not_send(service_with_mock_network):
    """end_chat sin peer activo no debe enviar ningún mensaje."""
    svc = service_with_mock_network
    svc.state.nickname = "alice"
    # peer es "" por defecto

    await svc.end_chat()

    svc.network.send.assert_not_called()
