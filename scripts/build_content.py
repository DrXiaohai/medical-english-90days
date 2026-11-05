# coding: utf-8
"""从 Markdown 中的结构化块生成所有阅读及 Web 产物。"""
import csv
import json
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def load_program():
    text=(ROOT/'curriculum/plan.md').read_text()
    return json.loads(re.search(r'```program-json\n(.*?)\n```',text,re.S).group(1))

def load_lessons():
    lessons=[]
    for path in sorted((ROOT/'curriculum').glob('week_*/day_*.md')):
        blocks=re.findall(r'```lesson-json\n(.*?)\n```',path.read_text(),re.S)
        if len(blocks)!=1: raise ValueError(f'{path}: 需要一个数据块')
        lessons.append(json.loads(blocks[0]))
    return sorted(lessons,key=lambda x:x['day'])
def load_exams():
    return [json.loads(re.search(r'```exam-json\n(.*?)\n```',p.read_text(),re.S).group(1)) for p in sorted((ROOT/'exams').glob('mock_exam_*.md'))]

def lesson_markdown(d, answers=False):
    lines=[f"# Day {d['day']} · {d['title']}"]
    if answers:
        lines+=['## 选择题答案与解析']
        for i,q in enumerate(d['questions'],1): lines.append(f"{i}. 答案 {chr(65+q['answer'])}。{q['explanation']}")
        lines+=['## 翻译参考与评分']
        for i,t in enumerate(d['translations'],1):
            lines += [f"### 翻译 {i}",t['source'],f"参考译文：{t['reference']}", '术语：'+'；'.join(t['terms']), '句法：'+t['grammar'],'常见错误：'+t['commonError'],'评分：'+'；'.join(t['rubric']),'允许保留原意与确定程度的合理同义表达，每题6分，自评。']
        return '\n\n'.join(lines)
    lines += [d['chapter']+' · '+d['pages'], d['sourceNote'],'## 学习目标']+['- '+x for x in d['objectives']]
    study=d['textbookStudy']
    lines+=['## 60–90分钟学习路径',d['schedule']['short'],d['schedule']['standard'],d['schedule']['workload'],'## 教材学习任务',study['book'],study['chapter']+f" · 电子书导航起点 {study['startPage']}",study['focus']]
    lines += [f'{i}. {step}' for i,step in enumerate(study['steps'],1)]
    lines += ['阅读产出：'+study['output'],'合书自测：'+study['review'],study['note'],'教材学习笔记：记录实际阅读页码、例词或结构、自己的理解及待查问题。','## 核心词汇']
    for v in d['vocabulary']: lines += [f"### {v['english']} · {v['chinese']}", f"{v['pos']} · {v['system']} · 难度{v['difficulty']} · {v['morphology']}",v['example'],v['translation']]
    lines+=['## 常用表达']+['- '+a+' — '+b for a,b in d['expressions']]
    lines+=['## 核心知识',d['core'],'## 英文阅读 / 病例',d['reading'],'## 选择题']
    for i,q in enumerate(d['questions'],1):
        lines+=[f"### {i}. {q['stem']}"]+[f'{chr(65+j)}. {o}' for j,o in enumerate(q['options'])]
    lines+=['## 翻译练习']
    for i,t in enumerate(d['translations'],1): lines += [f"### {i}. {'英译汉' if t['direction']=='en-zh' else '汉译英'}",t['source'],'作答：________________________________________']
    lines+=['## 当日复习清单']+['- [ ] '+x for x in d['checklist']]
    return '\n\n'.join(lines)
def build():
    lessons=load_lessons(); (ROOT/'src/generated').mkdir(exist_ok=True)
    program=load_program()
    (ROOT/'src/generated/program.json').write_text(json.dumps(program,ensure_ascii=False,indent=2))
    plan=(ROOT/'curriculum/plan.md').read_text().split('```program-json')[0]
    table='| 周次 | 日程 | 教材范围 | 估计页数 | 导航切分（待正文核对） |\n| --- | --- | --- | --- | --- |\n'
    for i,w in enumerate(program['weeks'],1):
        table+=f"| {i} | Day {w['days'][0]}–{w['days'][-1]} | {w['goal']} | {w['estimatedPages']} | {w['navigation']} |\n"
    plan=plan.replace('下表由本文件中的program-json数据块生成至STUDY_PLAN.md，并同步用于Web仪表盘。', '本计划由curriculum/plan.md生成，周安排同步用于Web仪表盘。')
    plan=plan.replace('## 样章与进度对应',table+'\n## 样章与进度对应')
    (ROOT/'STUDY_PLAN.md').write_text(plan)

    (ROOT/'src/generated/exams.json').write_text(json.dumps(load_exams(),ensure_ascii=False,indent=2))
    (ROOT/'src/generated/lessons.json').write_text(json.dumps(lessons,ensure_ascii=False,indent=2))
    out=ROOT/'output'; out.mkdir(exist_ok=True)
    (out/'complete_textbook.md').write_text('\n\n---\n\n'.join(lesson_markdown(d) for d in lessons))
    (out/'answer_book.md').write_text('\n\n---\n\n'.join(lesson_markdown(d,True) for d in lessons))
    words={v['id']:v for d in lessons for v in d['vocabulary']}
    (ROOT/'vocabulary/core_vocabulary.json').write_text(json.dumps(list(words.values()),ensure_ascii=False,indent=2))
    with (ROOT/'vocabulary/core_vocabulary.csv').open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.DictWriter(f,fieldnames=list(next(iter(words.values())))); writer.writeheader(); writer.writerows(words.values())
    for direction,name in [('en-zh','english_to_chinese'),('zh-en','chinese_to_english')]:
        tasks=[t for d in lessons for t in d['translations'] if t['direction']==direction]
        (ROOT/f'translation/{name}.md').write_text('# 翻译练习\n\n'+'\n\n'.join(f"{i}. {t['source']}" for i,t in enumerate(tasks,1))+'\n\n# 参考答案（完成后查看）\n\n'+'\n\n'.join(f"{i}. {t['reference']}\n\n术语：{'；'.join(t['terms'])}\n\n句法：{t['grammar']}\n\n常见错误：{t['commonError']}\n\n评分：{'；'.join(t['rubric'])}" for i,t in enumerate(tasks,1)))
    for filename,pos in [('word_roots','combining form'),('prefixes','prefix'),('suffixes','suffix')]:
        selected=[v for v in words.values() if v['pos']==pos]
        (ROOT/f'vocabulary/{filename}.md').write_text('# '+filename+'\n\n'+'\n\n'.join(f"## {v['english']} · {v['chinese']}\n\n{v['morphology']}\n\n{v['example']}\n\n{v['translation']}" for v in selected))
    (ROOT/'translation/common_patterns.md').write_text('# 常用句式\n\n'+'\n\n'.join(f'- {a} — {b}' for d in lessons for a,b in d['expressions']))
    for lesson_id,name in [('day-08','cardiovascular'),('day-15','respiratory')]:
        d=next(d for d in lessons if d['id']==lesson_id)
        (ROOT/f'cases/{name}.md').write_text('# '+d['title']+'\n\n'+d['reading']+'\n\n## Questions\n\n'+'\n\n'.join(q['stem']+'\n\n'+' / '.join(q['options']) for q in d['questions'])+'\n\n## Answer explanations\n\n'+'\n\n'.join(f"{i}. {chr(65+q['answer'])}. {q['explanation']}" for i,q in enumerate(d['questions'],1)))
    case_days=json.loads((ROOT/'content_review/case_days.json').read_text())
    (ROOT/'cases/clinical_cases.md').write_text('# 系统课程临床短病例\n\n'+'\n\n---\n\n'.join(f"## Day {d['day']} · {d['title']}\n\n{d['reading']}" for d in lessons if d['day'] in case_days))
    stats={'courses':len(lessons),'vocabularyStudySlots':sum(len(d['vocabulary']) for d in lessons),'uniqueVocabulary':len(words),'dailyQuestions':sum(len(d['questions']) for d in lessons),'examQuestions':sum(len(e['questions']) for e in load_exams()),'dailyTranslations':sum(len(d['translations']) for d in lessons),'examTranslations':sum(len(e['translations']) for e in load_exams()),'dailyClinicalVignettes':len(case_days),'examClinicalVignettes':6,'examOtherPassages':2,'exams':len(load_exams())}
    (out/'content_stats.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
    (out/'COURSE_INDEX.md').write_text('# 90天课程索引\n\n'+'\n'.join(f"- Day {d['day']} · {d['title']} · {d['chapter']}" for d in lessons))
    print(f'构建内容成功：{len(lessons)}课 / {len(words)}独立词汇 / {len(load_exams())}套模考')
if __name__=='__main__': build()
