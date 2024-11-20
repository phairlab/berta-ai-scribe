from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.security import authenticate_session, useUserSession
from app.services.db import useDatabase

router = APIRouter(dependencies=[Depends(authenticate_session)])

@router.get("/check-data-changes")
def get_updates(
    userSession: useUserSession,
    database: useDatabase,
    *,
    laterThan: datetime
) -> sch.DataChanges:
    """
    Gets all updates for the current user after the specified date
    that occurred in a different session.
    """

    # Identify any updates.
    get_updates = select(db.DataChangeRecord) \
        .where(
            db.DataChangeRecord.changed > laterThan,
            db.DataChangeRecord.username == userSession.username,
            db.DataChangeRecord.session_id != userSession.sessionId
        )
    
    try:
        updates = database.execute(get_updates).scalars().all()
    except Exception as exc:
        raise errors.DatabaseError(str(exc))

    # Check for new encounters.
    created_encounter_ids = [{x.entity_id for x in updates if x.entity_type == "ENCOUNTER" and x.change_type == "CREATED"}]

    if any(created_encounter_ids):
        get_new_encounters = select(db.Encounter) \
            .where(db.Encounter.id.in_(created_encounter_ids)) \
            .order_by(db.Encounter.created.desc()) \
            .options(
                selectinload(db.Encounter.recording),
                selectinload(db.Encounter.draft_notes),
            )

        try:
            new_encounters = database.execute(get_new_encounters).scalars().all()
        except Exception as exc:
            raise errors.DatabaseError(str(exc))
    
    # Return the changes.
    return sch.DataChanges(
        newEncounters=new_encounters or []
    )
    