"""Pairwise features for the GBDT ranker pilot (#98). Training/validation only.

Every feature is derived from the four whitelisted profile fields. Pair records
are read only for `mentee_id` and `mentor_id`, which locate the two profiles and
never become feature values.
"""
import json
from pathlib import Path
import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from train_scratch_pilot import INPUT_FIELDS, text

FEATURE_NAMES = (
    'tfidf_cosine',
    'skill_jaccard',
    'skill_overlap_count',
    'industry_match',
    'mentee_skill_mention_share',
)


def load_jsonl(path):
    """Read a JSON Lines file, refusing anything that could be a test split file."""
    path = Path(path)
    for name in {path.name, path.resolve().name}:
        if 'test_' in name.casefold():
            raise ValueError('Refusing to open a test split file: ' + name)
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def whitelisted(profile):
    """Copy only the permitted input fields, so nothing else can reach a feature."""
    return {field: profile[field] for field in INPUT_FIELDS}


def normalise(value):
    return ' '.join(str(value or '').casefold().split())


def skill_set(profile):
    return {skill for skill in map(normalise, profile['skills'] or []) if skill}


def mentions(skill, haystack):
    """Whole-term match: 'R' must not match inside a word, 'R&D' or 'C' inside 'C++'.

    Symbols that occur inside skill names count as part of a term, while a full
    stop only does so when a word character follows it (as in 'Node.js'). A slash
    separates terms ('Terraform/AWS') unless a single letter precedes it ('A/B').
    Known limits: hyphenated compounds and plurals are not matched, so 'founder'
    is not found in 'co-founder' or 'founders'.
    """
    pattern = r'(?<![\w+#&.-])(?<!\b\w/)' + re.escape(skill) + r'(?![\w+#&-]|\.\w)'
    return re.search(pattern, haystack) is not None


def fit_vectoriser(train_profiles):
    """Fit TF-IDF on training profiles only; same settings as the recorded baseline."""
    if any(profile['split'] != 'train' for profile in train_profiles):
        raise ValueError('The vectoriser may only be fitted on training profiles')
    vectoriser = TfidfVectorizer(analyzer='char', ngram_range=(3, 5), lowercase=True)
    vectoriser.fit([text(whitelisted(profile)) for profile in train_profiles])
    return vectoriser


def pair_features(mentee, mentor, vectoriser):
    """One feature row, ordered as FEATURE_NAMES, for a mentee and mentor profile."""
    mentee, mentor = whitelisted(mentee), whitelisted(mentor)
    vectors = vectoriser.transform([text(mentee), text(mentor)])
    # Rows are L2-normalised by the vectoriser, so the dot product is the cosine.
    cosine = float((vectors[0] @ vectors[1].T).toarray()[0, 0])
    mentee_skills, mentor_skills = skill_set(mentee), skill_set(mentor)
    shared = mentee_skills & mentor_skills
    union = mentee_skills | mentor_skills
    mentee_industry, mentor_industry = normalise(mentee['industry']), normalise(mentor['industry'])
    # Raw field values only: the 'Skills:' and 'Industry:' labels added by text()
    # must not count as mentions.
    mentor_text = normalise('\n'.join([mentor['headline'] or '', mentor['bio'] or '',
                                       *map(str, mentor['skills'] or []), mentor['industry'] or '']))
    mentioned = sum(mentions(skill, mentor_text) for skill in sorted(mentee_skills))
    return [
        cosine,
        len(shared) / len(union) if union else 0.0,
        float(len(shared)),
        float(bool(mentee_industry) and mentee_industry == mentor_industry),
        mentioned / len(mentee_skills) if mentee_skills else 0.0,
    ]


def build_features(profiles, pairs, vectoriser):
    """Feature matrix with one row per pair, in the order the pairs are given."""
    lookup = {profile['person_id']: profile for profile in profiles}
    rows = [pair_features(lookup[pair['mentee_id']], lookup[pair['mentor_id']], vectoriser) for pair in pairs]
    return np.asarray(rows, dtype=np.float64).reshape(len(rows), len(FEATURE_NAMES))
