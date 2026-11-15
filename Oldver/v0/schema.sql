-- DWSS multi-user schema (MariaDB)
-- Records are stored individually with optimistic locking.

CREATE DATABASE IF NOT EXISTS dwss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dwss;

CREATE TABLE IF NOT EXISTS records (
  collection   VARCHAR(64)  NOT NULL,
  record_id    VARCHAR(128) NOT NULL,
  data         JSON         NOT NULL,
  version      INT          NOT NULL DEFAULT 1,
  updated_by   VARCHAR(128) DEFAULT NULL,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (collection, record_id),
  INDEX idx_collection (collection),
  INDEX idx_updated (updated_at)
) ENGINE=InnoDB;

-- Optional: keep the old collections table for backward compatibility
CREATE TABLE IF NOT EXISTS collections (
  id VARCHAR(64) PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
