-- OPTIONAL starter content. Edit URLs/descriptions before applying in production.
-- The app system is fully database-driven; these rows are only examples for initial setup.
INSERT OR IGNORE INTO apps(name, slug, url, short_description, long_description, category_id, display_order, enabled, visibility, accent_color, badge_featured)
SELECT 'CallFocus', 'callfocus', 'https://callfocus.link', 'Focused voice-call assistance.', 'Open CallFocus from your ToolCart ecosystem.', id, 10, 1, 'public', '#745CFF', 1 FROM app_categories WHERE slug='communication';

INSERT OR IGNORE INTO apps(name, slug, url, short_description, long_description, category_id, display_order, enabled, visibility, accent_color)
SELECT 'ChatFocus', 'chatfocus', NULL, 'Multimodal conversation workspace.', 'Configure the production URL from Admin → Apps.', id, 20, 1, 'public', '#4F7CFF' FROM app_categories WHERE slug='productivity';

INSERT OR IGNORE INTO apps(name, slug, url, short_description, long_description, category_id, display_order, enabled, visibility, accent_color)
SELECT 'LodgeFinder', 'lodgefinder', 'https://unilodgefinder.com', 'Discover student accommodation.', 'Open LodgeFinder from ToolCart.', id, 30, 1, 'public', '#A78BFA' FROM app_categories WHERE slug='utilities';
