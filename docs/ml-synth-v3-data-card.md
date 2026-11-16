# Data card: `synth-v3` synthetic mentorship dataset

**17 November 2026 · Issue #114 · Status: generated labels, machine audit only, not human-reviewed.**

`synth-v3` is a synthetic dataset built so that a mentorship matching model can be trained from random
weights and measured on more than five queries. Every person in it is fictional. It cannot show how any
model performs on real alumni; the independent checks that are still missing are listed at the end.

The dataset itself is private and stays in the ignored `ml/data/synth-v3/` folder, with a zip backup in
`ml/artifacts/`. Committed to Git: the generator (`ml/synth/`), its tests, a six-profile invented fixture
(`ml/synth/fixture/`) and this card.

## Provenance and licence

| Part | Source |
| --- | --- |
| Occupations, tasks, tools, knowledge areas, related-occupation links | O*NET 30.2 Database (February 2026 Release), U.S. Department of Labor, Employment and Training Administration. Licence: CC BY 4.0. Downloaded from onetcenter.org as `db_30_2_text.zip` (SHA-256 `b5479271931796b838f7173dc0f673a9ec961b7833ac87168fd11e92e7453741`) into its own folder and parsed in Python isolated mode (`python -I ml/synth/parse_onet.py`). |
| Who each fictional person is | Seeded sampler, `ml/synth/specs.py` (seed 20261117) |
| Relevance grades | Deterministic rule, `ml/synth/grades.py` |
| Profile wording | Claude Haiku (`claude-haiku-5-5`) through headless Claude Code calls with no tools, from the briefs in `ml/synth/prompts.py`. Total writing cost about $2.23. |
| Machine audit judge | Claude Sonnet, blind to grades and specifications |

Nothing else was downloaded. No real profile, member record or employer name is used. The frozen MiniLM model
took no part: it did not label, filter, mine or select anything.

This dataset uses O*NET information but has not been approved or endorsed by the U.S. Department of Labor.

## How a record is made

1. **Occupation selection.** 171 occupations can be held by Mentors: 11 from a fixed aviation
   list, 10 from a fixed logistics list, and 150 sampled from other graduate-level occupations
   (management 33, engineering 37, computing 13, business and finance 19, other fields 48).
   Sampling weights per occupation: aviation 6.0, logistics 3.5, management and engineering 2.0, computing 1.5,
   business and finance 1.2, other fields 0.3 to 0.4. By person, the result is aviation 24.8%,
   logistics 13.0%, engineering 25.8%, management 22.9%, computing 2.0%,
   business and finance 5.9%, other 5.7%. 84.0% of people are placed in East African
   cities (Nairobi alone 36.0%); the rest are diaspora cities or have no stated location.
2. **Hidden specification.** A Mentor has an occupation, sometimes an earlier occupation (15% are career
   changers), a seniority level and years of experience, three to six skills drawn from the occupation's O*NET
   tools and knowledge areas, and one to three kinds of support offered. A Mentee has a target occupation, a
   stage (student to mid career), one goal, skills held and skills wanted, and for career changers (about 20%)
   a current occupation. The seven kinds of support and goal are: career entry, technical growth,
   certification, career change, leadership, postgraduate study and entrepreneurship.
3. **Difficulty cases.** Mentees: 65% standard, 20% vocabulary mismatch (the occupation title and its
   distinctive words must not appear), 15% sparse (a nearly empty cold-start profile). Mentors: 75%, 15%, 10%.
   About 8% of Mentees aim for an "orphan" occupation that no Mentor holds and that has no taxonomy link to
   any Mentor occupation, so they have no suitable Mentor.
4. **Grade.** `grades.grade(mentee, mentor)` returns 0 to 3 from the two specifications (next section).
5. **Wording.** A brief built from the specification is sent to the writer in batches of 20. The writer never
   sees a grade, a person identifier, an occupation code or the other side of any pair.
6. **Validation gate** (`ml/synth/gate.py`), then **splits** (`ml/synth/splits.py`).

## Grade rule

The rubric is the one in `docs/ml-next-steps.md`: 3 clear primary-goal and offered-support alignment; 2
primary-goal support with a significant limitation; 1 tangential help or insufficient evidence; 0 unsuitable.

Three things are read from the specifications:

- **Proximity** of the Mentor's occupation to the Mentee's target: 3 same occupation; 2 linked in O*NET
  (a primary related occupation in either direction, or the same six-digit occupation group); 1 same
  occupation cluster (SOC minor group, for example `17-2` engineers); 0 otherwise. A Mentor's earlier
  occupation counts one level lower.
- **Support**: whether the Mentee's goal is among the kinds of help the Mentor offers.
- **Shared skills**: how many skills the Mentee wants that the Mentor lists.

| Mentee goal | Proximity | Support offered | Grade |
| --- | --- | --- | --- |
| Field-specific (entry, technical growth, certification, career change) | 3 | yes | 3 |
| | 3 | no | 2 if two or more wanted skills are shared, otherwise 1 |
| | 2 | yes | 2 (3 if the Mentor made the same career move the Mentee plans) |
| | 2 | no | 1 |
| | 1 | yes | 1 |
| | 1 | no | 0 |
| | 0 | yes | 1 if two or more wanted skills are shared, otherwise 0 |
| | 0 | no | 0 |
| General (leadership, postgraduate, entrepreneurship) | 2 or 3 | yes | 3 |
| | 0 or 1 | yes | 2 if the same broad occupation family, otherwise 1 |
| | 2 or 3 | no | 1 |
| | 0 or 1 | no | 0 |

Examples: a Mentee wanting a first job as a logistician with a logistician who offers career-entry help
is 3; with a supply chain manager (linked) offering the same help, 2; with a logistician who only offers
leadership coaching, 1; with a civil engineer, 0. The same cases are unit tests in
`ml/training_tests/test_synth_dataset.py`. The grade never reads the written text and never calls a model.

## Prompts and writing rules

Two prompt templates exist so that test wording is produced differently from training wording. Template A
writes training and validation profiles. Template B writes test profiles only: different instructions,
different brief layout and different phrasing of every kind of support. Writing styles are also disjoint:
14 styles for training, 5 for validation and 7 for test (listed in `specs.STYLES`).

Template A system prompt, verbatim:

    You write short, realistic profiles for a fictional university alumni mentoring platform in East Africa.
    For each numbered brief, write one profile as the person would write it themselves.
    
    Rules:
    - Everyone is invented. Never give a person's name. Never name a real company, airline, university, bank or
      product maker's employer; say things like "a regional airline" or "a logistics firm" instead.
    - Return four fields: "headline" (at most 90 characters), "bio", "skills" (a list of short items) and "industry"
      (a short sector label).
    - A mentor's profile must make every kind of help in "Offers" recognisable in its own words, and must not offer
      any other kind of help. A mentee's profile must make the "Goal" recognisable in its own words. Never copy the
      wording of the "Offers" or "Goal" line; say the same thing differently each time.
    - Follow the "Style" line for voice and length. Vary your wording between profiles; do not reuse stock phrases.
    - Case "standard": write naturally.
    - Case "indirect": do not use any word in "Avoid", or close variants of those words. Show the work through what
      the person actually does day to day, and describe skills in everyday words rather than product names.
    - Case "sparse": the person filled in very little. Headline of at most six words, bio either empty or under
      twelve words, at most two skills, industry may be empty. Keep whatever hint of field and goal fits.
    - If the city is "not stated", leave location out.
    - British English. No bullet points, no emoji, no hashtags. Do not mention briefs, cases, styles or these rules.
    
    Reply with only a JSON array, one object per brief, in order:
    [{"n": 1, "headline": "...", "bio": "...", "skills": ["..."], "industry": "..."}]

Template B system prompt, verbatim:

    Task: produce member profiles for an alumni mentorship website used by graduates in Kenya and neighbouring
    countries. Each numbered card below describes one made-up member. Write that member's profile in their own voice.
    
    What to return for each card: a JSON object with "n", "headline" (90 characters or fewer), "bio", "skills"
    (array of short strings) and "industry" (brief sector name). Return one JSON array holding all objects, in card
    order, and nothing else.
    
    Constraints:
    1. No names of people. No names of real organisations of any kind; refer to employers generically.
    2. Mentor cards list what the member "Can help with". All of it, and only it, should come through in the profile,
       phrased freshly. Mentee cards list what the member "Is looking for"; it should come through, phrased freshly.
       Do not lift phrases from those two lines; reword them every time.
    3. "Voice" sets tone and length. Each profile should sound like a different person.
    4. Mode "normal": no special limits.
    5. Mode "roundabout": none of the words under "Do not say" (or near variants) may appear. Convey the job by
       describing the daily work, and write skills as plain descriptions instead of software names.
    6. Mode "bare": a nearly empty profile. Headline six words at most, bio blank or under twelve words, two skills at
       most, industry optional.
    7. If the place is "not stated", leave location out. British spelling. Plain sentences only: no lists, emoji or hashtags. Never refer to cards, modes or constraints.

Each brief lists the occupation title, two of its O*NET tasks, seniority or stage, sector and city, the
sampled skills, the offered support or goal in plain words (`prompts.SUPPORT_WORDING`), the case and the
style. For the vocabulary-mismatch case it also lists the title words to avoid.

## Filtering counts

| Step | Count |
| --- | --- |
| Specifications generated | 3,600 |
| Profiles written in the first round | 3,600 |
| Rejected by the gate after round one and rewritten | 72 (2.0%): 70 too short for a non-sparse profile, 1 sparse profile that was too long, 1 that named a real organisation |
| Mentees re-targeted and rewritten after a structural check failed | 75 (2.1%), see below |
| Further rewrites of those 75 that were too short | 6, then 4, then 0 |
| Dropped | 0 |
| Accepted | 3,600 |

Gate checks: field types and lengths; sparse profiles really are sparse; no occupation code, person
identifier, grade wording or specification field name in the text; no email address, web address or phone
number; none of about 90 named East African and international employers and universities; no title word
in a vocabulary-mismatch profile; no exact duplicate and no near-duplicate bio (token-set Jaccard 0.8 or
more). No duplicate was found.

**The structural check that failed.** The first full generation let 75 "orphan" Mentees in the training and
validation splits aim for occupations inside clusters that are held out as unseen for validation or test.
That would have put those clusters' vocabulary into earlier splits. The gate refused to write the dataset.
Those 75 Mentees were given a new orphan target from 20 occupations whose clusters no split holds out, each
re-drawn with its own random stream so that the other 3,525 specifications stayed byte-identical (verified),
and their text was rewritten. The first-generation specifications are kept beside the dataset.

## Splits and independent groups

| Split | Mentors | Mentees | Judged pairs | Grade 0 | Grade 1 | Grade 2 | Grade 3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Train | 1,700 | 850 | 39,416 | 17,000 (43.1%) | 7,906 (20.1%) | 8,639 (21.9%) | 5,871 (14.9%) |
| Validation | 300 | 150 | 45,000 | 39,659 (88.1%) | 4,276 (9.5%) | 836 (1.9%) | 229 (0.5%) |
| Test | 400 | 200 | 80,000 | 70,229 (87.8%) | 7,767 (9.7%) | 1,606 (2.0%) | 398 (0.5%) |

- **People** are disjoint: no person appears in two splits.
- **Occupation clusters** (SOC minor groups) held out for the unseen-occupation subset never appear in an
  earlier split in any role, including as an earlier or current occupation.
  Test only: `11-1` (Chief Sustainability Officers, General and Operations Managers); `13-2` (Accountants and Auditors, Appraisers and Assessors of Real Estate, Credit Analysts, Personal Financial Advisors, Insurance Underwriters, Tax Preparers, Financial Quantitative Analysts, Fraud Examiners, Investigators and Analysts); `15-1` (Computer Systems Analysts, Computer Network Architects, Telecommunications Engineering Specialists, Database Administrators, Network and Computer Systems Administrators, Software Quality Assurance Analysts and Testers, Geographic Information Systems Technologists and Technicians, Document Management Specialists, Information Security Engineers, Information Technology Project Managers); `15-2` (Operations Research Analysts, Statisticians, Biostatisticians); `17-1` (Architects, Except Landscape and Naval, Landscape Architects, Cartographers and Photogrammetrists, Geodetic Surveyors); `19-3` (Historians); `19-4` (Remote Sensing Technicians); `21-2` (Clergy); `23-1` (Judicial Law Clerks); `25-1` (Agricultural Sciences Teachers, Postsecondary, Biological Science Teachers, Postsecondary, Chemistry Teachers, Postsecondary, Environmental Science Teachers, Postsecondary, Recreation and Fitness Studies Teachers, Postsecondary); `25-3` (Tutors); `27-1` (Fashion Designers, Merchandise Displayers and Window Trimmers); `27-3` (Broadcast Announcers and Radio Disc Jockeys, Technical Writers); `29-2` (Cytotechnologists, Pharmacy Technicians); `41-3` (Insurance Sales Agents); `49-9` (Industrial Machinery Mechanics, Maintenance Workers, Machinery).
  Validation only: `11-2` (Marketing Managers, Fundraising Managers); `19-1` (Animal Scientists, Geneticists, Epidemiologists); `19-2` (Materials Scientists, Industrial Ecologists); `21-1` (Rehabilitation Counselors, Health Education Specialists); `25-2` (Career/Technical Education Teachers, Middle School, Special Education Teachers, Middle School); `27-2` (Producers and Directors, Choreographers, Musicians and Singers); `27-4` (Broadcast Technicians); `29-1` (Advanced Practice Psychiatric Nurses, Critical Care Nurses, Family Medicine Physicians, Obstetricians and Gynecologists, Physicians, Pathologists, Dental Hygienists, Naturopathic Physicians); `43-4` (New Accounts Clerks); `51-4` (Model Makers, Metal and Plastic); `51-7` (Patternmakers, Wood).
- **Styles and prompt template** for test are disjoint from training and validation, as above.
- **Training pairs** are a sample per training Mentee: up to 12 of grade 3, 12 of grade 2, 10 of grade 1,
  12 hard negatives (grade 0 with a nearby field, the right kind of help or a shared skill) and 8 random
  negatives (grade3 5,871, grade2 8,639, grade1 7,906, hard 10,200, random 6,800). Pairs outside this file are unjudged for
  training purposes and are never used as negatives.
- **Complete training grades.** `train_grades.json` holds the rule's grade for every training Mentee against
  every training Mentor (850 by 1,700). The trainer uses it to look up the true grade of any Mentor that
  shares a batch with a Mentee, so batches can supply many more negatives than the sampled pair file
  without ever guessing a label. It agrees with the pair file wherever both have a pair (checked on load).
- **Validation and test pools are complete**: every Mentee is graded against every Mentor of its split.
- Validation Mentee tags: career changer 30, no suitable mentor 23, seen occupation 100, sparse 23, unseen occupation 41, vocabulary mismatch 29.
- Test Mentee tags: career changer 40, no suitable mentor 20, seen occupation 124, sparse 41, unseen occupation 72, vocabulary mismatch 38. Tags can overlap. `no suitable mentor` means the best
  grade in the pool is 0 or 1.
- Mentor occupations present: train 99, validation 105, test 123.

File hashes are in `ml/data/synth-v3/manifest.json` (manifest SHA-256 prefix `355ff8977a29`).

## Machine audit of label quality (not human review)

An independent Claude Sonnet judge graded 300 pairs from the written text and the rubric alone: 25 random
pairs for each split and generated grade. The sample is balanced by grade on purpose (a plain random
sample would be about 88% grade 0), so these figures describe agreement per grade level, not agreement on
a typical pair.

| Measure | Value |
| --- | ---: |
| Exact agreement | 51.3% |
| Within one grade | 91.3% |
| Same side of "relevant" (grade 2 or 3 against 0 or 1) | 76.0% |
| Quadratic weighted kappa | 0.668 |

| | Judge 0 | Judge 1 | Judge 2 | Judge 3 |
| --- | ---: | ---: | ---: | ---: |
| Generated 0 | 44 | 27 | 4 | 0 |
| Generated 1 | 13 | 44 | 14 | 4 |
| Generated 2 | 8 | 32 | 29 | 6 |
| Generated 3 | 0 | 10 | 28 | 37 |

By split, weighted kappa is 0.636 (train), 0.678 (validation) and 0.690 (test).

Reading: agreement is moderate. The judge is usually within one grade but is stricter than the rule: it
marked many generated grade 3 pairs as 2 and many grade 2 pairs as 1. That is expected when a grade
comes from a hidden specification (the Mentor "is" a logistician offering career-entry help) and the judge
sees only what the written profile managed to say, and it means the labels carry noise that no text model
can remove. A different machine agreeing or disagreeing with the rule is not evidence about human
judgement. This was not used to change any label.

## Known gaps and risks

| Risk | What was done | What remains |
| --- | --- | --- |
| Inherited errors: the rule, O*NET's United States view of occupations and the writer's habits are all baked in | Rule documented and unit-tested; machine audit run; O*NET version and licence recorded | Human review of the blind sheet (#115); East African job titles and career paths are not modelled |
| Limited diversity: one writer model, 26 styles, 7 kinds of goal | Three difficulty cases, career changers, two prompt templates, disjoint styles | Real profiles are messier, multilingual and less complete |
| Easier than reality: the writer was told what each person offers or wants, and usually says it | Sparse and vocabulary-mismatch cases; hard negatives; a no-suitable-Mentor subset | Real goals are often unstated or mixed |
| Contamination between splits | People, held-out clusters, styles and the test prompt template are disjoint and checked by the gate, which caught and blocked one real leak | The same writer model and the same seen occupations appear in every split, so in-domain results favour a model trained here |
| Missing cases | | Non-English text, several goals per Mentee, Mentors who decline requests, availability, location preference, protected characteristics (none are generated or used) |

A synthetic-only test cannot establish performance on real alumni. The missing independent checks are the
human review sheet (`ml/data/synth-v3/human_review_sheet.csv`, 40 test Mentees with 8 candidates each,
issue #115) and evaluation with real users (#5).

## Reproduce

```bash
python -I ml/synth/parse_onet.py ml/data/onet/download/db_30_2_text ml/data/onet/taxonomy.json
python -c "import json,sys; sys.path.insert(0,'ml/synth'); from specs import generate; \
  t=json.load(open('ml/data/onet/taxonomy.json'))['occupations']; sel,specs=generate(t); \
  open('ml/data/synth-v3/specs.jsonl','w').write(''.join(json.dumps(s,ensure_ascii=False)+'\n' for s in specs)); \
  json.dump(sel,open('ml/data/synth-v3/selection.json','w'),indent=1)"
python ml/synth/write_profiles.py ml/data/onet/taxonomy.json ml/data/synth-v3   # calls Claude Haiku
python ml/synth/gate.py ml/data/onet/taxonomy.json ml/data/synth-v3 --final
python ml/synth/splits.py ml/data/onet/taxonomy.json ml/data/synth-v3 --backup ml/artifacts
python ml/synth/audit.py ml/data/synth-v3                                      # calls Claude Sonnet
```

Specifications, grades, splits and pair sampling are deterministic for the seed. Profile wording is not:
a rerun of the writer gives different text, so the private dataset and its backup are the record.
