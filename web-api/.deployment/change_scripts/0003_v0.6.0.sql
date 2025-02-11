-- v0.6.0-0

-- Add 'model' field to draft_notes.

CREATE TABLE draft_notes_1 (
  id VARCHAR(12) NOT NULL,
  encounter_id VARCHAR(12) NOT NULL,
  definition_id VARCHAR(12) NOT NULL,
  definition_version VARCHAR(12) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  title VARCHAR(100) NOT NULL,
  model VARCHAR(50),
  content VARCHAR NOT NULL,
  inactivated TIMESTAMP_LTZ,
  output_type VARCHAR(50) NOT NULL DEFAULT 'Plain Text',
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  comments VARCHAR(500),
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (encounter_id) REFERENCES encounters (id) RELY,
  FOREIGN KEY (definition_id, definition_version) REFERENCES note_definitions (id, version) RELY
);

INSERT INTO draft_notes_1 (
  id, encounter_id, definition_id, definition_version, created, title, model, content, inactivated, output_type, is_flagged, comments
)
SELECT id, encounter_id, definition_id, definition_version, created, title, 'llama3.1-405b', content, inactivated, output_type, is_flagged, comments
FROM recordings;

ALTER TABLE draft_notes SWAP WITH draft_notes_1;
DROP TABLE draft_notes_1;

-- Convert built-in note types to use gpt-4o model

SET update_timestamp = CURRENT_TIMESTAMP;

UPDATE note_definitions
SET inactivated = $update_timestamp
WHERE inactivated IS NULL
    AND model = 'llama3.1-405b'
    AND username = 'BUILTIN';

INSERT INTO note_definitions (id, version, username, created, model, title, instructions, output_type)   
SELECT n.id
    ,'B' || LPAD(RIGHT(n.version, 3)::INT + 9, 3, '0')
    ,n.username
    ,$update_timestamp
    ,'gpt-4o'
    ,n.title
    ,n.instructions
    ,n.output_type
FROM note_definitions n
WHERE version in ('B017', 'B018', 'B019', 'B020', 'B021', 'B022', 'B023', 'B024', 'B025');

-- v0.6.0-1

-- Add context field to encounters table
CREATE TABLE encounters_1 (
  id VARCHAR(12) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  modified TIMESTAMP_LTZ NOT NULL,
  label VARCHAR(100),
  autolabel VARCHAR(100),
  context VARCHAR,
  inactivated TIMESTAMP_LTZ,
  purged TIMESTAMP_LTZ,
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (username) REFERENCES users (username) RELY
);

INSERT INTO encounters_1 (id, username, created, modified, label, autolabel, context, inactivated, purged)
SELECT id, username, created, modified, label, autolabel, NULL, inactivated, purged
FROM encounters;

ALTER TABLE encounters SWAP WITH encounters_1;
DROP TABLE encounters_1;
