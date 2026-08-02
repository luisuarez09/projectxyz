ALTER TABLE app.firms
ADD COLUMN archive_paper_size text NOT NULL DEFAULT 'LETTER';

ALTER TABLE app.firms
ADD CONSTRAINT firms_archive_paper_size_check
CHECK (archive_paper_size IN ('LETTER', 'A4', 'LEGAL_OFFICIO'));

ALTER TABLE app.firm_offerings
ADD COLUMN archive_order integer NOT NULL DEFAULT 1000;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY firm_id
      ORDER BY kind, name, created_at
    ) * 10 AS position
  FROM app.firm_offerings
)
UPDATE app.firm_offerings AS offering
SET archive_order = ranked.position
FROM ranked
WHERE ranked.id = offering.id;

ALTER TABLE app.firm_offerings
ADD CONSTRAINT firm_offerings_archive_order_check
CHECK (archive_order BETWEEN 1 AND 9999);

CREATE INDEX firm_offerings_firm_archive_order_idx
ON app.firm_offerings (firm_id, archive_order, kind, name);
