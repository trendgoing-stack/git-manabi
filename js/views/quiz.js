// クイズ画面：出題範囲の選択 → 10問 → 結果。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { rich } from '../ui/rich.js';
import { db } from '../data.js';
import { buildQuiz, eligible, MIN_ITEMS, QUIZ_SIZE } from '../quiz.js';
import { getQuizStats, recordQuiz } from '../storage.js';
import { TOOLS, CATEGORIES } from '../config.js';

/** 出題範囲の選択は画面を離れても覚えておく（入力値ではないので保存はしない） */
const scope = { tool: '', category: '', mode: 'normal' };

export function renderQuiz() {
  const view = screen({ title: 'クイズ', tab: 'learn', showBack: true, backTo: '/learn' });
  setup(view);
}

function select(label, options, value, onChange) {
  const sel = h(
    'select',
    { class: 'select', 'aria-label': label, onchange: () => onChange(sel.value) },
    options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label))
  );
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), sel);
}

function setup(view) {
  const status = h('p', { class: 'quiz-status', 'aria-live': 'polite' });
  const start = h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => play(view) }, 'はじめる');

  const refresh = () => {
    const { total } = eligible(db.entries, db.quiz, scope);
    if (total < MIN_ITEMS) {
      status.textContent = `この範囲で出題できる確認済みの項目は ${total} 件です。${MIN_ITEMS} 件以上になると開始できます。`;
      status.className = 'quiz-status warn';
      start.disabled = true;
      return;
    }
    if (scope.mode === 'weak') {
      const n = buildQuiz({ entries: db.entries, quizItems: db.quiz, stats: getQuizStats(), scope, mode: 'weak' }).length;
      status.textContent = n ? `間違えたことのある問題から ${n} 問を、不正解率の高い順に出題します。` : 'この範囲で間違えた問題はまだありません。';
      status.className = 'quiz-status' + (n ? '' : ' warn');
      start.disabled = n === 0;
      return;
    }
    status.textContent = `対象 ${total} 件から ${Math.min(QUIZ_SIZE, total)} 問を出題します。`;
    status.className = 'quiz-status';
    start.disabled = false;
  };

  view.replaceChildren(
    h(
      'div',
      { class: 'quiz-setup' },
      h('p', { class: 'sub' }, '「やりたいこと」からコマンドを、コマンドから「やりたいこと」を4択で答えます。出題されるのは、作者が動作を確認した項目だけです。'),
      select(
        'ツール',
        [{ value: '', label: 'すべて' }, ...TOOLS.map((t) => ({ value: t.id, label: t.label }))],
        scope.tool,
        (v) => {
          scope.tool = v;
          refresh();
        }
      ),
      select(
        'カテゴリ',
        [{ value: '', label: 'すべて' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))],
        scope.category,
        (v) => {
          scope.category = v;
          refresh();
        }
      ),
      h(
        'fieldset',
        { class: 'setting' },
        h('legend', null, '出題のしかた'),
        [
          { value: 'normal', label: 'ランダムに10問' },
          { value: 'weak', label: '苦手を復習（間違えた問題から）' },
        ].map((m) =>
          h(
            'label',
            { class: 'radio' },
            h('input', {
              type: 'radio',
              name: 'quiz-mode',
              checked: scope.mode === m.value,
              onchange: () => {
                scope.mode = m.value;
                refresh();
              },
            }),
            h('span', null, m.label)
          )
        )
      ),
      status,
      start
    )
  );
  refresh();
}

function play(view) {
  const questions = buildQuiz({ entries: db.entries, quizItems: db.quiz, stats: getQuizStats(), scope, mode: scope.mode });
  if (!questions.length) return setup(view);
  const results = [];
  let i = 0;

  const show = () => {
    const q = questions[i];
    let answered = false;
    const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
    const next = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary btn-block',
        hidden: true,
        onclick: () => {
          i++;
          if (i < questions.length) show();
          else finish(view, questions, results);
        },
      },
      i + 1 < questions.length ? '次へ' : '結果を見る'
    );
    const buttons = q.choices.map((c, idx) =>
      h(
        'button',
        {
          type: 'button',
          class: 'quiz-choice',
          onclick: () => {
            if (answered) return;
            answered = true;
            const ok = idx === q.answer;
            recordQuiz(q.statId, ok);
            results.push({ q, ok, chosen: idx });
            buttons.forEach((b, j) => {
              b.disabled = true;
              if (j === q.answer) b.classList.add('is-correct');
              else if (j === idx) b.classList.add('is-wrong');
            });
            feedback.replaceChildren(
              ...[
                h('p', { class: ok ? 'quiz-ok' : 'quiz-ng' }, ok ? '正解！' : '不正解'),
                q.explain ? h('p', { class: 'sub' }, rich(q.explain, { inline: true })) : null,
                q.entryId ? h('a', { href: `#/entry/${q.entryId}`, class: 'sub' }, '詳しく見る（クイズは中断されます）') : null,
              ].filter(Boolean)
            );
            next.hidden = false;
            next.focus();
          },
        },
        h('span', { class: 'quiz-mark', 'aria-hidden': 'true' }, 'ABCD'[idx]),
        q.choicesAreCode ? h('code', null, c) : h('span', null, rich(c, { inline: true }))
      )
    );
    view.replaceChildren(
      h(
        'div',
        { class: 'quiz' },
        h('div', { class: 'quiz-progress' }, h('span', null, `${i + 1} / ${questions.length}`), h('progress', { max: questions.length, value: i })),
        h('p', { class: 'quiz-lead' }, q.lead),
        h('div', { class: 'quiz-prompt' }, q.promptIsCode ? h('code', null, q.prompt) : rich(q.prompt, { inline: true })),
        h('div', { class: 'quiz-choices' }, buttons),
        feedback,
        next
      )
    );
    window.scrollTo(0, 0);
  };
  show();
}

function finish(view, questions, results) {
  const score = results.filter((r) => r.ok).length;
  const wrong = results.filter((r) => !r.ok);
  view.replaceChildren(
    h(
      'div',
      { class: 'quiz-result' },
      h('p', { class: 'quiz-score' }, `${questions.length} 問中 ${score} 問正解`),
      wrong.length
        ? h(
            'section',
            null,
            h('h2', { class: 'section-title' }, '間違えた問題'),
            h(
              'ul',
              { class: 'result-list' },
              wrong.map((r) =>
                h(
                  'li',
                  null,
                  h(
                    r.q.entryId ? 'a' : 'div',
                    { class: 'result', href: r.q.entryId ? `#/entry/${r.q.entryId}` : null },
                    h('span', { class: 'sub' }, r.q.promptIsCode ? h('code', null, r.q.prompt) : rich(r.q.prompt, { inline: true })),
                    h('span', { class: 'result-title' }, '正解：', r.q.choicesAreCode ? h('code', null, r.q.choices[r.q.answer]) : rich(r.q.choices[r.q.answer], { inline: true }))
                  )
                )
              )
            )
          )
        : h('p', { class: 'quiz-ok' }, '全問正解です！'),
      h(
        'div',
        { class: 'action-col' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => play(view) }, 'もう一度'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn',
            onclick: () => {
              scope.mode = 'weak';
              setup(view);
            },
          },
          '苦手を復習する'
        ),
        h('button', { type: 'button', class: 'btn', onclick: () => setup(view) }, '出題範囲を変える')
      )
    )
  );
  window.scrollTo(0, 0);
}
