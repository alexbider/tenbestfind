-- Data, not shape.
--
-- These belong in the boot chain, and they are there: two scripts that fill
-- an empty icon or an unwritten detail and leave anything set alone. The
-- problem is that adding a step to docker-compose.yml only reaches the server
-- when the project is replaced through the API. A restart re-runs the
-- containers against the compose already on the box, which updates the code
-- and not the compose, so the new steps sat in the repository doing nothing
-- while the pages they feed fell back to prose.
--
-- `prisma migrate deploy` is already a step in the compose that is on the
-- box, so this arrives on the next restart. Every statement is guarded on the
-- column being empty: this fills a gap and never overwrites an editor.

-- An icon per job, rather than the parent trade's icon repeated down a row
-- of sibling cards.
UPDATE "Subservice" SET "iconKey" = 'snow' WHERE "iconKey" IS NULL AND "slug" = 'refrigerator-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'appliance-repair');
UPDATE "Subservice" SET "iconKey" = 'washer' WHERE "iconKey" IS NULL AND "slug" = 'washer-dryer-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'appliance-repair');
UPDATE "Subservice" SET "iconKey" = 'flame' WHERE "iconKey" IS NULL AND "slug" = 'oven-range-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'appliance-repair');
UPDATE "Subservice" SET "iconKey" = 'droplet' WHERE "iconKey" IS NULL AND "slug" = 'dishwasher-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'appliance-repair');
UPDATE "Subservice" SET "iconKey" = 'broom' WHERE "iconKey" IS NULL AND "slug" = 'chimney-sweeping' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'chimney-services');
UPDATE "Subservice" SET "iconKey" = 'masonry' WHERE "iconKey" IS NULL AND "slug" = 'chimney-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'chimney-services');
UPDATE "Subservice" SET "iconKey" = 'eye' WHERE "iconKey" IS NULL AND "slug" = 'chimney-inspection' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'chimney-services');
UPDATE "Subservice" SET "iconKey" = 'pipe' WHERE "iconKey" IS NULL AND "slug" = 'liner-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'chimney-services');
UPDATE "Subservice" SET "iconKey" = 'spray' WHERE "iconKey" IS NULL AND "slug" = 'deep-cleaning' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'cleaning');
UPDATE "Subservice" SET "iconKey" = 'box' WHERE "iconKey" IS NULL AND "slug" = 'move-out' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'cleaning');
UPDATE "Subservice" SET "iconKey" = 'refresh' WHERE "iconKey" IS NULL AND "slug" = 'recurring' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'cleaning');
UPDATE "Subservice" SET "iconKey" = 'sliders' WHERE "iconKey" IS NULL AND "slug" = 'panel-upgrades' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'electricians');
UPDATE "Subservice" SET "iconKey" = 'link' WHERE "iconKey" IS NULL AND "slug" = 'rewiring' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'electricians');
UPDATE "Subservice" SET "iconKey" = 'plug' WHERE "iconKey" IS NULL AND "slug" = 'ev-charger-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'electricians');
UPDATE "Subservice" SET "iconKey" = 'bulb' WHERE "iconKey" IS NULL AND "slug" = 'lighting-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'electricians');
UPDATE "Subservice" SET "iconKey" = 'spark' WHERE "iconKey" IS NULL AND "slug" = 'generator-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'electricians');
UPDATE "Subservice" SET "iconKey" = 'floor' WHERE "iconKey" IS NULL AND "slug" = 'hardwood' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "iconKey" = 'grid' WHERE "iconKey" IS NULL AND "slug" = 'tile' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "iconKey" = 'layers' WHERE "iconKey" IS NULL AND "slug" = 'vinyl-plank' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "iconKey" = 'layout' WHERE "iconKey" IS NULL AND "slug" = 'carpet' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "iconKey" = 'tools' WHERE "iconKey" IS NULL AND "slug" = 'repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'garage-doors');
UPDATE "Subservice" SET "iconKey" = 'plug' WHERE "iconKey" IS NULL AND "slug" = 'opener-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'garage-doors');
UPDATE "Subservice" SET "iconKey" = 'gear' WHERE "iconKey" IS NULL AND "slug" = 'spring-replacement' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'garage-doors');
UPDATE "Subservice" SET "iconKey" = 'garage' WHERE "iconKey" IS NULL AND "slug" = 'door-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'garage-doors');
UPDATE "Subservice" SET "iconKey" = 'ruler' WHERE "iconKey" IS NULL AND "slug" = 'design-build' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'general-contractors');
UPDATE "Subservice" SET "iconKey" = 'house' WHERE "iconKey" IS NULL AND "slug" = 'whole-home-renovation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'general-contractors');
UPDATE "Subservice" SET "iconKey" = 'clipboard' WHERE "iconKey" IS NULL AND "slug" = 'permitting' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'general-contractors');
UPDATE "Subservice" SET "iconKey" = 'broom' WHERE "iconKey" IS NULL AND "slug" = 'cleaning' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'gutters');
UPDATE "Subservice" SET "iconKey" = 'shield' WHERE "iconKey" IS NULL AND "slug" = 'guards' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'gutters');
UPDATE "Subservice" SET "iconKey" = 'flame' WHERE "iconKey" IS NULL AND "slug" = 'kitchen-remodeling' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'home-remodeling');
UPDATE "Subservice" SET "iconKey" = 'bath' WHERE "iconKey" IS NULL AND "slug" = 'bathroom-remodeling' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'home-remodeling');
UPDATE "Subservice" SET "iconKey" = 'foundation' WHERE "iconKey" IS NULL AND "slug" = 'basement-remodeling' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'home-remodeling');
UPDATE "Subservice" SET "iconKey" = 'plus' WHERE "iconKey" IS NULL AND "slug" = 'additions' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'home-remodeling');
UPDATE "Subservice" SET "iconKey" = 'snow' WHERE "iconKey" IS NULL AND "slug" = 'ac-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'hvac');
UPDATE "Subservice" SET "iconKey" = 'wind' WHERE "iconKey" IS NULL AND "slug" = 'ac-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'hvac');
UPDATE "Subservice" SET "iconKey" = 'flame' WHERE "iconKey" IS NULL AND "slug" = 'furnace-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'hvac');
UPDATE "Subservice" SET "iconKey" = 'pump' WHERE "iconKey" IS NULL AND "slug" = 'heat-pump-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'hvac');
UPDATE "Subservice" SET "iconKey" = 'filter' WHERE "iconKey" IS NULL AND "slug" = 'duct-cleaning' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'hvac');
UPDATE "Subservice" SET "iconKey" = 'calendar' WHERE "iconKey" IS NULL AND "slug" = 'maintenance-plans' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'hvac');
UPDATE "Subservice" SET "iconKey" = 'leaf' WHERE "iconKey" IS NULL AND "slug" = 'lawn-care' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'landscaping');
UPDATE "Subservice" SET "iconKey" = 'masonry' WHERE "iconKey" IS NULL AND "slug" = 'hardscaping' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'landscaping');
UPDATE "Subservice" SET "iconKey" = 'droplet' WHERE "iconKey" IS NULL AND "slug" = 'irrigation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'landscaping');
UPDATE "Subservice" SET "iconKey" = 'pencil' WHERE "iconKey" IS NULL AND "slug" = 'design' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'landscaping');
UPDATE "Subservice" SET "iconKey" = 'lock' WHERE "iconKey" IS NULL AND "slug" = 'emergency-lockout' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'locksmiths');
UPDATE "Subservice" SET "iconKey" = 'key' WHERE "iconKey" IS NULL AND "slug" = 'rekeying' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'locksmiths');
UPDATE "Subservice" SET "iconKey" = 'shield' WHERE "iconKey" IS NULL AND "slug" = 'lock-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'locksmiths');
UPDATE "Subservice" SET "iconKey" = 'phone' WHERE "iconKey" IS NULL AND "slug" = 'smart-lock-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'locksmiths');
UPDATE "Subservice" SET "iconKey" = 'truck' WHERE "iconKey" IS NULL AND "slug" = 'local' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'moving-companies');
UPDATE "Subservice" SET "iconKey" = 'map' WHERE "iconKey" IS NULL AND "slug" = 'long-distance' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'moving-companies');
UPDATE "Subservice" SET "iconKey" = 'box' WHERE "iconKey" IS NULL AND "slug" = 'storage' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'moving-companies');
UPDATE "Subservice" SET "iconKey" = 'tag' WHERE "iconKey" IS NULL AND "slug" = 'packing' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'moving-companies');
UPDATE "Subservice" SET "iconKey" = 'roller' WHERE "iconKey" IS NULL AND "slug" = 'interior' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'painting');
UPDATE "Subservice" SET "iconKey" = 'house' WHERE "iconKey" IS NULL AND "slug" = 'exterior' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'painting');
UPDATE "Subservice" SET "iconKey" = 'spray' WHERE "iconKey" IS NULL AND "slug" = 'cabinet-refinishing' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'painting');
UPDATE "Subservice" SET "iconKey" = 'bug' WHERE "iconKey" IS NULL AND "slug" = 'termites' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'pest-control');
UPDATE "Subservice" SET "iconKey" = 'alert' WHERE "iconKey" IS NULL AND "slug" = 'rodents' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'pest-control');
UPDATE "Subservice" SET "iconKey" = 'spray' WHERE "iconKey" IS NULL AND "slug" = 'mosquitoes' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'pest-control');
UPDATE "Subservice" SET "iconKey" = 'alert' WHERE "iconKey" IS NULL AND "slug" = 'emergency-plumbing' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'drain' WHERE "iconKey" IS NULL AND "slug" = 'drain-cleaning' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'heater' WHERE "iconKey" IS NULL AND "slug" = 'water-heater-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'pipe' WHERE "iconKey" IS NULL AND "slug" = 'repiping' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'sewer' WHERE "iconKey" IS NULL AND "slug" = 'sewer-line-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'leak' WHERE "iconKey" IS NULL AND "slug" = 'leak-detection' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'flame' WHERE "iconKey" IS NULL AND "slug" = 'gas-line-work' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'bath' WHERE "iconKey" IS NULL AND "slug" = 'fixture-installation' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'plumbers');
UPDATE "Subservice" SET "iconKey" = 'waves' WHERE "iconKey" IS NULL AND "slug" = 'water-damage' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'restoration');
UPDATE "Subservice" SET "iconKey" = 'smoke' WHERE "iconKey" IS NULL AND "slug" = 'fire-smoke' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'restoration');
UPDATE "Subservice" SET "iconKey" = 'mold' WHERE "iconKey" IS NULL AND "slug" = 'mold' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'restoration');
UPDATE "Subservice" SET "iconKey" = 'tools' WHERE "iconKey" IS NULL AND "slug" = 'roof-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'roofing');
UPDATE "Subservice" SET "iconKey" = 'house' WHERE "iconKey" IS NULL AND "slug" = 'roof-replacement' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'roofing');
UPDATE "Subservice" SET "iconKey" = 'eye' WHERE "iconKey" IS NULL AND "slug" = 'roof-inspection' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'roofing');
UPDATE "Subservice" SET "iconKey" = 'layers' WHERE "iconKey" IS NULL AND "slug" = 'metal-roofing' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'roofing');
UPDATE "Subservice" SET "iconKey" = 'layout' WHERE "iconKey" IS NULL AND "slug" = 'flat-roofing' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'roofing');
UPDATE "Subservice" SET "iconKey" = 'rain' WHERE "iconKey" IS NULL AND "slug" = 'storm-damage-repair' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'roofing');
UPDATE "Subservice" SET "iconKey" = 'window' WHERE "iconKey" IS NULL AND "slug" = 'window-replacement' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'windows-doors');
UPDATE "Subservice" SET "iconKey" = 'access' WHERE "iconKey" IS NULL AND "slug" = 'entry-doors' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'windows-doors');
UPDATE "Subservice" SET "iconKey" = 'sun' WHERE "iconKey" IS NULL AND "slug" = 'patio-doors' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'windows-doors');

-- The line under a name on a sibling card.
UPDATE "Subservice" SET "description" = 'Solid and engineered wood, plus refinishing existing floors.' WHERE "description" IS NULL AND "slug" = 'hardwood' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "description" = 'Ceramic, porcelain and stone, plus the substrate work underneath.' WHERE "description" IS NULL AND "slug" = 'tile' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "description" = 'Waterproof plank flooring, wear layers and subfloor preparation.' WHERE "description" IS NULL AND "slug" = 'vinyl-plank' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');
UPDATE "Subservice" SET "description" = 'Carpet and underlay, fibre choice, and what warranties require.' WHERE "description" IS NULL AND "slug" = 'carpet' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');

-- The four written sections: the comparison, the prices, the claim and the
-- failure points. Only where nothing is written yet.
UPDATE "Subservice" SET "detail" = '{"involves":{"heading":"Solid or engineered, and where each one can go","paragraphs":["Solid hardwood is one piece of timber all the way through, which is what lets it be sanded and refinished repeatedly across decades. Engineered hardwood is a real wood veneer over a plywood core, so it looks identical once laid but can only be refinished once or twice, and sometimes not at all if the veneer is thin.","The deciding factor is usually not preference, it is where the floor is going. On a normal timber subfloor above ground either works, and solid lasts longer."],"options":[{"name":"Solid hardwood","note":"One piece of timber throughout","rows":[{"label":"Over concrete slab","value":"No","tone":"against"},{"label":"Over radiant heating","value":"No","tone":"against"},{"label":"Below grade","value":"No","tone":"against"},{"label":"Refinishing","value":"Repeatedly","tone":"for"}]},{"name":"Engineered hardwood","note":"Wood veneer over a plywood core","rows":[{"label":"Over concrete slab","value":"Yes","tone":"for"},{"label":"Over radiant heating","value":"Yes","tone":"for"},{"label":"Below grade","value":"Yes","tone":"for"},{"label":"Refinishing","value":"Once or twice","tone":"mixed"}]}],"footnote":"Engineered is dimensionally stable, so it goes over concrete slabs and over radiant heating, both of which solid hardwood cannot do reliably. Below grade, in a basement, engineered is the only one of the two worth considering."},"prices":{"eyebrow":"Hardwood by type","heading":"What it costs per square foot","lead":"Installed, 2026, including materials and labour on a straightforward rectangular room.","unit":"Dollars per square foot","currency":"$","items":[{"name":"Engineered hardwood","low":8,"high":14,"note":"Goes where solid cannot."},{"name":"Solid hardwood","low":9,"high":18,"note":"Lasts longest on a timber subfloor above ground."},{"name":"Refinishing an existing floor","low":3,"high":5,"tone":"mixed","note":"Often the better spend if the boards are sound."}],"footnote":"Removing the old floor adds $1 to $3 per square foot. Minor levelling adds roughly five to eight percent to a job, and replacing soft or rotten subfloor sections adds ten to twenty percent or more.","aside":{"label":"Cheapest good option","heading":"Refinishing is a third of the price of replacing","body":"If you have hardwood already and it looks tired, price refinishing before replacement. At $3 to $5 a square foot against $9 to $18 for new, sanding back and refinishing a floor is a fraction of the cost and gives you a floor with more remaining life than a new engineered one.","footnote":"The question is only how much thickness is left above the tongue, which a flooring contractor can tell you in a few minutes."}},"claim":{"eyebrow":"Resale","heading":"It is the one flooring choice that reliably affects resale","lead":"Vinyl and laminate have closed the gap on appearance to the point where most people cannot tell at a normal viewing distance. What they have not closed is the effect on valuation.","notes":["Real hardwood still moves appraisals and buyer perception in a way that convincing imitations do not, particularly at higher price points.","That cuts both ways. In a house where the comparable sales do not have hardwood, installing it will not lift the value to match what it cost. The advantage shows up where buyers expect it and its absence would be noticed."]},"pitfalls":[{"title":"Acclimation","body":"Wood needs to sit in the room it will live in, for days, reaching the humidity of that space before it is fitted. Floors laid straight off the delivery truck are the ones that gap in winter or cup in summer, and the installer who wants to fit tomorrow is the one to question.","ask":"How many days will the wood sit in the room before you fit it?"},{"title":"Subfloor flatness","body":"It matters more with wider boards. Wide plank over an uneven subfloor moves, creaks and shows every dip. Ask what flatness tolerance the manufacturer specifies and whether the subfloor was checked against it, because that answer separates installers who have read the instructions from those who have not.","ask":"What flatness tolerance does the manufacturer specify, and was it checked?"}]}' WHERE "detail" IS NULL AND "slug" = 'hardwood' AND "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" = 'flooring');

