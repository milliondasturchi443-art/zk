-- ============================================================================
-- ZK — development seed
--
-- PURPOSE: local development and automated tests ONLY.
-- This file is loaded by `supabase db reset` (config.toml -> [db.seed]).
-- It is NOT a migration: production deployments never run it, and production
-- content is authored by administrators through the admin dashboard.
--
-- Everything is written inside a single transaction so the deferred
-- publish-validation constraints evaluate only after options and keys exist.
begin;

-- All questions and passages below are ORIGINAL sample content written for
-- this project. They are not College Board material, not official SAT items,
-- and must be replaced by legitimate content before any real use.
-- ============================================================================

insert into public.courses (id, slug, title, description, subject, status, sort_order, published_at)
values
  ('c1000000-0000-4000-8000-000000000001', 'sat-english', 'SAT English',
   'Reading, writing and language practice organised into short learning units.',
   'english', 'published', 1, now()),
  ('c1000000-0000-4000-8000-000000000002', 'sat-math', 'SAT Math',
   'Algebra, advanced math, data analysis and geometry practice with step by step solutions.',
   'math', 'published', 2, now())
on conflict (id) do nothing;

insert into public.course_modules (id, course_id, title, description, sort_order, status, published_at)
values
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
   'Craft and Structure', 'Meaning, purpose and structure of texts.', 1, 'published', now()),
  ('b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001',
   'Standard English Conventions', 'Grammar, usage and punctuation.', 2, 'published', now()),
  ('b1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001',
   'Expression of Ideas', 'Rhetoric, evidence and transitions.', 3, 'published', now()),
  ('b1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002',
   'Algebra', 'Linear equations, systems and inequalities.', 1, 'published', now()),
  ('b1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002',
   'Advanced Math', 'Nonlinear expressions, equations and functions.', 2, 'published', now()),
  ('b1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000002',
   'Problem Solving and Data Analysis', 'Ratios, percentages, statistics and probability.', 3, 'published', now()),
  ('b1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000002',
   'Geometry and Trigonometry', 'Area, volume, angles and right triangles.', 4, 'published', now())
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, summary, content, estimated_minutes, sort_order, status, published_at)
values
  ('e1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
   'Reading a passage for its central idea',
   'Find the claim a passage builds toward and separate it from supporting detail.',
   '[
     {"type":"heading","text":"Central idea"},
     {"type":"paragraph","text":"A central idea is the single claim a passage is built around. Supporting details exist to make that claim believable."},
     {"type":"paragraph","text":"To find it, read the first and last sentence of each paragraph, then ask what the author wants you to accept by the end."},
     {"type":"list","items":["Ignore details that only illustrate a point already made.","Watch for contrast words: but, however, although. They usually carry the claim.","If two answer choices are both true, pick the one the passage is actually arguing for."]},
     {"type":"paragraph","text":"Practice: after reading, state the central idea in one sentence before looking at the answer choices."}
   ]'::jsonb, 12, 1, 'published', now()),

  ('e1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001',
   'Words in context',
   'Infer the meaning of an unfamiliar word from the sentence around it.',
   '[
     {"type":"heading","text":"Vocabulary from context"},
     {"type":"paragraph","text":"You are rarely asked for a dictionary definition. You are asked for the meaning the word carries in this sentence."},
     {"type":"paragraph","text":"Replace the word with each answer choice and reread the sentence. The right choice keeps the sentence internally consistent."},
     {"type":"list","items":["Positive or negative tone narrows the options quickly.","A comma often signals that the phrase after it explains the phrase before it.","Two similar answer choices usually differ by degree, not direction."]}
   ]'::jsonb, 10, 2, 'published', now()),

  ('e1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002',
   'Sentence boundaries and punctuation',
   'Use periods, semicolons and commas to join clauses correctly.',
   '[
     {"type":"heading","text":"Joining clauses"},
     {"type":"paragraph","text":"An independent clause can stand alone. Two independent clauses joined only by a comma create a comma splice."},
     {"type":"paragraph","text":"Fix a splice with a period, a semicolon, or a comma plus a coordinating conjunction (for, and, nor, but, or, yet, so)."},
     {"type":"code","text":"independent clause . independent clause\nindependent clause ; independent clause\nindependent clause , and independent clause"}
   ]'::jsonb, 12, 1, 'published', now()),

  ('e1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000004',
   'Solving linear equations',
   'Isolate a variable using inverse operations and keep both sides balanced.',
   '[
     {"type":"heading","text":"Balance method"},
     {"type":"paragraph","text":"An equation is a balance. Whatever you do to one side, do to the other."},
     {"type":"paragraph","text":"For $3x + 5 = 20$: subtract 5 from both sides to get $3x = 15$, then divide both sides by 3 to get $x = 5$."},
     {"type":"list","items":["Remove parentheses first.","Collect variable terms on one side.","Divide by the coefficient last."]}
   ]'::jsonb, 12, 1, 'published', now()),

  ('e1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000006',
   'Ratios, rates and percentages',
   'Translate a word problem into a proportion before calculating.',
   '[
     {"type":"heading","text":"Proportions"},
     {"type":"paragraph","text":"A ratio compares two quantities. A rate compares quantities with different units. A proportion states that two ratios are equal."},
     {"type":"paragraph","text":"If 5 pens cost $3.50, the unit price is $3.50 / 5 = $0.70, so 8 pens cost 8 x $0.70 = $5.60."},
     {"type":"paragraph","text":"For percentage change: (new - old) / old x 100."}
   ]'::jsonb, 10, 1, 'published', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Sample English questions (original content)
-- ---------------------------------------------------------------------------
insert into public.questions (id, course_id, lesson_id, subject, topic, subtopic, difficulty, kind, prompt, stimulus, directions, status, points, source_note, published_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001',
   'english', 'Craft and Structure', 'Central idea', 'easy', 'mcq',
   'Which choice best states the central idea of the passage?',
   'Urban gardens do more than produce vegetables. They give neighbours a reason to talk to one another, they cool the streets around them, and they turn unused lots into places people care about. Cities that invest in them often see the surrounding blocks become more active and better maintained.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001',
   'english', 'Craft and Structure', 'Evidence', 'medium', 'mcq',
   'Which choice provides the best evidence for the answer to the previous question?',
   'Urban gardens do more than produce vegetables. They give neighbours a reason to talk to one another, they cool the streets around them, and they turn unused lots into places people care about. Cities that invest in them often see the surrounding blocks become more active and better maintained.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002',
   'english', 'Craft and Structure', 'Words in context', 'medium', 'mcq',
   'As used in the passage, "measured" most nearly means',
   'The engineer was measured in her response to the criticism, answering each point in order and without raising her voice.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003',
   'english', 'Standard English Conventions', 'Sentence boundaries', 'easy', 'mcq',
   'Which choice completes the text so that it conforms to the conventions of Standard English?',
   'The greenhouse was finished in April, it opened to visitors the following week.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', null,
   'english', 'Standard English Conventions', 'Verb tense', 'medium', 'mcq',
   'Which choice completes the text so that it conforms to the conventions of Standard English?',
   'By the time the volunteers arrived, the supplies had already been unloaded and stacked.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000001', null,
   'english', 'Expression of Ideas', 'Transitions', 'medium', 'mcq',
   'Which choice most logically completes the text?',
   'The first survey found little support for the plan. ______, the second survey, conducted after the public meeting, found a majority in favour.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000001', null,
   'english', 'Expression of Ideas', 'Rhetorical synthesis', 'hard', 'mcq',
   'The student wants to emphasise that the library extended its hours because of demand. Which choice most effectively combines the ideas?',
   'The library stayed open later in December. Student use of the study rooms rose sharply that month. The library kept the new hours in January.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),

  ('a1000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000001', null,
   'english', 'Craft and Structure', 'Words in context', 'hard', 'mcq',
   'As used in the passage, "qualified" most nearly means',
   'Her praise was qualified: she called the draft promising, then listed four changes she wanted before signing off.',
   'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now())
on conflict (id) do nothing;

insert into public.question_options (id, question_id, label, text, position)
values
  ('f1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000001', 'A', 'Urban gardens are primarily a source of fresh food for city residents.', 1),
  ('f1000000-0000-4000-8000-000000000012', 'a1000000-0000-4000-8000-000000000001', 'B', 'Urban gardens benefit city neighbourhoods in several ways beyond growing food.', 2),
  ('f1000000-0000-4000-8000-000000000013', 'a1000000-0000-4000-8000-000000000001', 'C', 'Unused lots in cities are difficult to turn into useful spaces.', 3),
  ('f1000000-0000-4000-8000-000000000014', 'a1000000-0000-4000-8000-000000000001', 'D', 'Cities should spend more money on cooling their streets.', 4),

  ('f1000000-0000-4000-8000-000000000021', 'a1000000-0000-4000-8000-000000000002', 'A', 'Urban gardens do more than produce vegetables.', 1),
  ('f1000000-0000-4000-8000-000000000022', 'a1000000-0000-4000-8000-000000000002', 'B', 'They give neighbours a reason to talk to one another, they cool the streets around them, and they turn unused lots into places people care about.', 2),
  ('f1000000-0000-4000-8000-000000000023', 'a1000000-0000-4000-8000-000000000002', 'C', 'Cities that invest in them often see the surrounding blocks become more active and better maintained.', 3),
  ('f1000000-0000-4000-8000-000000000024', 'a1000000-0000-4000-8000-000000000002', 'D', 'Neighbours rarely talk to one another in large cities.', 4),

  ('f1000000-0000-4000-8000-000000000031', 'a1000000-0000-4000-8000-000000000003', 'A', 'deliberate', 1),
  ('f1000000-0000-4000-8000-000000000032', 'a1000000-0000-4000-8000-000000000003', 'B', 'hesitant', 2),
  ('f1000000-0000-4000-8000-000000000033', 'a1000000-0000-4000-8000-000000000003', 'C', 'partial', 3),
  ('f1000000-0000-4000-8000-000000000034', 'a1000000-0000-4000-8000-000000000003', 'D', 'unusual', 4),

  ('f1000000-0000-4000-8000-000000000041', 'a1000000-0000-4000-8000-000000000004', 'A', 'The greenhouse was finished in April, it opened to visitors the following week.', 1),
  ('f1000000-0000-4000-8000-000000000042', 'a1000000-0000-4000-8000-000000000004', 'B', 'The greenhouse was finished in April; it opened to visitors the following week.', 2),
  ('f1000000-0000-4000-8000-000000000043', 'a1000000-0000-4000-8000-000000000004', 'C', 'The greenhouse was finished in April it opened to visitors the following week.', 3),
  ('f1000000-0000-4000-8000-000000000044', 'a1000000-0000-4000-8000-000000000004', 'D', 'The greenhouse was finished in April, opening visitors the following week.', 4),

  ('f1000000-0000-4000-8000-000000000051', 'a1000000-0000-4000-8000-000000000005', 'A', 'By the time the volunteers arrived, the supplies had already been unloaded and stacked.', 1),
  ('f1000000-0000-4000-8000-000000000052', 'a1000000-0000-4000-8000-000000000005', 'B', 'By the time the volunteers arrived, the supplies were already unloaded and stacked.', 2),
  ('f1000000-0000-4000-8000-000000000053', 'a1000000-0000-4000-8000-000000000005', 'C', 'By the time the volunteers arrived, the supplies have already been unloaded and stacked.', 3),
  ('f1000000-0000-4000-8000-000000000054', 'a1000000-0000-4000-8000-000000000005', 'D', 'By the time the volunteers arrived, the supplies will already be unloaded and stacked.', 4),

  ('f1000000-0000-4000-8000-000000000061', 'a1000000-0000-4000-8000-000000000006', 'A', 'For example', 1),
  ('f1000000-0000-4000-8000-000000000062', 'a1000000-0000-4000-8000-000000000006', 'B', 'Similarly', 2),
  ('f1000000-0000-4000-8000-000000000063', 'a1000000-0000-4000-8000-000000000006', 'C', 'In contrast', 3),
  ('f1000000-0000-4000-8000-000000000064', 'a1000000-0000-4000-8000-000000000006', 'D', 'Furthermore', 4),

  ('f1000000-0000-4000-8000-000000000071', 'a1000000-0000-4000-8000-000000000007', 'A', 'Because student use of the study rooms rose sharply in December, the library extended its hours and kept them into January.', 1),
  ('f1000000-0000-4000-8000-000000000072', 'a1000000-0000-4000-8000-000000000007', 'B', 'The library stayed open later in December, and student use of the study rooms rose sharply that month; the library kept the new hours in January.', 2),
  ('f1000000-0000-4000-8000-000000000073', 'a1000000-0000-4000-8000-000000000007', 'C', 'Student use of the study rooms rose sharply in December. The library stayed open later that month and kept the new hours in January.', 3),
  ('f1000000-0000-4000-8000-000000000074', 'a1000000-0000-4000-8000-000000000007', 'D', 'The library kept its new hours in January after staying open later in December, when study room use rose sharply.', 4),

  ('f1000000-0000-4000-8000-000000000081', 'a1000000-0000-4000-8000-000000000008', 'A', 'authorised', 1),
  ('f1000000-0000-4000-8000-000000000082', 'a1000000-0000-4000-8000-000000000008', 'B', 'restrained', 2),
  ('f1000000-0000-4000-8000-000000000083', 'a1000000-0000-4000-8000-000000000008', 'C', 'skilled', 3),
  ('f1000000-0000-4000-8000-000000000084', 'a1000000-0000-4000-8000-000000000008', 'D', 'certain', 4)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Sample Math questions (original content)
-- ---------------------------------------------------------------------------
insert into public.questions (id, course_id, lesson_id, subject, topic, subtopic, difficulty, kind, prompt, stimulus, directions, status, points, source_note, published_at)
values
  ('a2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000004',
   'math', 'Algebra', 'Linear equations', 'easy', 'mcq',
   'If $3x + 5 = 20$, what is the value of $x$?', null, 'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Algebra', 'Systems of equations', 'medium', 'mcq',
   'What is the value of $y$ in the system $x + y = 11$ and $x - y = 5$?', null, 'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Algebra', 'Linear inequalities', 'medium', 'numeric',
   'If $2x - 4 > 6$, what is the least integer value of $x$?', null, 'Enter your answer as an integer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Advanced Math', 'Quadratics', 'medium', 'mcq',
   'If $x^2 - 7x + 10 = 0$, what is the greater solution?', null, 'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Advanced Math', 'Exponents', 'hard', 'numeric',
   'If $2^a = 32$ and $3^b = 81$, what is $a + b$?', null, 'Enter your answer as an integer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000005',
   'math', 'Problem Solving and Data Analysis', 'Percentages', 'easy', 'numeric',
   'A jacket is reduced from $80 to $60. What is the percent decrease, in percent?', null, 'Enter your answer as a number.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Problem Solving and Data Analysis', 'Ratios', 'medium', 'numeric',
   '5 pens cost $3.50. At the same rate, how many dollars do 8 pens cost?', null, 'Enter your answer as a decimal.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Geometry and Trigonometry', 'Area', 'easy', 'numeric',
   'A rectangle has length 12 and width 5. What is its area?', null, 'Enter your answer as an integer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Geometry and Trigonometry', 'Right triangles', 'medium', 'numeric',
   'A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?', null, 'Enter your answer as an integer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now()),
  ('a2000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000002', null,
   'math', 'Problem Solving and Data Analysis', 'Probability', 'medium', 'mcq',
   'A bag holds 4 red, 3 blue and 5 green marbles. One marble is drawn at random. What is the probability it is not green?', null, 'Select the best answer.', 'published', 1,
   'Original sample content for ZK development seed (not official SAT material)', now())
on conflict (id) do nothing;

insert into public.question_options (id, question_id, label, text, position)
values
  ('f2000000-0000-4000-8000-000000000011', 'a2000000-0000-4000-8000-000000000001', 'A', '3', 1),
  ('f2000000-0000-4000-8000-000000000012', 'a2000000-0000-4000-8000-000000000001', 'B', '5', 2),
  ('f2000000-0000-4000-8000-000000000013', 'a2000000-0000-4000-8000-000000000001', 'C', '8', 3),
  ('f2000000-0000-4000-8000-000000000014', 'a2000000-0000-4000-8000-000000000001', 'D', '15', 4),
  ('f2000000-0000-4000-8000-000000000021', 'a2000000-0000-4000-8000-000000000002', 'A', '2', 1),
  ('f2000000-0000-4000-8000-000000000022', 'a2000000-0000-4000-8000-000000000002', 'B', '3', 2),
  ('f2000000-0000-4000-8000-000000000023', 'a2000000-0000-4000-8000-000000000002', 'C', '6', 3),
  ('f2000000-0000-4000-8000-000000000024', 'a2000000-0000-4000-8000-000000000002', 'D', '8', 4),
  ('f2000000-0000-4000-8000-000000000041', 'a2000000-0000-4000-8000-000000000004', 'A', '10', 1),
  ('f2000000-0000-4000-8000-000000000042', 'a2000000-0000-4000-8000-000000000004', 'B', '5', 2),
  ('f2000000-0000-4000-8000-000000000043', 'a2000000-0000-4000-8000-000000000004', 'C', '7', 3),
  ('f2000000-0000-4000-8000-000000000044', 'a2000000-0000-4000-8000-000000000004', 'D', '2', 4),
  ('f2000000-0000-4000-8000-000000000101', 'a2000000-0000-4000-8000-000000000010', 'A', '7/12', 1),
  ('f2000000-0000-4000-8000-000000000102', 'a2000000-0000-4000-8000-000000000010', 'B', '5/12', 2),
  ('f2000000-0000-4000-8000-000000000103', 'a2000000-0000-4000-8000-000000000010', 'C', '1/2', 3),
  ('f2000000-0000-4000-8000-000000000104', 'a2000000-0000-4000-8000-000000000010', 'D', '3/4', 4)
on conflict (id) do nothing;

insert into public.question_keys (question_id, correct_option_id, numeric_answer, numeric_tolerance, explanation)
values
  ('a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000012', null, 0,
   'The passage lists social, temperature and land-use benefits and ends by saying surrounding blocks improve. Choice B covers all of that; the others restate a single detail or add an unsupported demand.'),
  ('a1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000022', null, 0,
   'That sentence enumerates the three benefits, so it is the strongest evidence for a central idea about multiple benefits. The other sentences each support only one part of the claim.'),
  ('a1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000031', null, 0,
   'Answering each point in order and without raising her voice describes a controlled, deliberate manner. "Hesitant" would imply uncertainty, which the sentence does not support.'),
  ('a1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000042', null, 0,
   'Two independent clauses joined by only a comma create a comma splice. A semicolon correctly joins them; a period would also work but is not offered as an option.'),
  ('a1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000051', null, 0,
   'The unloading happened before the volunteers arrived, so the past perfect ("had already been unloaded") is required.'),
  ('a1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000063', null, 0,
   'The two surveys produced opposite results, so a contrast transition is needed. "In contrast" marks that reversal; the other choices imply similarity, example or addition.'),
  ('a1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000071', null, 0,
   'Choice A states the cause (rising demand) before the effect (extended hours) and keeps the January detail, which is the emphasis the student wants.'),
  ('a1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000082', null, 0,
   'The praise is followed by four requested changes, so the approval is limited or restrained. "Qualified" carries that meaning here, not permission or confidence.'),
  ('a2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000012', null, 0,
   'Subtract 5 from both sides: 3x = 15. Divide both sides by 3: x = 5.'),
  ('a2000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000022', null, 0,
   'Add the two equations: 2x = 16, so x = 8. Substituting into x + y = 11 gives y = 3.'),
  ('a2000000-0000-4000-8000-000000000003', null, 6, 0,
   '2x - 4 > 6 gives 2x > 10, so x > 5. The least integer greater than 5 is 6.'),
  ('a2000000-0000-4000-8000-000000000004', 'f2000000-0000-4000-8000-000000000042', null, 0,
   'Factor: (x - 2)(x - 5) = 0, so the solutions are 2 and 5. The greater solution is 5, which is choice B.'),
  ('a2000000-0000-4000-8000-000000000005', null, 9, 0,
   '2^a = 32 gives a = 5. 3^b = 81 gives b = 4. So a + b = 9.'),
  ('a2000000-0000-4000-8000-000000000006', null, 25, 0,
   'The decrease is 80 - 60 = 20. Percent decrease = 20 / 80 x 100 = 25%.'),
  ('a2000000-0000-4000-8000-000000000007', null, 5.6, 0.001,
   'Unit price = 3.50 / 5 = 0.70 dollars per pen. For 8 pens: 8 x 0.70 = 5.60 dollars.'),
  ('a2000000-0000-4000-8000-000000000008', null, 60, 0,
   'Area = length x width = 12 x 5 = 60.'),
  ('a2000000-0000-4000-8000-000000000009', null, 10, 0,
   'By the Pythagorean theorem: 6^2 + 8^2 = 36 + 64 = 100, and the square root of 100 is 10.'),
  ('a2000000-0000-4000-8000-000000000010', 'f2000000-0000-4000-8000-000000000101', null, 0,
   'There are 12 marbles in total, 5 of them green, so 7 are not green. The probability is 7/12.')
on conflict (question_id) do nothing;

commit;
