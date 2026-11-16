"""Deterministic relevance grades (0 to 3) for a Mentee and Mentor pair.

The grade is a pure function of the two hidden specifications and the occupation taxonomy. It
never reads the written profile text and never calls a model. Rubric (docs/ml-next-steps.md):

    3  clear primary-goal and offered-support alignment
    2  primary-goal support with a significant context or coverage limitation
    1  tangential or secondary help, or insufficient evidence for the main need
    0  unsuitable pairing or no supported meaningful alignment

Inputs used:

    proximity  how close the Mentor's occupation is to the occupation the Mentee is aiming for
               3 same occupation; 2 linked in the taxonomy (primary related occupation, or the
               same six-digit occupation group); 1 same occupation cluster; 0 otherwise.
               A Mentor's previous occupation counts one level lower than a current one.
    support    whether the Mentee's goal is one of the kinds of help the Mentor offers
    skills     how many of the skills the Mentee wants to build the Mentor lists

Goals that depend on the field (entering it, growing technically, certification, changing into
it) need the right occupation first. General goals (leadership, postgraduate study, starting a
business) need the offered support first and the field second.

Worked examples (see test_synth_grades.py for the same cases as tests):

    Mentee wants a first job as a logistician; Mentor is a logistician offering career entry -> 3
    Same Mentee; Mentor is a supply chain manager (linked) offering career entry             -> 2
    Same Mentee; Mentor is a logistician who only offers leadership coaching                 -> 1
    Same Mentee; Mentor is a civil engineer offering career entry                            -> 0
    Mentee wants to step into management; Mentor in the same field offers leadership help    -> 3
    Same Mentee; Mentor in an unrelated field offers leadership help                         -> 1
"""

DOMAIN_GOALS = ("career_entry", "technical_growth", "certification", "career_change")
GENERAL_GOALS = ("leadership", "postgraduate", "entrepreneurship")
GOALS = DOMAIN_GOALS + GENERAL_GOALS


def cluster(code):
    """Occupation cluster: the SOC minor group, for example '17-2' (engineers)."""
    return code[:4]


def family(code):
    return code[:2]


def proximity(a, b, related):
    if a == b:
        return 3
    if a[:7] == b[:7] or b in related.get(a, ()) or a in related.get(b, ()):
        return 2
    return 1 if cluster(a) == cluster(b) else 0


def mentor_proximity(target, mentor, related):
    near = proximity(target, mentor["occupation"], related)
    if mentor.get("past_occupation"):
        near = max(near, proximity(target, mentor["past_occupation"], related) - 1)
    return near


def grade(mentee, mentor, related):
    """Relevance of `mentor` for `mentee`. `related` maps occupation code to linked codes."""
    goal = mentee["goal"]
    if goal not in GOALS:
        raise ValueError(f"unknown goal {goal!r}")
    target = mentee["target"]
    near = mentor_proximity(target, mentor, related)
    offered = goal in mentor["supports"]
    shared = len(set(mentee["want_skills"]) & set(mentor["skills"]))
    if goal in GENERAL_GOALS:
        if offered:
            if near >= 2:
                return 3
            return 2 if family(target) == family(mentor["occupation"]) else 1
        return 1 if near >= 2 else 0
    if near == 3:
        if offered:
            return 3
        return 2 if shared >= 2 else 1
    if near == 2:
        if not offered:
            return 1
        # A Mentor who made the same move the Mentee is planning is a full match.
        same_route = (goal == "career_change" and mentee.get("origin") and mentor.get("past_occupation")
                      and proximity(mentee["origin"], mentor["past_occupation"], related) >= 2)
        return 3 if same_route else 2
    if near == 1:
        return 1 if offered else 0
    return 1 if offered and shared >= 2 else 0
