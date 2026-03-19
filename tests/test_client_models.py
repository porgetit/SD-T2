# tests/test_client_models.py
# Pruebas para client/models.py (AppState, FileTransferStatus, ConnectionStatus)

import pytest
from client.models import ConnectionStatus, AppState, FileTransferStatus


class TestConnectionStatus:
    def test_all_states_defined(self):
        states = {e.value for e in ConnectionStatus}
        assert states == {"DISCONNECTED", "CONNECTING", "CONNECTED", "IN_SESSION"}

    def test_is_string_enum(self):
        assert isinstance(ConnectionStatus.DISCONNECTED, str)


class TestAppState:
    def test_default_values(self):
        state = AppState()
        assert state.status               == ConnectionStatus.DISCONNECTED
        assert state.nickname             == ""
        assert state.current_peer         is None
        assert state.connected_users      == []
        assert state.pending_chat_requests == []

    def test_mutable_defaults_are_independent(self):
        """Cada instancia debe tener su propia lista (no compartida)."""
        s1 = AppState()
        s2 = AppState()
        s1.connected_users.append("alice")
        assert s2.connected_users == []

    def test_update_status(self):
        state = AppState()
        state.status = ConnectionStatus.CONNECTED
        assert state.status == ConnectionStatus.CONNECTED

    def test_update_nickname(self):
        state = AppState()
        state.nickname = "alice"
        assert state.nickname == "alice"

    def test_set_current_peer(self):
        state = AppState()
        state.current_peer = "bob"
        assert state.current_peer == "bob"

    def test_add_connected_user(self):
        state = AppState()
        state.connected_users.append("charlie")
        assert "charlie" in state.connected_users

    def test_add_pending_chat_request(self):
        state = AppState()
        state.pending_chat_requests.append("dave")
        assert "dave" in state.pending_chat_requests


class TestFileTransferStatus:
    def test_default_values(self):
        fts = FileTransferStatus(filename="test.txt", total_size=1024)
        assert fts.filename    == "test.txt"
        assert fts.total_size  == 1024
        assert fts.bytes_sent  == 0
        assert fts.is_incoming is True
        assert fts.sender      == ""

    def test_progress_calculation(self):
        """bytes_sent se puede actualizar para rastrear el progreso."""
        fts = FileTransferStatus(filename="img.jpg", total_size=2048, bytes_sent=512)
        assert fts.bytes_sent == 512
        pct = fts.bytes_sent / fts.total_size
        assert pct == pytest.approx(0.25)

    def test_outgoing_transfer(self):
        fts = FileTransferStatus(filename="doc.pdf", total_size=4096, is_incoming=False, sender="alice")
        assert fts.is_incoming is False
        assert fts.sender      == "alice"

    def test_required_fields(self):
        """filename y total_size son obligatorios."""
        with pytest.raises(TypeError):
            FileTransferStatus()
