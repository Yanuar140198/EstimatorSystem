INSERT INTO projects (id, name, location, oh_pct, profit_pct, contingency_pct, ppn_pct, fuel_escalation_pct, created_by, created_at)
VALUES (1, 'Konawe Mining Road - Paket A', 'Mining Konawe', 10, 5, 2, 11, 3, NULL, NOW());

INSERT INTO materials_master (code, name, unit, price, source, updated_at) VALUES
('MAT-001', 'Aggregate Base Class A', 'm3', 280000, 'SNI AHSP Konawe', NOW()),
('MAT-002', 'Subbase Laterite', 'm3', 190000, 'SNI AHSP Konawe', NOW()),
('MAT-003', 'Geotextile Non Woven', 'm2', 45000, 'Vendor Konawe', NOW());

INSERT INTO labor_master (code, name, unit, price, region, updated_at) VALUES
('LAB-001', 'Mandor', 'OH', 180000, 'Konawe', NOW()),
('LAB-002', 'Operator Vibro Roller', 'OH', 220000, 'Konawe', NOW()),
('LAB-003', 'Pekerja Umum', 'OH', 150000, 'Konawe', NOW());

INSERT INTO equipment_master (code, name, unit, price, notes, updated_at) VALUES
('EQ-001', 'Excavator 20 Ton', 'hour', 850000, 'Fuel included', NOW()),
('EQ-002', 'Dump Truck 20m3', 'hour', 650000, 'Fuel included', NOW()),
('EQ-003', 'Vibro Roller 10 Ton', 'hour', 750000, 'Fuel included', NOW());

INSERT INTO wbs_items (id, project_id, wbs_code, level, parent_id, name, unit, quantity, remarks, sort_order) VALUES
(1, 1, '1', 1, NULL, 'Preliminaries & Indirect Cost', 'ls', 1, NULL, 1),
(2, 1, '1.1', 2, 1, 'Project Management Team', 'ls', 1, NULL, 2),
(3, 1, '1.2', 2, 1, 'Mobilization & Demobilization', 'ls', 1, NULL, 3),
(4, 1, '1.3', 2, 1, 'Site Office & Camp Facilities', 'ls', 1, NULL, 4),
(5, 1, '1.4', 2, 1, 'Temporary Utilities (Air, Listrik, Internet)', 'ls', 1, NULL, 5),
(6, 1, '1.5', 2, 1, 'Survey & Setting Out', 'ls', 1, NULL, 6),
(7, 1, '1.6', 2, 1, 'Traffic Management Plan', 'ls', 1, NULL, 7),
(8, 1, '1.7', 2, 1, 'HSE Management (Safety Officer, PPE, Signage)', 'ls', 1, NULL, 8),
(9, 1, '1.8', 2, 1, 'Insurance & Permits', 'ls', 1, NULL, 9),
(10, 1, '1.9', 2, 1, 'Security & Access Control', 'ls', 1, NULL, 10),

(11, 1, '2', 1, NULL, 'Site Preparation', 'ls', 1, NULL, 11),
(12, 1, '2.1', 2, 11, 'Clearing & Grubbing (Pembersihan lahan)', 'ha', 1, NULL, 12),
(13, 1, '2.2', 2, 11, 'Topsoil Stripping', 'm3', 500, NULL, 13),
(14, 1, '2.3', 2, 11, 'Disposal of Organic Material', 'm3', 500, NULL, 14),
(15, 1, '2.4', 2, 11, 'Temporary Haul Road Setup', 'ls', 1, NULL, 15),
(16, 1, '2.5', 2, 11, 'Borrow Pit Preparation', 'ls', 1, NULL, 16),

(17, 1, '3', 1, NULL, 'Earthworks', 'ls', 1, NULL, 17),
(18, 1, '3.1', 2, 17, 'Cut Excavation (Galian)', 'm3', 1500, NULL, 18),
(19, 1, '3.2', 2, 17, 'Fill Embankment (Timbunan)', 'm3', 1200, NULL, 19),
(20, 1, '3.3', 2, 17, 'Hauling Material (Dump Truck Cycle)', 'm3', 1200, NULL, 20),
(21, 1, '3.4', 2, 17, 'Spoil Disposal Area', 'm3', 300, NULL, 21),
(22, 1, '3.5', 2, 17, 'Slope Trimming & Stabilization', 'm2', 400, NULL, 22),
(23, 1, '3.6', 2, 17, 'Subgrade Preparation', 'm2', 3500, NULL, 23),
(24, 1, '3.7', 2, 17, 'Subgrade Compaction', 'm2', 3500, NULL, 24),

(25, 1, '4', 1, NULL, 'Road Structure Works', 'ls', 1, NULL, 25),
(26, 1, '4.1', 2, 25, 'Supply Material Subbase', 'm3', 900, NULL, 26),
(27, 1, '4.2', 2, 25, 'Spreading Subbase', 'm3', 900, NULL, 27),
(28, 1, '4.3', 2, 25, 'Compaction Subbase', 'm3', 900, NULL, 28),
(29, 1, '4.4', 2, 25, 'Field Density Test', 'point', 12, NULL, 29),
(30, 1, '4.5', 2, 25, 'Aggregate Base Class A Supply', 'm3', 800, NULL, 30),
(31, 1, '4.6', 2, 25, 'Laying & Grading Base Course', 'm3', 800, NULL, 31),
(32, 1, '4.7', 2, 25, 'Compaction with Vibro Roller', 'm3', 800, NULL, 32),
(33, 1, '4.8', 2, 25, 'Watering & Moisture Control', 'm3', 800, NULL, 33),
(34, 1, '4.9', 2, 25, 'Laterite Surfacing', 'm2', 5000, NULL, 34),
(35, 1, '4.10', 2, 25, 'Gravel Surfacing', 'm2', 4000, NULL, 35),
(36, 1, '4.11', 2, 25, 'Asphalt Prime Coat (Jika ada)', 'm2', 0, NULL, 36),
(37, 1, '4.12', 2, 25, 'Asphalt Wearing Course (Jika ada)', 'm2', 0, NULL, 37),

(38, 1, '5', 1, NULL, 'Drainage & Water Control', 'ls', 1, NULL, 38),
(39, 1, '5.1', 2, 38, 'Side Ditch Excavation', 'm3', 300, NULL, 39),
(40, 1, '5.2', 2, 38, 'Ditch Lining (Concrete/Stone Pitching)', 'm2', 250, NULL, 40),
(41, 1, '5.3', 2, 38, 'Culvert Installation (Cross Drain)', 'unit', 6, NULL, 41),
(42, 1, '5.4', 2, 38, 'Headwall Construction', 'unit', 6, NULL, 42),
(43, 1, '5.5', 2, 38, 'Drainage Outlet Protection', 'unit', 6, NULL, 43),
(44, 1, '5.6', 2, 38, 'Erosion Control (Geotextile, Riprap)', 'm2', 300, NULL, 44),

(45, 1, '6', 1, NULL, 'Road Furniture & Safety', 'ls', 1, NULL, 45),
(46, 1, '6.1', 2, 45, 'Road Sign Installation', 'unit', 10, NULL, 46),
(47, 1, '6.2', 2, 45, 'Marker Posts & Reflectors', 'unit', 30, NULL, 47),
(48, 1, '6.3', 2, 45, 'Safety Barrier / Guardrail', 'm', 300, NULL, 48),
(49, 1, '6.4', 2, 45, 'Speed Control Devices', 'unit', 4, NULL, 49),
(50, 1, '6.5', 2, 45, 'Lighting (Jika diperlukan)', 'unit', 0, NULL, 50),

(51, 1, '7', 1, NULL, 'Quality Control & Testing', 'ls', 1, NULL, 51),
(52, 1, '7.1', 2, 51, 'Material Source Approval', 'ls', 1, NULL, 52),
(53, 1, '7.2', 2, 51, 'Compaction Test (Sand Cone/DCP)', 'point', 12, NULL, 53),
(54, 1, '7.3', 2, 51, 'Aggregate Gradation Test', 'point', 8, NULL, 54),
(55, 1, '7.4', 2, 51, 'CBR Subgrade Test', 'point', 8, NULL, 55),
(56, 1, '7.5', 2, 51, 'Final Road Acceptance Survey', 'ls', 1, NULL, 56),

(57, 1, '8', 1, NULL, 'Environmental & Rehabilitation', 'ls', 1, NULL, 57),
(58, 1, '8.1', 2, 57, 'Dust Control (Water Spraying)', 'day', 30, NULL, 58),
(59, 1, '8.2', 2, 57, 'Sediment Pond Installation', 'unit', 2, NULL, 59),
(60, 1, '8.3', 2, 57, 'Re-vegetation of Disturbed Areas', 'm2', 1200, NULL, 60),
(61, 1, '8.4', 2, 57, 'Waste Management Plan', 'ls', 1, NULL, 61),
(62, 1, '8.5', 2, 57, 'Final Cleanup', 'ls', 1, NULL, 62),

(63, 1, '9', 1, NULL, 'Handover & Demobilization', 'ls', 1, NULL, 63),
(64, 1, '9.1', 2, 63, 'Punch List Completion', 'ls', 1, NULL, 64),
(65, 1, '9.2', 2, 63, 'As-Built Documentation', 'ls', 1, NULL, 65),
(66, 1, '9.3', 2, 63, 'Final Inspection with Owner', 'ls', 1, NULL, 66),
(67, 1, '9.4', 2, 63, 'Demobilization Equipment', 'ls', 1, NULL, 67),
(68, 1, '9.5', 2, 63, 'Project Close-Out Report', 'ls', 1, NULL, 68);

INSERT INTO ahsp_headers (id, wbs_item_id, direct_cost, unit_rate, computed_at)
VALUES (1, 18, 1750000, 2012500, NOW());

INSERT INTO ahsp_lines (ahsp_id, type, ref_code, name, unit, coefficient, unit_price, subtotal) VALUES
(1, 'material', 'MAT-001', 'Aggregate Base Class A', 'm3', 1.2, 280000, 336000),
(1, 'labor', 'LAB-003', 'Pekerja Umum', 'OH', 0.4, 150000, 60000),
(1, 'equipment', 'EQ-001', 'Excavator 20 Ton', 'hour', 0.8, 850000, 680000),
(1, 'equipment', 'EQ-002', 'Dump Truck 20m3', 'hour', 0.8, 650000, 520000);
