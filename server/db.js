import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'articles.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id          TEXT PRIMARY KEY,
    feed_id     TEXT NOT NULL,
    feed_name   TEXT NOT NULL,
    category    TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    link        TEXT NOT NULL,
    pub_date    TEXT,
    author      TEXT,
    saved_at    INTEGER DEFAULT (unixepoch())
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, description, feed_name, category,
    content='articles', content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, description, feed_name, category)
    VALUES (new.rowid, new.title, new.description, new.feed_name, new.category);
  END;

  CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, description, feed_name, category)
    VALUES ('delete', old.rowid, old.title, old.description, old.feed_name, old.category);
  END;
`);

const stmtInsert = db.prepare(`
  INSERT OR IGNORE INTO articles
    (id, feed_id, feed_name, category, title, description, link, pub_date, author)
  VALUES
    (@id, @feedId, @feedName, @category, @title, @description, @link, @pubDate, @author)
`);

const bulkInsert = db.transaction((items) => {
  for (const item of items) stmtInsert.run(item);
});

/**
 * Bulk-insert articles. Uses INSERT OR IGNORE so first save wins
 * (preserves original pub_date, never overwrites read/star state).
 * @param {Array<{id,feedId,feedName,category,title,description,link,pubDate,author}>} items
 */
export function saveArticles(items) {
  bulkInsert(items);
}

/**
 * Full-text search across title + description using FTS5.
 * Returns rows with an `excerpt` field containing highlighted snippets.
 */
export function searchArticles(query, category = null, limit = 50, offset = 0) {
  const params = [query];
  let categoryClause = '';
  if (category) {
    categoryClause = 'AND a.category = ?';
    params.push(category);
  }
  const sql = `
    SELECT
      a.id, a.feed_id AS feedId, a.feed_name AS feedName, a.category,
      a.title, a.link, a.pub_date AS pubDate, a.author,
      snippet(articles_fts, 1, '<mark>', '</mark>', '\u2026', 32) AS excerpt
    FROM articles_fts
    JOIN articles a ON a.rowid = articles_fts.rowid
    WHERE articles_fts MATCH ?
    ${categoryClause}
    ORDER BY rank
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return db.prepare(sql).all(...params);
}

/** Row count, date range, and per-category breakdown. */
export function getArchiveStats() {
  const { count } = db.prepare('SELECT count(*) AS count FROM articles').get();
  const { oldest, newest } = db
    .prepare('SELECT min(pub_date) AS oldest, max(pub_date) AS newest FROM articles')
    .get();
  const rows = db
    .prepare('SELECT category, count(*) AS count FROM articles GROUP BY category')
    .all();
  return {
    total: count,
    oldest: oldest ?? null,
    newest: newest ?? null,
    byCategory: Object.fromEntries(rows.map(r => [r.category, r.count])),
  };
}
