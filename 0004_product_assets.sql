PRAGMA foreign_keys = ON;

-- ToolCart V2.3: allow one product to contain any number of protected PDF/image files.
CREATE TABLE IF NOT EXISTS product_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('pdf','image')),
  mime_type TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_assets_product_order
  ON product_assets(product_id, display_order, id);

-- Preserve every product that was created before this migration as its first asset.
INSERT INTO product_assets(product_id,file_key,file_name,file_type,mime_type,display_order)
SELECT p.id,p.file_key,p.file_name,p.file_type,p.mime_type,0
FROM products p
WHERE p.file_key IS NOT NULL
  AND p.file_key <> ''
  AND NOT EXISTS (
    SELECT 1 FROM product_assets a WHERE a.product_id=p.id
  );
