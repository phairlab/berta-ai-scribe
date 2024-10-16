
CREATE STAGE recording_files DIRECTORY = ( ENABLE = TRUE );

CREATE SEQUENCE sqid_sequence START WITH 42857;

CREATE TABLE error_log (
  id CHAR(36) NOT NULL,
  occurred TIMESTAMP_LTZ NOT NULL,
  name VARCHAR(500) NOT NULL,
  message VARCHAR NOT NULL,
  stack_trace VARCHAR NOT NULL,
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE session_log (
  id CHAR(36) NOT NULL,
  username VARCHAR(255) NOT NULL,
  started TIMESTAMP_LTZ NOT NULL,
  refreshes ARRAY[TIMESTAMP_LTZ NOT NULL] DEFAULT [],
  user_agent VARCHAR,
  PRIMARY KEY (id) RELY
);

CREATE TABLE request_log (
  id VARCHAR(100) NOT NULL,
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
  id CHAR(36) NOT NULL,
  original_media_type VARCHAR(255) NOT NULL,
  original_file_size INTEGER NOT NULL,
  converted_media_type VARCHAR(255),
  converted_file_size INTEGER,
  time_to_convert INTEGER NOT NULL,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE transcription_log (
  id CHAR(36) NOT NULL,
  transcribed_at TIMESTAMP_LTZ NOT NULL,
  service VARCHAR(50) NOT NULL,
  audio_duration INTEGER NOT NULL,
  time_to_transcribe INTEGER NOT NULL,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE generation_log (
  id CHAR(36) NOT NULL,
  generated_at TIMESTAMP_LTZ NOT NULL,
  service VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  completion_tokens INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  time_to_generate INTEGER NOT NULL,
  error_id CHAR(36),
  session_id CHAR(36),
  PRIMARY KEY (id) RELY
);

CREATE TABLE users (
  username VARCHAR(255) NOT NULL,
  registered TIMESTAMP_LTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  default_note_type CHAR(36),
  PRIMARY KEY (username) RELY,
);

INSERT INTO users (username) VALUES ('BUILTIN');

CREATE TABLE user_feedback (
  id CHAR(36) NOT NULL DEFAULT UUID_STRING(),
  username VARCHAR(255) NOT NULL,
  submitted TIMESTAMP_LTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details VARCHAR NOT NULL,
  context VARCHAR NOT NULL DEFAULT '(NOT CAPTURED)',
  session_id CHAR(36),
  PRIMARY KEY (id) RELY,
);

CREATE TABLE note_definitions (
  id VARCHAR(10) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  discarded TIMESTAMP_LTZ,
  title VARCHAR(100) NOT NULL,
  instructions VARCHAR NOT NULL,
  model VARCHAR(50),
  replaced_by VARCHAR(10),
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (username) REFERENCES users (username) RELY,
  FOREIGN KEY (replaced_by) REFERENCES notoe_definitions (id) RELY
);

CREATE TABLE encounters (
  id VARCHAR(10) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  modified TIMESTAMP_LTZ NOT NULL,
  purged TIMESTAMP_LTZ,
  label VARCHAR(100),
  summary VARCHAR(500),
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (username) REFERENCES users (username) RELY
);

CREATE TABLE recordings (
  id VARCHAR(10) NOT NULL,
  encounter_id VARCHAR(10) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  media_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  duration INTEGER,
  transcript VARCHAR,
  audio_conversion_task CHAR(36),
  transcription_task CHAR(36),
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (encounter_id) REFERENCES encounters (id) RELY,
  FOREIGN KEY (audio_conversion_task) REFERENCES audio_conversion_log (id) RELY,
  FOREIGN KEY (transcription_task) REFERENCES transcription_log (id) RELY
);

CREATE TABLE draft_notes (
  id VARCHAR(10) NOT NULL,
  encounter_id VARCHAR(10) NOT NULL,
  created TIMESTAMP_LTZ NOT NULL,
  discarded TIMESTAMP_LTZ,
  title VARCHAR(100),
  text VARCHAR NOT NULL,
  generation_task CHAR(36) NOT NULL,
  PRIMARY KEY (id) RELY,
  FOREIGN KEY (encounter_id) REFERENCES encounters (id) RELY,
  FOREIGN KEY (generation_task) REFERENCES generation_log (id) RELY
);
