import pytest


@pytest.mark.asyncio
async def test_get_encounters_empty(client, auth_headers):
    response = await client.get("/encounters", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["isLastPage"] is True


@pytest.mark.asyncio
async def test_get_encounters_with_data(client, auth_headers, seed_data):
    response = await client.get("/encounters", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    enc = body["data"][0]
    assert enc["id"] == seed_data["encounter_id"]
    assert enc["label"] == "Test Encounter"


@pytest.mark.asyncio
async def test_update_encounter_label(client, auth_headers, seed_data):
    enc_id = seed_data["encounter_id"]
    response = await client.patch(
        f"/encounters/{enc_id}",
        json={"label": "Updated Label"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "Updated Label"


@pytest.mark.asyncio
async def test_delete_encounter(client, auth_headers, seed_data):
    enc_id = seed_data["encounter_id"]
    response = await client.delete(
        f"/encounters/{enc_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200

    # After deletion the encounter should no longer appear in the list
    list_resp = await client.get("/encounters", headers=auth_headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["data"] == []


@pytest.mark.asyncio
async def test_create_draft_note(client, auth_headers, seed_data):
    enc_id = seed_data["encounter_id"]
    payload = {
        "noteDefinitionId": seed_data["note_definition_id"],
        "noteId": "NEWNOTE1",
        "title": "New Draft",
        "content": "Generated content here.",
        "outputType": "Markdown",
    }
    response = await client.post(
        f"/encounters/{enc_id}/draft-notes",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    # The new note should appear; the old note of the same definition
    # is auto-inactivated so only the new one is active.
    active_notes = [n for n in body["draftNotes"] if n["id"] == "NEWNOTE1"]
    assert len(active_notes) == 1
    assert active_notes[0]["content"] == "Generated content here."


@pytest.mark.asyncio
async def test_delete_draft_note(client, auth_headers, seed_data):
    enc_id = seed_data["encounter_id"]
    note_id = seed_data["draft_note_id"]
    response = await client.delete(
        f"/encounters/{enc_id}/draft-notes/{note_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200

    # Verify the note no longer appears in encounters list
    list_resp = await client.get("/encounters", headers=auth_headers)
    assert list_resp.status_code == 200
    enc = list_resp.json()["data"][0]
    active_ids = [n["id"] for n in enc["draftNotes"]]
    assert note_id not in active_ids
