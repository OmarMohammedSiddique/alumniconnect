"""Independent read-only bundle audit; no generated validator execution or ML fitting."""
import argparse
import collections
import csv
import hashlib
import itertools
import json
from pathlib import Path
import re
import unicodedata

PROFILE = {'person_id','role','split','headline','bio','skills','industry'}
PAIR = {'pair_id','mentee_id','mentor_id','split','relevance_score','label_rationale','ambiguity_flag','annotation_status'}

def norm(text):
    return ' '.join(re.findall(r'\w+',unicodedata.normalize('NFKC',text).casefold()))

def audit(root, original_source=None):
    root=Path(root)
    errors=[]
    def load(name):
        rows=[]
        for i,line in enumerate((root/name).read_text().splitlines(),1):
            if not line.strip(): continue
            try:
                row=json.loads(line)
                if not isinstance(row,dict): raise ValueError()
                rows.append(row)
            except (ValueError,TypeError): errors.append(f'{name}:{i}: invalid object')
        return rows
    pools={}
    allp=[]; allpairs=[]
    for split,prefix in [('train','original_training'),('val','validation'),('test','test')]:
        ps=load(prefix+'_profiles.jsonl'); pairs=load(prefix+'_pairs.jsonl')
        pools[split]=(ps,pairs); allp+=ps; allpairs+=pairs
        for p in ps:
            if set(p)!=PROFILE or p.get('split')!=split or p.get('role') not in ['mentor','mentee']: errors.append('profile schema/split/role:'+str(p.get('person_id')))
            if any(not isinstance(p.get(k),str) or not p[k].strip() for k in ['person_id','headline','bio','industry']): errors.append('profile text:'+str(p.get('person_id')))
            if not isinstance(p.get('skills'),list) or any(not isinstance(s,str) or not s.strip() for s in p.get('skills',[])): errors.append('skills:'+str(p.get('person_id')))
        for p in pairs:
            if set(p)!=PAIR or p.get('split')!=split or type(p.get('relevance_score')) is not int or p.get('relevance_score') not in range(4) or type(p.get('ambiguity_flag')) is not bool: errors.append('pair schema:'+str(p.get('pair_id')))
            for k in ['pair_id','mentee_id','mentor_id','label_rationale','annotation_status']:
                if not isinstance(p.get(k),str) or not p[k].strip(): errors.append('pair text:'+str(p.get('pair_id')))
    for field,rows in [('person_id',allp),('pair_id',allpairs)]:
        for k,n in collections.Counter(p.get(field) for p in rows).items():
            if n>1: errors.append(f'duplicate {field}: {k}')
    lookup={p['person_id']:p for p in allp}
    links=collections.Counter((p['mentee_id'],p['mentor_id']) for p in allpairs)
    for k,n in links.items():
        if n>1: errors.append('duplicate pair:'+str(k))
    for pair in allpairs:
        for field,role in [('mentee_id','mentee'),('mentor_id','mentor')]:
            p=lookup.get(pair[field])
            if not p or p['role']!=role or p['split']!=pair['split']: errors.append('invalid reference:'+pair['pair_id'])
    counts={}
    for split,(ps,prs) in pools.items():
        mids={p['person_id'] for p in ps if p['role']=='mentor'}; qids={p['person_id'] for p in ps if p['role']=='mentee'}
        actual={(p['mentee_id'],p['mentor_id']) for p in prs}
        expected=set(itertools.product(qids,mids))
        if split!='train' and actual!=expected: errors.append('incomplete heldout matrix:'+split)
        counts[split]={'mentors':len(mids),'mentees':len(qids),'pairs':len(prs),'unjudged':len(expected-actual),'score_counts':dict(sorted(collections.Counter(p['relevance_score'] for p in prs).items())), 'annotation_status':dict(collections.Counter(p['annotation_status'] for p in prs)), 'ambiguity_equals_middle_grade':sum(p['ambiguity_flag']==(p['relevance_score'] in [1,2]) for p in prs)}
    duplicates=[]; similarities=[]
    texts={p['person_id']:norm(' '.join([p['headline'],p['bio'],' '.join(p['skills']),p['industry']])) for p in allp}
    stop=set('a an the i my me we our you your to of for in and or with on as is are have has years work working help mentor mentoring looking want need'.split())
    for a,b in itertools.combinations(allp,2):
        ta=texts[a['person_id']]; tb=texts[b['person_id']]
        if ta==tb or norm(a['bio'])==norm(b['bio']): duplicates.append([a['person_id'],b['person_id']])
        if a['split']==b['split']:continue
        x=set(ta.split())-stop;y=set(tb.split())-stop
        j=len(x&y)/len(x|y) if x|y else 0
        similarities.append({'a':a['person_id'],'b':b['person_id'],'token_jaccard':round(j,4)})
    if duplicates:errors.append('duplicate profile text')
    with (root/'human_review_sheet.csv').open(newline='') as f:
        reader=csv.DictReader(f); fields=reader.fieldnames; review=list(reader)
    if set(fields)&{'relevance_score','label_rationale','ambiguity_flag','annotation_status'}:errors.append('unblinded machine columns')
    if collections.Counter(r['pair_id'] for r in review)!=collections.Counter(p['pair_id'] for p in allpairs): errors.append('review ID coverage differs')
    mismatches=[]
    for r in review:
        for role in ['mentee','mentor']:
            p=lookup.get(r[role+'_id'])
            if not p: mismatches.append(r['pair_id']);continue
            for field in ['headline','bio','industry']:
                if r[role+'_'+field]!=p[field]:mismatches.append(r['pair_id']+':'+role+'_'+field)
            if r[role+'_skills']!='; '.join(p['skills']):mismatches.append(r['pair_id']+':'+role+'_skills')
    if mismatches:errors.append('review text differs')
    filled=sum(any(r.get(k,'').strip() for k in ['reviewer_id','human_relevance_score_0_to_3','human_ambiguity_flag_true_or_false','human_rationale']) for r in review)
    manifest=json.loads((root/'manifest.json').read_text()); hash_mismatches=[]
    for name,info in manifest['files'].items():
        p=root/name
        if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=info['sha256']:hash_mismatches.append(name)
    if hash_mismatches:errors.append('manifest hash mismatch')
    corrections=load('proposed_training_corrections.jsonl'); badcor=[]
    pairlookup={p['pair_id']:p for p in allpairs}
    for c in corrections:
        source=lookup.get(c.get('target_id')) if c.get('target_type')=='profile' else pairlookup.get(c.get('target_id'))
        if not source:badcor.append(c.get('correction_id'));continue
        for k,v in c.get('original_fields',{}).items():
            if source.get(k)!=v:badcor.append(c.get('correction_id')+':'+k)
    # Existing trustworthy extractor compares parsed records, not serialized whitespace.
    from audit_export import extract_records
    old=Path(original_source) if original_source else None
    original_comparison=None
    if old and old.is_file():
        records,issues,_=extract_records(old.read_text())
        original_comparison={'source_hash':hashlib.sha256(old.read_bytes()).hexdigest(),'profiles_equal':[r for _,r in records if 'person_id' in r]==pools['train'][0], 'pairs_equal':[r for _,r in records if 'pair_id' in r]==pools['train'][1]}
    return {'structural_errors':errors,'counts':counts,'normalised_duplicate_profiles':duplicates,'cross_split_comparisons':len(similarities),'top_cross_split_similarity':sorted(similarities,key=lambda r:-r['token_jaccard'])[:10], 'review_rows':len(review),'review_rows_with_human_entries':filled,'review_text_mismatches':mismatches,'manifest_hash_mismatches':hash_mismatches,'proposed_corrections':len(corrections),'correction_source_mismatches':badcor,'original_source_comparison':original_comparison,'input_hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir() if p.is_file() and p.suffix in ['.jsonl','.json','.csv','.md','.py']},'research_ready':False,'boundary':'Integrity checks only; label correctness, conceptual independence and training adequacy require review. No model fit or generated script execution.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('directory');parser.add_argument('--original-source');args=parser.parse_args()
    print(json.dumps(audit(args.directory,args.original_source),indent=2))
