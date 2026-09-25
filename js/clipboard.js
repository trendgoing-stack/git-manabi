// コピー処理。iOS Safari ではユーザー操作の中で同期的に開始しないと失敗するため、
// copyText はタップのイベントハンドラから await を挟まずに呼ぶこと。

/**
 * 非表示の textarea と execCommand('copy') でコピーする。
 * @param {string} text
 * @returns {boolean}
 */
function execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  // 16px 未満だと iOS がズームするので念のため 16px にしておく
  ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;';
  document.body.appendChild(ta);
  let ok = false;
  try {
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** 要素の中身を選択状態にする（手動コピー用） */
function selectContents(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * 1. navigator.clipboard.writeText → 2. execCommand → 3. 選択状態にして手動コピーを促す
 * @param {string} text
 * @param {{onSuccess: () => void, onManual: () => void, selectEl?: HTMLElement}} cb
 */
export function copyText(text, cb) {
  const fallback = () => {
    if (execCopy(text)) {
      cb.onSuccess();
    } else {
      if (cb.selectEl) selectContents(cb.selectEl);
      cb.onManual();
    }
  };
  let p = null;
  try {
    p = navigator.clipboard?.writeText(text) ?? null;
  } catch {
    p = null;
  }
  if (p) p.then(cb.onSuccess, fallback);
  else fallback();
}
