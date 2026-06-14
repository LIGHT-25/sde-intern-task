CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE surveys (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  logo_url TEXT,
  version TEXT NOT NULL DEFAULT 'v1.0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  config_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
);

CREATE TABLE responses (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  survey_version TEXT NOT NULL DEFAULT 'v1.0',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  response_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  value TEXT,
  FOREIGN KEY (response_id) REFERENCES responses(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX idx_surveys_owner
ON surveys(owner_id);

CREATE INDEX idx_questions_survey
ON questions(survey_id);

CREATE INDEX idx_responses_survey
ON responses(survey_id);

CREATE INDEX idx_answers_response
ON answers(response_id);