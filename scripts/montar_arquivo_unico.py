"""Gera dist/caixa-novo.html: o site num único arquivo (CSS, JS, logo e dados embutidos).
Serve para publicar em lugares que aceitam só um HTML, como um artifact do Claude.
Uso, na raiz do projeto: npm run build (compila o menu e gera este HTML).
"""
import base64, json, pathlib

raiz = pathlib.Path(__file__).resolve().parent.parent
html = (raiz / "index.html").read_text(encoding="utf-8")
css = (raiz / "assets/css/styles.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">', "<style>\n" + css + "</style>")
menu_css = (raiz / "assets/generated/branched-menu.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="assets/generated/branched-menu.css">', "<style>\n" + menu_css + "</style>")
menu_js = (raiz / "assets/generated/branched-menu.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
html = html.replace('<script src="assets/generated/branched-menu.js"></script>', '<script>\n' + menu_js + '\n</script>')
logo = "data:image/png;base64," + base64.b64encode((raiz / "assets/img/logo-branco.png").read_bytes()).decode()
html = html.replace("assets/img/logo-branco.png", logo)
fontes = ["contas", "clientes", "receber", "pagar", "lancamentos", "fechamentos"]
dados = {n: json.loads((raiz / f"dados/{n}.json").read_text(encoding="utf-8")) for n in fontes}
dados_js = "window.__DADOS__ = " + json.dumps(dados, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";"
html = html.replace('<script src="assets/js/charts.js"></script>', '<script>\n' + dados_js + '\n</script>\n<script src="assets/js/charts.js"></script>')
for nome in ["charts.js", "calculos.js", "ui.js", "workspace.js", "app.js"]:
    html = html.replace(f'<script src="assets/js/{nome}"></script>', '<script>\n' + (raiz / "assets/js" / nome).read_text(encoding="utf-8") + '\n</script>')
saida = raiz / "dist" / "caixa-novo.html"
saida.parent.mkdir(exist_ok=True)
saida.write_text(html, encoding="utf-8")
print(f"Gerado {saida.relative_to(raiz)} ({saida.stat().st_size // 1024} KB)")
