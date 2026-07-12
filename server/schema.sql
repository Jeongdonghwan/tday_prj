-- 오늘연애 DB 스키마 (스펙 §6) — MariaDB / utf8mb4
-- ORM(app/models)과 동치. 빠른 부트스트랩/참고용.
-- 사용: docker compose 의 MariaDB 에 접속해 source schema.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS couples (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_a BIGINT NOT NULL,
  user_b BIGINT NULL,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  start_date DATE NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nickname VARCHAR(30) UNIQUE NOT NULL,
  social_provider ENUM('kakao','apple','dev') NOT NULL,
  social_id VARCHAR(128) NOT NULL,
  relationship_status ENUM('couple','single','married') NOT NULL DEFAULT 'single',
  couple_id BIGINT NULL,                       -- FK 미선언 (순환 회피)
  push_token VARCHAR(255) NULL,                -- Expo Push
  created_at DATETIME NOT NULL,
  INDEX idx_social (social_provider, social_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  category ENUM('love','marriage','counsel','free') NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NULL,
  is_poll BOOLEAN NOT NULL DEFAULT FALSE,      -- 투표글/일반글 구분
  author_status ENUM('couple','single','married') NOT NULL,  -- 작성 시점 스냅샷
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  hot_score FLOAT NOT NULL DEFAULT 0,          -- BEST 정렬용, 5분 배치
  is_blinded BOOLEAN NOT NULL DEFAULT FALSE,   -- 신고 누적 시 가림
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_cat_created (category, created_at),
  INDEX idx_hot (hot_score DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS poll_options (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  side ENUM('A','B') NOT NULL,
  label VARCHAR(40) NOT NULL,                  -- 작성자 입력 멘트
  vote_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES posts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS votes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  option_side ENUM('A','B') NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_vote (post_id, user_id),       -- 중복투표 차단 (DB 레벨)
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  body TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  author_status ENUM('couple','single','married') NOT NULL,
  is_blinded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id),
  INDEX idx_post (post_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  question TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  INDEX idx_date (scheduled_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_answers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  question_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  couple_id BIGINT NULL,                        -- 미연결이면 NULL (1인 모드)
  answer TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_answer (question_id, user_id),
  FOREIGN KEY (question_id) REFERENCES daily_questions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  couple_id BIGINT NOT NULL,
  owner ENUM('a','b','both') NOT NULL,
  title VARCHAR(80) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  INDEX idx_couple_date (couple_id, event_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  target_type ENUM('post','comment','user') NOT NULL,
  target_id BIGINT NOT NULL,
  reporter_id BIGINT NOT NULL,
  reason VARCHAR(50) NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blocks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  blocked_user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_block (user_id, blocked_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (blocked_user_id) REFERENCES users(id)
) ENGINE=InnoDB;
