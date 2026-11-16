CREATE TABLE IF NOT EXISTS runs (
 id TEXT PRIMARY KEY, player TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('normal','nuke')),
 started INTEGER NOT NULL, expires INTEGER NOT NULL, bucket TEXT NOT NULL, claim TEXT
);
CREATE INDEX IF NOT EXISTS run_rate ON runs(bucket, started);
CREATE INDEX IF NOT EXISTS run_expiry ON runs(expires);
CREATE TABLE IF NOT EXISTS scores (
 season TEXT NOT NULL, player TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('normal','nuke')),
 run TEXT NOT NULL, nickname TEXT NOT NULL, score INTEGER NOT NULL CHECK(score>0), destroyed INTEGER NOT NULL,
 elapsed INTEGER NOT NULL CHECK(elapsed>=0), created INTEGER NOT NULL,
 PRIMARY KEY(season,player,mode)
);
CREATE INDEX IF NOT EXISTS top_scores ON scores(season,mode,score DESC,elapsed ASC,created ASC);
