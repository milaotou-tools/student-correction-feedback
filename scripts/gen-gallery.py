import json

with open('/tmp/designs.json') as f:
    data = json.load(f)

cards = ''
for d in data:
    slug, name = d['slug'], d['name']
    pri, sec, surf, txt = d['primary'], d['secondary'], d['surface'], d['text']
    desc = d['desc']
    hdr_fg = '#fff' if not (pri.startswith('#F') or pri.startswith('#f') or pri.startswith('#E')) else '#333'
    cards += f"""
    <a href="https://typeui.sh/design-skills/{slug}" target="_blank" class="card" data-slug="{slug}" data-name="{name.lower()}">
      <div class="card-surf" style="background:{surf}">
        <div class="card-hdr" style="background:{pri};color:{hdr_fg}">
          <span class="card-slug">{slug}</span>
          <span class="card-name">{name}</span>
        </div>
        <div class="card-body" style="color:{txt}">
          <p class="card-desc">{desc}</p>
          <div class="swatches">
            <span class="sw" style="background:{pri}" title="primary"></span>
            <span class="sw" style="background:{sec}" title="secondary"></span>
            <span class="sw" style="background:{surf};outline:1px solid rgba(0,0,0,0.12)" title="surface"></span>
            <span class="sw" style="background:{txt}" title="text"></span>
          </div>
        </div>
      </div>
    </a>"""

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>typeui.sh — {len(data)} Design Styles Gallery</title>
<style>
  *,*::before,*::after{{box-sizing:border-box;margin:0}}
  body{{background:#1a1a1a;padding:24px;font-family:system-ui,sans-serif}}
  h1{{color:#fff;font-size:26px;margin-bottom:2px}}
  .sub{{color:#888;font-size:13px;margin-bottom:20px}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}}
  .card{{text-decoration:none;display:block;border-radius:10px;overflow:hidden;transition:transform .15s,box-shadow .15s}}
  .card:hover{{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.3)}}
  .card-surf{{border-radius:10px;overflow:hidden}}
  .card-hdr{{padding:10px 14px;display:flex;align-items:baseline;gap:8px}}
  .card-slug{{font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.7}}
  .card-name{{font-size:13px;font-weight:700}}
  .card-body{{padding:14px}}
  .card-desc{{font-size:11.5px;line-height:1.55;margin-bottom:12px;opacity:.8;min-height:36px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
  .swatches{{display:flex;gap:5px}}
  .sw{{width:20px;height:20px;border-radius:4px}}
  #filter{{width:100%;max-width:320px;padding:9px 16px;border-radius:20px;border:1px solid #444;background:#2a2a2a;color:#ddd;font-size:13px;outline:none;margin-bottom:20px}}
  #filter:focus{{border-color:#888}}
  .count{{color:#888;font-size:12px;margin-left:8px}}
</style>
</head>
<body>
<h1>typeui.sh Design Skills</h1>
<p class="sub">{len(data)} styles · click any card to open full preview on typeui.sh · 点卡片看大图</p>
<input type="text" id="filter" placeholder="搜索风格名..." oninput="filter()">
<span class="count" id="count">{len(data)} shown</span>
<div class="grid" id="grid">{cards}</div>
<script>
function filter() {{
  const q = document.getElementById('filter').value.toLowerCase();
  let n = 0;
  document.querySelectorAll('.card').forEach(c => {{
    const m = c.dataset.slug.includes(q) || c.dataset.name.includes(q);
    c.style.display = q && !m ? 'none' : '';
    if (!q || m) n++;
  }});
  document.getElementById('count').textContent = n + ' shown';
}}
</script>
</body>
</html>"""

with open('public/design-gallery.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f'Done: {len(data)} styles, {len(html)} bytes')
