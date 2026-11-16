"""Seeded sampler for hidden Mentor and Mentee specifications (no text is written here).

A specification says who a fictional person is: occupation, seniority, skills, the support a
Mentor offers or the goal a Mentee has, and which writing style and difficulty case applies.
Profile wording is written from these specifications in a later step; grades come from
`grades.grade` and depend on the specifications only.

Weighting follows the requirements record (docs/scratch-model-requirements.md): East African
alumni in aviation, engineering, logistics and management, with other graduate fields present
at lower weight.
"""
import random
from collections import Counter, defaultdict

from grades import DOMAIN_GOALS, GENERAL_GOALS, cluster, family

SIZES = {  # people per split; "floor" is the fallback if usage limits bite
    "target": {"train": (1700, 850), "validation": (300, 150), "test": (400, 200)},
    "floor": {"train": (840, 420), "validation": (150, 75), "test": (210, 105)},
    "fixture": {"train": (60, 30), "validation": (20, 10), "test": (24, 12)},  # unit tests only
}
UNSEEN_SHARE = {"validation": 0.22, "test": 0.27}  # share of a held-out pool from unseen clusters
ORPHAN_SHARE = 0.08  # Mentees aiming for an occupation that has no Mentor in any pool

AVIATION = ("53-2011.00", "53-2012.00", "53-2021.00", "53-2022.00", "53-2031.00", "49-3011.00", "49-2091.00",
            "17-2011.00", "17-3021.00", "53-6051.01", "43-5011.00")
LOGISTICS = ("13-1081.00", "13-1081.01", "13-1081.02", "11-3071.00", "11-3071.04", "11-3061.00", "13-1023.00",
             "43-5061.00", "43-5071.00", "11-9199.08")
# Relative weight of one occupation in each family (two-digit SOC group).
FAMILY_WEIGHT = {"11": 2.0, "17": 2.0, "15": 1.5, "13": 1.2, "19": 0.4, "27": 0.4, "41": 0.4, "29": 0.3,
                 "25": 0.3, "23": 0.3, "21": 0.3, "43": 0.3, "49": 0.4, "51": 0.3, "53": 0.4}
FORCED_WEIGHT = {"aviation": 6.0, "logistics": 3.5}
OTHER_OCCUPATIONS = 150  # sampled besides the forced aviation and logistics lists
ORPHAN_OCCUPATIONS = 30
ORPHAN_FAMILIES = ("19", "21", "23", "25", "27", "29")

SECTORS = {
    "aviation": ("commercial airline", "aircraft maintenance and engineering", "airport operations",
                 "air cargo", "civil aviation regulation", "regional charter and safari flights"),
    "logistics": ("freight forwarding", "port and customs clearing", "third-party logistics",
                  "fast-moving consumer goods distribution", "humanitarian supply chain", "e-commerce delivery"),
    "13": ("banking", "audit and advisory", "insurance", "microfinance", "development finance", "consulting"),
    "15": ("financial technology", "telecommunications", "software services", "mobile money", "e-commerce",
           "health technology"),
    "17": ("construction and infrastructure", "energy and power", "manufacturing", "water and sanitation",
           "roads and transport infrastructure", "geothermal and renewables", "mining"),
}
CITIES = (("Nairobi", 35), ("Mombasa", 8), ("Kisumu", 4), ("Eldoret", 3), ("Kampala", 7), ("Entebbe", 3),
          ("Dar es Salaam", 7), ("Arusha", 3), ("Kigali", 6), ("Addis Ababa", 6), ("Juba", 1), ("Dubai", 4),
          ("Doha", 2), ("London", 3), ("Johannesburg", 3), ("Toronto", 1), ("not stated", 4))
LEVELS = (("senior specialist", 8, 14), ("team lead", 9, 16), ("manager", 10, 20), ("head of department", 14, 26),
          ("director or executive", 18, 32), ("independent consultant", 12, 30))
MANAGER_LEVELS = ("team lead", "manager", "head of department", "director or executive")
STAGES = ("final-year student", "recent graduate", "early career (1 to 3 years)", "mid career (5 to 9 years)")
MENTEE_CASES = (("standard", 0.65), ("mismatch", 0.20), ("sparse", 0.15))
MENTOR_CASES = (("standard", 0.75), ("mismatch", 0.15), ("sparse", 0.10))
CHANGER_SHARE = {"mentor": 0.15, "mentee": 0.20}

# Writing styles. Test styles are never used for training or validation profiles.
STYLES = {
    "train": (
        "plain and factual, two or three short sentences",
        "warm and conversational, first person, about 60 words",
        "formal curriculum-vitae tone, third person avoided, about 50 words",
        "confident and direct, short punchy sentences",
        "reflective, mentions one concrete project or situation, about 80 words",
        "very brief, one sentence only",
        "detailed, 90 to 120 words, covers background then current focus",
        "informal, lower-case leaning, like a quick note typed on a phone",
        "structured as two short paragraphs: where I am, what I am after or offer",
        "understated and modest, avoids buzzwords",
        "enthusiastic, uses one rhetorical question",
        "technical, names specific methods or equipment, about 70 words",
        "narrative, tells the path in order of time, about 80 words",
        "list-like bio with semicolons between items",
    ),
    "validation": (
        "businesslike, starts with years of experience or stage of study, about 60 words",
        "friendly and humble, mentions a challenge faced, about 70 words",
        "crisp bullet-free summary in exactly two sentences",
        "storytelling tone that opens with a moment at work or in class",
        "practical and outcome-focused, about 50 words",
    ),
    "test": (
        "dry and precise, no adjectives where a noun will do, about 55 words",
        "chatty with a light touch of humour, about 75 words",
        "starts with a question the writer is trying to answer, then context, about 70 words",
        "telegraphic: fragments without 'I', as in a note to self",
        "earnest and slightly formal East African professional English, about 80 words",
        "focused on people and teams rather than tools, about 65 words",
        "compact, one long sentence joined with commas and 'and'",
    ),
}


def choose(rng, weighted):
    names, weights = zip(*weighted)
    return rng.choices(names, weights=weights, k=1)[0]


def select_occupations(taxonomy, seed, other_occupations=OTHER_OCCUPATIONS):
    """Pick the occupations used, their sampling weights, held-out clusters and orphan targets."""
    rng = random.Random(seed)
    usable = {code for code, item in taxonomy.items() if item["job_zone"] >= 3 or code in AVIATION + LOGISTICS}
    missing = [code for code in AVIATION + LOGISTICS if code not in usable]
    if missing:
        raise ValueError(f"taxonomy lacks required occupations: {missing}")
    weights = {code: FORCED_WEIGHT["aviation"] for code in AVIATION}
    weights.update({code: FORCED_WEIGHT["logistics"] for code in LOGISTICS})
    others = sorted(code for code in usable if code not in weights and family(code) in FAMILY_WEIGHT)
    picks = set()
    while len(picks) < min(other_occupations, len(others)):
        picks.add(rng.choices(others, weights=[FAMILY_WEIGHT[family(code)] for code in others], k=1)[0])
    weights.update({code: FAMILY_WEIGHT[family(code)] for code in sorted(picks)})
    core = {cluster(code) for code in AVIATION + LOGISTICS}
    mass = Counter()
    for code, weight in weights.items():
        mass[cluster(code)] += weight
    total = sum(mass.values())
    free = sorted(name for name in mass if name not in core)
    rng.shuffle(free)
    held = {"test": [], "validation": []}
    for split, share, reserve in (("test", 0.14, 1), ("validation", 0.09, 0)):
        # `reserve` keeps at least one free cluster for validation when the taxonomy is tiny.
        while len(free) > reserve and sum(mass[name] for name in held[split]) < share * total:
            held[split].append(free.pop())
    # Orphans have no taxonomy link to any occupation a Mentor can hold, so the best possible
    # Mentor for them is a tangential one (grade 1 at most for field-specific goals).
    linked = {other for code in weights for other in taxonomy[code]["related"]}
    orphan_pool = sorted(code for code in usable if code not in weights and code not in linked
                         and family(code) in ORPHAN_FAMILIES
                         and not {other[:7] for other in weights} & {code[:7]}
                         and not set(taxonomy[code]["related"]) & set(weights))
    orphans = sorted(rng.sample(orphan_pool, min(ORPHAN_OCCUPATIONS, len(orphan_pool))))
    # Orphans whose cluster is not held out for any split. See `retarget_orphans`.
    hidden = {name for names in held.values() for name in names}
    # Any family qualifies here (a chef or a fitness instructor is a fair "nobody in this network
    # does that" target), as long as the occupation has no taxonomy link to a Mentor occupation.
    clean_pool = sorted(code for code, item in taxonomy.items()
                        if item["job_zone"] >= 3 and code not in weights and code not in linked
                        and cluster(code) not in hidden and not {other[:7] for other in weights} & {code[:7]}
                        and not set(item["related"]) & set(weights))
    clean = sorted(random.Random(seed + 2).sample(clean_pool, min(20, len(clean_pool))))
    return {"weights": dict(sorted(weights.items())), "held_out": {k: sorted(v) for k, v in held.items()},
            "orphans": orphans, "clean_orphans": clean}


def retarget_orphans(specs, selection, taxonomy, seed):
    """Move orphan-target Mentees out of clusters that are held out for a later split.

    The first full generation let a training or validation Mentee aim for an orphan occupation
    inside a cluster reserved as unseen for validation or test, which would have put that
    cluster's vocabulary into earlier splits (the validation gate caught it). Those Mentees get
    a new orphan target from clusters no split holds out. Each is re-drawn with its own random
    stream so that every other specification stays exactly as first generated.
    """
    held = selection["held_out"]
    forbidden = {"train": set(held["test"]) | set(held["validation"]), "validation": set(held["test"]), "test": set()}
    moved = []
    for spec in specs:
        if spec["role"] != "mentee" or not spec["orphan_target"] or cluster(spec["target"]) not in forbidden[spec["split"]]:
            continue
        if not selection["clean_orphans"]:
            raise ValueError("no clean orphan occupation is available")
        rng = random.Random(f"{seed}:{spec['person_id']}")
        target = rng.choice(selection["clean_orphans"])
        spec.update({"target": target, "want_skills": sample_skills(rng, taxonomy, target, 2, 4),
                     "have_skills": sample_skills(rng, taxonomy, target, 1, 4) if spec["have_skills"] else [],
                     "sector": sector_for(rng, target)})
        moved.append(spec["person_id"])
    return moved


def sector_for(rng, code):
    if code in AVIATION:
        return rng.choice(SECTORS["aviation"])
    if code in LOGISTICS:
        return rng.choice(SECTORS["logistics"])
    # Only broad families get a sampled sector; elsewhere the job itself implies the sector
    # (a lodging manager works in hospitality), so the writer is asked to pick a fitting one.
    return rng.choice(SECTORS[family(code)]) if family(code) in ("13", "15", "17") else None


def skill_pool(taxonomy, code):
    item = taxonomy[code]
    return item["tools"][:14] + item["knowledge"][:5]


def sample_skills(rng, taxonomy, code, low, high):
    item = taxonomy[code]
    count = rng.randint(low, high)
    tools = rng.sample(item["tools"][:14], min(len(item["tools"][:14]), max(1, count - rng.randint(1, 2))))
    knowledge = rng.sample(item["knowledge"][:5], min(5, max(0, count - len(tools))))
    return sorted(tools + knowledge)


def mentor_spec(rng, taxonomy, code, style, linked_from):
    level, low, high = rng.choice(LEVELS)
    case = choose(rng, MENTOR_CASES)
    past = None
    if rng.random() < CHANGER_SHARE["mentor"]:
        options = sorted(c for c in linked_from if c != code and cluster(c) != cluster(code))
        past = rng.choice(options) if options else None
    kinds = list(DOMAIN_GOALS[:3]) + ["postgraduate", "entrepreneurship"]
    weights = [3, 4, 2, 1.2, 1.2]
    if level in MANAGER_LEVELS or family(code) == "11":
        kinds.append("leadership")
        weights.append(3.5)
    if past:
        kinds.append("career_change")
        weights.append(6)
    elif rng.random() < 0.35:
        kinds.append("career_change")
        weights.append(2)
    supports = set()
    for _ in range(rng.choice((1, 2, 2, 3))):
        supports.add(rng.choices(kinds, weights=weights, k=1)[0])
    return {"role": "mentor", "occupation": code, "past_occupation": past, "level": level,
            "years": rng.randint(low, high), "supports": sorted(supports),
            "skills": sample_skills(rng, taxonomy, code, 3, 6), "sector": sector_for(rng, code),
            "city": choose(rng, CITIES), "case": case, "style": style}


def mentee_spec(rng, taxonomy, target, style, origins, orphan):
    case = choose(rng, MENTEE_CASES)
    origin = None
    if not orphan and rng.random() < CHANGER_SHARE["mentee"]:
        options = sorted(c for c in origins if c != target and cluster(c) != cluster(target))
        origin = rng.choice(options) if options else None
    if origin:
        goal, stage = "career_change", rng.choice(STAGES[2:])
    else:
        stage = rng.choice(STAGES)
        kinds = [("career_entry", 4 if stage in STAGES[:2] else 1), ("technical_growth", 3),
                 ("certification", 1.5), ("postgraduate", 1.2), ("entrepreneurship", 0.9),
                 ("leadership", 2.5 if stage in STAGES[2:] else 0.2)]
        if orphan:
            kinds = [kind for kind in kinds if kind[0] in DOMAIN_GOALS]
        goal = choose(rng, kinds)
    want = sample_skills(rng, taxonomy, target, 2, 4)
    source = origin or target
    have = sample_skills(rng, taxonomy, source, 1, 4) if stage != STAGES[0] or rng.random() < 0.5 else []
    return {"role": "mentee", "target": target, "origin": origin, "stage": stage, "goal": goal,
            "want_skills": want, "have_skills": have, "sector": sector_for(rng, source),
            "city": choose(rng, CITIES), "case": case, "style": style, "orphan_target": orphan}


def generate(taxonomy, seed=20261117, size="target", other_occupations=OTHER_OCCUPATIONS):
    """Return (selection, specs). `specs` is a list of dicts with person_id and split added."""
    selection = select_occupations(taxonomy, seed, other_occupations)
    rng = random.Random(seed + 1)
    weights, held = selection["weights"], selection["held_out"]
    hidden = {name for names in held.values() for name in names}
    seen_codes = sorted(code for code in weights if cluster(code) not in hidden)
    unseen_codes = {split: sorted(code for code in weights if cluster(code) in held[split]) for split in held}

    def draw(codes, count):
        return rng.choices(codes, weights=[weights[code] for code in codes], k=count)

    specs, counters = [], defaultdict(int)

    def add(spec, split):
        key = ("MTR" if spec["role"] == "mentor" else "MTE", {"train": "TRN", "validation": "VAL", "test": "TST"}[split])
        counters[key] += 1
        specs.append({"person_id": f"{key[0]}-{key[1]}-{counters[key]:04d}", "split": split, **spec})

    train_mentor_codes = None
    for split in ("train", "validation", "test"):
        mentors, mentees = SIZES[size][split]
        styles = STYLES[split]
        if split == "train":
            mentor_codes = draw(seen_codes, mentors)
            train_mentor_codes = sorted(set(mentor_codes))
            known = train_mentor_codes
        else:
            unseen = round(mentors * UNSEEN_SHARE[split])
            mentor_codes = draw(known, mentors - unseen) + draw(unseen_codes[split], unseen)
        # Earlier occupations come from clusters this split may see, so a held-out cluster
        # never appears in another split's text.
        allowed = seen_codes if split == "train" else sorted(seen_codes + unseen_codes[split])
        for code in mentor_codes:
            linked = [c for c in allowed if c in taxonomy[code]["related"] or code in taxonomy[c]["related"]] or allowed
            add(mentor_spec(rng, taxonomy, code, rng.choice(styles), linked if rng.random() < 0.7 else allowed), split)
        orphans = round(mentees * ORPHAN_SHARE) if selection["orphans"] else 0
        unseen = 0 if split == "train" else round(mentees * (UNSEEN_SHARE[split] + 0.03))
        targets = [(code, False) for code in draw(known, mentees - orphans - unseen)]
        if unseen:
            targets += [(code, False) for code in draw(unseen_codes[split], unseen)]
        targets += [(rng.choice(selection["orphans"]), True) for _ in range(orphans)]
        rng.shuffle(targets)
        for code, orphan in targets:
            add(mentee_spec(rng, taxonomy, code, rng.choice(styles), allowed, orphan), split)
    selection["train_occupations"] = train_mentor_codes
    selection["retargeted_orphans"] = retarget_orphans(specs, selection, taxonomy, seed)
    return selection, specs
