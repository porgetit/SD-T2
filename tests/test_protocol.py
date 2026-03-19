# tests/test_protocol.py
# Pruebas para shared/protocol.py

import pytest
from shared.protocol import Message, MessageType, CommandType


class TestMessageType:
    def test_values(self):
        assert MessageType.TEXT    == "TEXT"
        assert MessageType.COMMAND == "COMMAND"
        assert MessageType.BINARY  == "BINARY"

    def test_is_string_enum(self):
        assert isinstance(MessageType.TEXT, str)


class TestCommandType:
    def test_all_commands_defined(self):
        """Verificar que todos los comandos del protocolo están definidos."""
        expected = {
            # Presencia
            "REGISTER", "REGISTER_OK", "REGISTER_FAIL",
            "LIST_USERS", "USER_LIST",
            "USER_JOINED", "USER_LEFT",
            # Autenticación
            "AUTH_REGISTER", "AUTH_LOGIN", "AUTH_OK", "AUTH_FAIL",
            "UPDATE_PROFILE",
            # Chat
            "REQUEST_CHAT", "ACCEPT_CHAT", "REJECT_CHAT", "END_CHAT",
            # Archivos
            "REQ_SEND_FILES", "ACCEPT_FILES", "REJECT_FILES", "FILES_RECEIVED",
        }
        actual = {e.value for e in CommandType}
        assert expected == actual

    def test_is_string_enum(self):
        assert isinstance(CommandType.REGISTER, str)


class TestMessage:
    def test_create_text_message(self):
        msg = Message(type=MessageType.TEXT, sender="alice", payload={"text": "hola", "target": "bob"})
        assert msg.type    == MessageType.TEXT
        assert msg.sender  == "alice"
        assert msg.payload == {"text": "hola", "target": "bob"}

    def test_create_command_message(self):
        msg = Message(
            type=MessageType.COMMAND,
            sender="server",
            payload={"command": CommandType.REGISTER_OK, "nickname": "bob"}
        )
        assert msg.type    == MessageType.COMMAND
        assert msg.sender  == "server"

    def test_model_dump_json_roundtrip(self):
        """El JSON producido puede reconstruir el mismo Message."""
        original = Message(
            type=MessageType.TEXT,
            sender="alice",
            payload={"text": "test", "target": "bob"}
        )
        json_str = original.model_dump_json()
        restored = Message.model_validate_json(json_str)
        assert restored.type    == original.type
        assert restored.sender  == original.sender
        assert restored.payload == original.payload

    def test_payload_must_be_dict(self):
        """El campo payload debe ser un diccionario."""
        with pytest.raises(Exception):
            Message(type=MessageType.TEXT, sender="x", payload="string_invalido")

    def test_sender_required(self):
        with pytest.raises(Exception):
            Message(type=MessageType.TEXT, payload={})

    def test_type_required(self):
        with pytest.raises(Exception):
            Message(sender="alice", payload={})
