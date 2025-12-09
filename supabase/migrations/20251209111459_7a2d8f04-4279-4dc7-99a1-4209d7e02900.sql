-- Insert test order_items for all existing orders using the Test product
INSERT INTO order_items (order_id, product_id, quantity, price_eur) VALUES
-- Order 1: €25.00 = 5 items @ €5.00
('c28970f2-afc5-411c-b492-209f5cd10537', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 5, 5.00),
-- Order 2: €5.00 = 1 item @ €5.00
('e538a6c0-188d-4848-8374-0a958fccb4c6', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 1, 5.00),
-- Order 3: €5.00 = 1 item @ €5.00
('c6ea6896-1a54-4373-aa79-26b629a65f50', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 1, 5.00),
-- Order 4: €25.00 = 5 items @ €5.00
('fd22a672-1042-48ba-9960-4086822cb23a', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 5, 5.00),
-- Order 5: €8.00 = 1 item @ €8.00 (adjusted price for this order)
('e54fc772-d70d-4cc0-92ff-5e90a4764bf3', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 1, 8.00),
-- Order 6: €15.00 = 3 items @ €5.00
('1599532c-cbcd-41d2-8b5b-52cb52f4b3ca', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 3, 5.00),
-- Order 7: €8.00 = 1 item @ €8.00
('50553d0d-6635-4dff-8108-1b474c045203', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 1, 8.00),
-- Order 8: €15.00 = 3 items @ €5.00
('50d3e716-0ee7-4cad-9f3a-79e5ad727257', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 3, 5.00),
-- Order 9: €15.00 = 3 items @ €5.00
('e87e25d4-27ca-4c74-af1e-39ff147e1c80', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 3, 5.00),
-- Order 10: €22.00 = 1 item @ €22.00
('9c2d40b8-46f0-4ae2-9d51-ff8d31db16da', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 1, 22.00),
-- Order 11: €10.00 = 2 items @ €5.00
('33d5afe1-eba4-440e-a430-ec4c7537839b', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 2, 5.00),
-- Order 12: €10.00 = 2 items @ €5.00
('a76e849a-7d21-4fd5-88cc-3beeaaf3d771', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 2, 5.00),
-- Order 13: €10.00 = 2 items @ €5.00
('c68a38b5-897d-414b-a0b6-38cabc0609fb', '1d6ffbfe-4ff2-4177-992d-db419e35df6e', 2, 5.00);