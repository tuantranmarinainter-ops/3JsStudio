# bundle_demo.py — Gộp 1 trang demo trong engine/ + các module engine thành MỘT file HTML (để xuất artifact xem trên điện thoại).
# Mỗi module bọc trong IIFE riêng (tránh trùng tên hàm nội bộ); import './x.js' đổi thành destructure.
#   python3 tools/bundle_demo.py town-fx-demo.html out.html winter.js,r6.js,sfx.js,shaders.js,skies.js,merge.js,vcolor.js,proctex.js,weather.js,labels.js,quality.js [--artifact "Tên trang"]
# Thứ tự module: module được import phải đứng trước (winter.js trước skies/weather/quality).
# --artifact: bỏ doctype/head/body, chừa safe-area — đúng khuôn trang artifact của claude.ai.
import re, sys, json, base64
page, out, order = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
def modname(f): return '__m_' + re.sub(r'\W', '_', f)
def imports_to_destructure(code):
    def rep(m):
        names, src = m.group(1), m.group(2)
        names = names.replace(' as ', ': ')
        return f"const {{{names}}} = {modname(src.split('/')[-1])};"
    return re.sub(r"^import \{([^}]*)\} from '\./([^']+)';\s*$", rep, code, flags=re.M)
parts = []
for f in order:
    code = open('engine/' + f).read()
    exported = re.findall(r"^export (?:const|function|let|class) (\w+)", code, flags=re.M)
    code = re.sub(r"^export (const|function|let|class) ", r"\1 ", code, flags=re.M)
    code = imports_to_destructure(code)
    parts.append(f"const {modname(f)} = (() => {{\n{code}\nreturn {{ {', '.join(exported)} }};\n}})();\n")
lib = ''.join(parts)
html = open('engine/' + page).read()
m = re.search(r'(<script type="module">)(.*?)(</script>)', html, re.S)
body = m.group(2)
last = list(re.finditer(r"^import .*?;\s*$", body, flags=re.M))
# chèn thư viện sau import cuối cùng của three, rồi đổi import './x.js' thành destructure
three_imports = [i for i in last if "from './" not in i.group(0)]
pos = three_imports[-1].end()
body = body[:pos] + "\n" + lib + body[pos:]
body = imports_to_destructure(body)
html = html[:m.start(2)] + body + html[m.end(2):]
open(out, 'w').write(html)

if '--artifact' in sys.argv:
    title = sys.argv[sys.argv.index('--artifact') + 1]
    s = html
    s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', s)
    s = re.sub(r'<title>[^<]*</title>', f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">', s, count=1)
    s = s.replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
    s = s.replace('height:100vh;', 'height:100%;').replace('max-width:100vw;', 'max-width:100%;')
    s = s.replace('.ui { position:fixed; left:0; right:0; bottom:0; padding:8px 12px 12px;',
      '.ui { position:fixed; left:0; right:0; bottom:0; padding-top:8px; padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px)); padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px));')
    open(out, 'w').write(s)
print('->', out)
