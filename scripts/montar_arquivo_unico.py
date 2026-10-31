"""Gera dist/caixa-novo.html: o site num único arquivo (CSS, JS, logo e dados embutidos).
Serve para publicar em lugares que aceitam só um HTML, como um artifact do Claude.
Uso, na raiz do projeto:  python scripts/montar_arquivo_unico.py
"""
import base64, json, pathlib, re

raiz = pathlib.Path(__file__).resolve().parent.parent
html = (raiz / "index.html").read_text(encoding="utf-8")
css = (raiz / "assets/css/styles.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">', "<style>\n" + css + "</style>")
logo = "data:image/png;base64," + base64.b64encode((raiz / "assets/img/logo-branco.png").read_bytes()).decode()
html = html.replace("assets/img/logo-branco.png", logo)
fontes = ["contas", "clientes", "receber", "pagar", "lancamentos", "fechamentos"]
dados = {n: json.loads((raiz / f"dados/{n}.json").read_text(encoding="utf-8")) for n in fontes}
dados_js = "window.__DADOS__ = " + json.dumps(dados, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";"
scripts = ""
for nome in ["charts.js", "calculos.js", "app.js"]:
    scripts += "<script>\n" + (raiz / "assets/js" / nome).read_text(encoding="utf-8") + "\n</script>\n"
html = re.sub(r'<script src="assets/js/charts\.js"></script>\s*<script src="assets/js/calculos\.js"></script>\s*<script src="assets/js/app\.js"></script>\n',
              lambda m: "<script>\n" + dados_js + "\n</script>\n" + scripts, html)
saida = raiz / "dist" / "caixa-novo.html"
saida.parent.mkdir(exist_ok=True)
saida.write_text(html, encoding="utf-8")
print(f"Gerado {saida.relative_to(raiz)} ({saida.stat().st_size // 1024} KB)")
