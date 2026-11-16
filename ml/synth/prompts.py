"""Prompts and briefs used to turn hidden specifications into profile wording.

Everything the writing model sees is produced here, so the data card can quote it exactly.
Two prompt templates exist. Template A writes training and validation profiles; template B,
with different instructions, layout and phrasing of goals, writes test profiles only. Style
instructions are also disjoint by split (see specs.STYLES).

The writer never sees a grade, a person identifier, an occupation code or the other side of a
pair, so it cannot leak a label into the text.
"""
import random
import re

GENERIC_TITLE_WORDS = {
    "and", "all", "other", "except", "the", "of", "or", "in", "for", "general", "first", "line", "workers", "worker",
    "specialists", "specialist", "managers", "manager", "engineers", "engineer", "technicians", "technician",
    "technologists", "analysts", "analyst", "operators", "officers", "supervisors", "assistants", "teachers",
    "postsecondary", "systems", "services", "service", "operations", "science", "sciences", "related", "including",
}

SUPPORT_WORDING = {
    "A": {
        "career_entry": "getting a first role in this field (applications, interviews, internships)",
        "technical_growth": "building practical and technical depth in the work itself",
        "certification": "professional licences, exams and accreditation in this field",
        "career_change": "moving into this field from a different line of work",
        "leadership": "stepping up into team-lead or management responsibility",
        "postgraduate": "postgraduate study, research and scholarships",
        "entrepreneurship": "starting a business or consultancy",
    },
    "B": {
        "career_entry": "breaking in: landing the first job or placement",
        "technical_growth": "getting better at the hands-on craft of the job",
        "certification": "qualifying: the licence, the exam, the professional body",
        "career_change": "switching careers into this area",
        "leadership": "leading people for the first time",
        "postgraduate": "going back to university for a master's or doctorate",
        "entrepreneurship": "setting up on one's own",
    },
}

SYSTEM = {
    "A": """You write short, realistic profiles for a fictional university alumni mentoring platform in East Africa.
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
[{"n": 1, "headline": "...", "bio": "...", "skills": ["..."], "industry": "..."}]""",
    "B": """Task: produce member profiles for an alumni mentorship website used by graduates in Kenya and neighbouring
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
7. If the place is "not stated", leave location out. British spelling. Plain sentences only: no lists, emoji or hashtags. Never refer to cards, modes or constraints.""",
}

CASE_NAMES = {"A": {"standard": "standard", "mismatch": "indirect", "sparse": "sparse"},
              "B": {"standard": "normal", "mismatch": "roundabout", "sparse": "bare"}}


def template_for(split):
    return "B" if split == "test" else "A"


def avoid_words(title):
    """Distinctive words of an occupation title, lower-cased and without a plural 's'."""
    words = [word.lower() for word in re.findall(r"[A-Za-z]+", title)]
    kept = []
    for word in words:
        if len(word) < 4 or word in GENERIC_TITLE_WORDS:
            continue
        stem = word[:-1] if word.endswith("s") and not word.endswith("ss") else word
        if stem not in kept:
            kept.append(stem)
    return kept


def brief(spec, taxonomy, number):
    """Plain-text brief for one specification. Deterministic for a given specification."""
    rng = random.Random(spec["person_id"])
    template = template_for(spec["split"])
    wording = SUPPORT_WORDING[template]
    code = spec["occupation"] if spec["role"] == "mentor" else spec["target"]
    occupation = taxonomy[code]
    tasks = rng.sample(occupation["tasks"], 2)
    case = CASE_NAMES[template][spec["case"]]
    lines = []
    if spec["role"] == "mentor":
        if template == "A":
            lines += [f"Brief {number}: MENTOR", f"Works as: {occupation['title']}",
                      f"The work involves: {tasks[0]} {tasks[1]}"]
            if spec["past_occupation"]:
                lines.append(f"Earlier career, before changing field: {taxonomy[spec['past_occupation']]['title']}")
            lines += [f"Seniority: {spec['level']}, {spec['years']} years of experience",
                      f"Sector: {spec['sector'] or 'choose one that fits the job'}. Based in: {spec['city']}",
                      f"Skills to draw on: {'; '.join(spec['skills'])}",
                      f"Offers: {'; '.join(wording[kind] for kind in spec['supports'])}"]
        else:
            lines += [f"Card {number} (mentor)", f"Job: {occupation['title']}; {spec['years']} years in, now {spec['level']}",
                      f"Typical duties: {tasks[0]} {tasks[1]}"]
            if spec["past_occupation"]:
                lines.append(f"Started out as: {taxonomy[spec['past_occupation']]['title']}, then switched")
            lines += [f"Where: {spec['sector'] or 'a sector that fits the job'}, {spec['city']}", f"Knows: {'; '.join(spec['skills'])}",
                      f"Can help with: {'; '.join(wording[kind] for kind in spec['supports'])}"]
    else:
        if template == "A":
            lines += [f"Brief {number}: MENTEE", f"Stage: {spec['stage']}", f"Aiming for work as: {occupation['title']}",
                      f"That work involves: {tasks[0]} {tasks[1]}"]
            if spec["origin"]:
                lines.append(f"Currently works as: {taxonomy[spec['origin']]['title']} and wants to change field")
            lines += [f"Sector now: {spec['sector'] or 'choose one that fits'}. Based in: {spec['city']}",
                      f"Skills they already have: {'; '.join(spec['have_skills']) or 'none listed'}",
                      f"Wants to build: {'; '.join(spec['want_skills'])}", f"Goal: {wording[spec['goal']]}"]
        else:
            lines += [f"Card {number} (mentee)", f"Where they are: {spec['stage']}",
                      f"Wants to become: {occupation['title']}", f"Which means doing things like: {tasks[0]} {tasks[1]}"]
            if spec["origin"]:
                lines.append(f"Present job, which they want to leave: {taxonomy[spec['origin']]['title']}")
            lines += [f"Where: {spec['sector'] or 'a sector that fits the job'}, {spec['city']}",
                      f"Already knows: {'; '.join(spec['have_skills']) or 'nothing listed'}",
                      f"Hopes to learn: {'; '.join(spec['want_skills'])}",
                      f"Is looking for: {wording[spec['goal']]}"]
    lines.append(f"{'Case' if template == 'A' else 'Mode'}: {case}")
    if spec["case"] == "mismatch":
        lines.append(f"{'Avoid' if template == 'A' else 'Do not say'}: {', '.join(avoid_words(occupation['title']))}")
    lines.append(f"{'Style' if template == 'A' else 'Voice'}: {spec['style']}")
    return "\n".join(lines)


def batch_prompt(specs, taxonomy):
    return "\n\n".join(brief(spec, taxonomy, number) for number, spec in enumerate(specs, 1))
