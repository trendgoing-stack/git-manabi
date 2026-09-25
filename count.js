// GoatCounter へページ表示を1回だけ送る最小限のスクリプト（公式の count.js の代わりに同梱）。
// 送るのは固定のパスとタイトルだけ。ハッシュ、検索語、エントリ id、リファラーは送らない。
// 失敗しても何もしない（オフラインでもエラーを表示しない）。
(function () {
  var s = document.currentScript;
  if (!s) return;
  var endpoint = s.getAttribute('data-goatcounter');
  var path = s.getAttribute('data-path') || '/';
  var title = s.getAttribute('data-title') || '';
  if (!endpoint) return;
  // 開発中（localhost）は送らない
  if (/^(localhost|127\.|\[::1\]$|0\.0\.0\.0$)/.test(location.hostname) || location.protocol === 'file:') return;

  var url =
    endpoint +
    '?p=' + encodeURIComponent(path) +
    '&t=' + encodeURIComponent(title) +
    '&r=' +
    '&rnd=' + Math.random().toString(36).slice(2);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
  } catch (e) {
    /* 下の方法で再試行 */
  }
  try {
    var img = new Image();
    img.onerror = function () {};
    img.src = url;
  } catch (e) {
    /* 送れなくても無視する */
  }
})();
