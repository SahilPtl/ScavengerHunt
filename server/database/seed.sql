INSERT INTO hunts(id,name,description) VALUES(1,'MNNIT Campus Challenge','Six places. One campus. A new way to explore.') ON CONFLICT DO NOTHING;
-- All coordinates are illustrative demo positions, not surveyed campus destinations.
INSERT INTO checkpoints(id,hunt_id,name,clue,hint,latitude,longitude,sequence_number) VALUES
(1,1,'Main Building','Every campus story needs a first chapter. Seek the place where the institution welcomes its next generation.','Think of the main academic entrance.',25.4940,81.8662,1),
(2,1,'Central Library','Thousands of voices wait here, yet silence is the rule. Find where a borrowed story opens a new world.','Books and reading desks are your companions.',25.4935,81.8668,2),
(3,1,'Computer Science Department','Here, a missing semicolon can start a long conversation. Follow the minds that turn logic into running worlds.','Look for the home of algorithms and programming.',25.4929,81.8661,3),
(4,1,'Student Activity Centre','When lectures end, the stage comes alive. Find the gathering place where ideas rehearse their first applause.','Clubs and cultural activities meet here.',25.4923,81.8656,4),
(5,1,'Athletics Ground','No keyboard is needed to beat this personal best. Seek open space where the finish line keeps moving you forward.','Look for an outdoor field for running and sports.',25.4917,81.8649,5),
(6,1,'Hostel Area','After the last lecture, another kind of learning begins: shared meals, late conversations, and rooms away from home.','Where do students live on campus?',25.4912,81.8655,6)
ON CONFLICT DO NOTHING;
