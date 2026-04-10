export const DATABASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS LearningPaths (
    id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS Courses (
    id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT
  );

  CREATE TABLE IF NOT EXISTS LearningPath_Courses (
    path_id TEXT,
    course_id TEXT,
    order_index INTEGER,
    PRIMARY KEY (path_id, course_id),
    FOREIGN KEY(path_id) REFERENCES LearningPaths(id),
    FOREIGN KEY(course_id) REFERENCES Courses(id)
  );

  CREATE TABLE IF NOT EXISTS Course_Assets (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    type TEXT CHECK(type IN ('guide', 'video')),
    url TEXT,
    metadata JSON,
    status TEXT CHECK(status IN ('PENDING', 'DOWNLOADING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
    local_path TEXT,
    FOREIGN KEY(course_id) REFERENCES Courses(id)
  );

  CREATE TABLE IF NOT EXISTS Scraper_Tasks (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('course', 'path')),
    action TEXT CHECK(action IN ('SYNC_COURSE', 'SYNC_PATH', 'DOWNLOAD_COURSE', 'DOWNLOAD_PATH')),
    target_id TEXT,
    url TEXT,
    status TEXT CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
    progress JSON,
    error TEXT,
    metadata JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
