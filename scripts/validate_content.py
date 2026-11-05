# coding: utf-8
"""结构、唯一性、内容完整性和重复率检查；不替代医学审查。"""
import argparse,json,re,collections,hashlib
from datetime import datetime,timezone
from build_content import ROOT,load_lessons,load_program,load_exams

def validate(partial=False):
    program=load_program();lessons=load_lessons();days=[d['day'] for d in lessons]
    assert len(set(days))==len(days) and all(1<=d<=90 for d in days),'日程编号冲突'
    if not partial: assert days==list(range(1,91)),f'尚缺课程 {sorted(set(range(1,91))-set(days))}'
    assert [d for w in program['weeks'] for d in w['days']]==list(range(1,91))
    ids=set();question_ids=set();stems={};words={};translations=[]
    for d in lessons:
        assert d['id'] not in ids;ids.add(d['id'])
        for key in ['title','chapter','objectives','core','reading','checklist','textbookStudy','schedule']:assert d[key],f"Day{d['day']}缺少{key}"
        raw=json.dumps(d,ensure_ascii=False)
        assert not re.search(r'Lorem ipsum|TODO|待补充|占位内容|placeholder',raw,re.I),f"Day{d['day']}存在占位文本"
        assert len(d['core'])>=60 and len(d['reading'].split())>=45,f"Day{d['day']}讲解或阅读不足"
        assert 15<=len(d['vocabulary'])<=20 and len({v['id'] for v in d['vocabulary']})==len(d['vocabulary'])
        assert 3<=len(d['expressions'])<=5 and len(d['questions'])==5
        assert [t['direction'] for t in d['translations']].count('en-zh')==3
        assert [t['direction'] for t in d['translations']].count('zh-en')==2
        for v in d['vocabulary']:
            assert all(v.get(k) for k in ['id','english','chinese','pos','system','example','translation','difficulty'])
            assert v['id'] not in words or words[v['id']]==v,f"词汇ID含义冲突 {v['id']}"
            words[v['id']]=v
        for q in d['questions']:
            assert q['id'] not in question_ids;question_ids.add(q['id'])
            assert len(q['options'])==4 and len(set(q['options']))==4
            assert type(q['answer']) is int and 0<=q['answer']<4 and len(q['explanation'])>=8, f"解析不足 {q['id']}"
            normalized=re.sub(r'\W+','',q['stem']).lower();assert normalized not in stems,f"重复题干 Day{d['day']}与{stems.get(normalized)}";stems[normalized]=d['day']
        for t in d['translations']:
            assert t['id'] not in question_ids;question_ids.add(t['id'])
            assert all(t.get(k) for k in ['source','reference','terms','grammar','commonError','rubric'])
            translations.append(t['source'])
    exams=load_exams()
    if not partial:assert len(exams)==4
    exam_ids=set()
    for e in exams:
        assert e['id'] not in exam_ids;exam_ids.add(e['id'])
        assert len(e['questions'])==20 and len(e['translations'])==10 and e['pointsPerQuestion']==2
        assert 60<=e['minutes']<=90
        assert len(e['questions'])*e['pointsPerQuestion']+len(e['translations'])*6==100
        for q in e['questions']:
            assert q['id'] not in question_ids;question_ids.add(q['id'])
            assert len(q['options'])==4 and len(set(q['options']))==4 and type(q['answer']) is int and 0<=q['answer']<4 and q['explanation']
            n=re.sub(r'\W+','',q['stem']).lower();assert n not in stems,f"模考重复题干 {q['id']}";stems[n]=e['id']
        for t in e['translations']:
            assert t['id'] not in question_ids;question_ids.add(t['id'])
            assert all(t.get(k) for k in ['source','reference','terms','grammar','commonError','rubric'])
            translations.append(t['source'])
    counts=collections.Counter(translations);repeated=sum(n-1 for n in counts.values() if n>1)
    assert repeated<=len(translations)*.08,'完全重复翻译过多'
    for p in ROOT.rglob('*.md'):
        if any(x in p.parts for x in ['node_modules','dist','tmp','publish_output']):continue
        for link in re.findall(r'\]\(([^)]+)\)',p.read_text()):
            if not re.match(r'https?://|#',link):assert (p.parent/link.split('#')[0]).exists(),f'失效链接 {p}: {link}'
    report={'checkedAt':datetime.now(timezone.utc).isoformat(),'scope':'partial' if partial else 'full','courses':len(lessons),'days':days,'uniqueVocabulary':len(words),'dailyQuestions':sum(len(d['questions']) for d in lessons),'examQuestions':sum(len(e['questions']) for e in exams),'exams':len(exams),'translations':len(translations),'repeatedTranslationPrompts':repeated,'sourceDigest':hashlib.sha256(json.dumps(lessons,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),'result':'passed'}
    out=ROOT/'output/checks';out.mkdir(parents=True,exist_ok=True);(out/f'batch-{len(lessons):02}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--partial',action='store_true');parser.add_argument('--full',action='store_true');args=parser.parse_args();validate(args.partial)
