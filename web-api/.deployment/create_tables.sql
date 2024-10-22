CREATE STAGE recording_files DIRECTORY = ( ENABLE = TRUE );

-- Used for generating "Sqid" hashids.
-- 42857 is the first integer to generate a 5-digit hashid using
-- an alphabet with capital letters and numbers.
CREATE SEQUENCE sqid_sequence START WITH 42857 INCREMENT BY 1 NOORDER;

CREATE TABLE session_log (
  session_id CHAR(36) NOT NULL,
  username VARCHAR(255) NOT NULL,
  started TIMESTAMP_LTZ NOT NULL,
  refreshes ARRAY[TIMESTAMP_LTZ NOT NULL] DEFAULT [],
  user_agent VARCHAR,
  PRIMARY KEY (id) RELY
);

CREATE TABLE error_log (
  error_id CHAR(36) NOT NULL,
  occurred TIMESTAMP_LTZ NOT NULL,
  name VARCHAR(500) NOT NULL,
  message VARCHAR NOT NULL,
  stack_trace VARCHAR NOT NULL,
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE request_log (
  request_id CHAR(36) NOT NULL,
  requested TIMESTAMP_LTZ NOT NULL,
  url VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  status_text VARCHAR(50),
  duration INTEGER NOT NULL,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE audio_conversion_log (
  task_id CHAR(36) NOT NULL,
  started TIMESTAMP_LTZ NOT NULL,
  time INTEGER NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_media_type VARCHAR(255) NOT NULL,
  original_file_size INTEGER NOT NULL,
  converted_media_type VARCHAR(255),
  converted_file_size INTEGER,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE transcription_log (
  task_id CHAR(36) NOT NULL,
  started TIMESTAMP_LTZ NOT NULL,
  time INTEGER NOT NULL,
  filename VARCHAR(255) NOT NULL,
  service VARCHAR(50) NOT NULL,
  audio_duration INTEGER NOT NULL,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE generation_log (
  task_id CHAR(36) NOT NULL,
  started TIMESTAMP_LTZ NOT NULL,
  time INTEGER NOT NULL,
  service VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  completion_tokens INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE users (
  username VARCHAR(255) NOT NULL,
  registered TIMESTAMP_LTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  default_note VARCHAR(12),
  PRIMARY KEY (username) RELY,
);

INSERT INTO users (username) VALUES ('BUILTIN');

CREATE TABLE user_feedback (
  id CHAR(36) NOT NULL,
  username VARCHAR(255) NOT NULL,
  submitted TIMESTAMP_LTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details VARCHAR NOT NULL,
  context VARCHAR NOT NULL DEFAULT '(NOT CAPTURED)',
  session_id CHAR(36),
  PRIMARY KEY (id) RELY,
);

CREATE TABLE note_definitions (
  id VARCHAR(12) NOT NULL,
  set_id VARCHAR(12) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  title VARCHAR(100) NOT NULL,
  instructions VARCHAR NOT NULL,
  model VARCHAR(50),
  inactivated TIMESTAMP_LTZ,
  replaced_by VARCHAR(12),
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (username) REFERENCES users (username) RELY,
  FOREIGN KEY (replaced_by) REFERENCES note_definitions (id) RELY
);

CREATE TABLE encounters (
  id VARCHAR(12) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  modified TIMESTAMP_LTZ NOT NULL,
  label VARCHAR(100),
  summary VARCHAR(500),
  inactivated TIMESTAMP_LTZ,
  purged TIMESTAMP_LTZ,
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (username) REFERENCES users (username) RELY
);

CREATE TABLE recordings (
  id VARCHAR(12) NOT NULL,
  encounter_id VARCHAR(12) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  media_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  duration INTEGER,
  transcript VARCHAR,
  audio_conversion_task CHAR(36),
  transcription_task CHAR(36),
  PRIMARY KEY (id) RELY,
  UNIQUE (filename) RELY,
  FOREIGN KEY (encounter_id) REFERENCES encounters (id) RELY,
  FOREIGN KEY (audio_conversion_task) REFERENCES audio_conversion_log (task_id) RELY,
  FOREIGN KEY (transcription_task) REFERENCES transcription_log (task_id) RELY
);

CREATE TABLE draft_notes (
  id VARCHAR(12) NOT NULL,
  set_id VARCHAR(12) NOT NULL,
  encounter_id VARCHAR(12) NOT NULL,
  definition_id VARCHAR(12) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  title VARCHAR(100) NOT NULL,
  content VARCHAR NOT NULL,
  generation_task CHAR(36) NOT NULL,
  inactivated TIMESTAMP_LTZ,
  replaced_by VARCHAR(12),
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (encounter_id) REFERENCES encounters (id) RELY,
  FOREIGN KEY (definition_id) REFERENCES note_definitions (id) RELY,
  FOREIGN KEY (generation_task) REFERENCES generation_log (task_id) RELY,
  FOREIGN KEY (replaced_by) REFERENCES draft_notes (id) RELY,
);
