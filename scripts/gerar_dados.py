import json, random, datetime as dt, math, os

random.seed(20261028)
D = dt.date
HOJE = D(2026, 10, 28)
INI = HOJE - dt.timedelta(days=90)          # início da janela visível
WARM = INI - dt.timedelta(days=75)          # aquecimento: títulos antigos que ainda vencem/atrasam
FIM = HOJE + dt.timedelta(days=60)          # previsão
FERIADOS = {D(2026,9,7), D(2026,10,12), D(2026,11,2), D(2026,11,20), D(2026,12,25), D(2026,6,4), D(2026,8,15)}

def util(d):
    return d.weekday() != 6 and d not in FERIADOS

def prox_util(d):
    while not util(d):
        d += dt.timedelta(days=1)
    return d

def dias(a, b):
    d = a
    while d <= b:
        yield d
        d += dt.timedelta(days=1)

def cents(lo, hi, mode=None):
    v = random.triangular(lo, hi, mode or (lo + (hi - lo) * 0.25))
    c = int(round(v * 100))
    if c % 100 == 0:
        c += random.randint(7, 93)
    return c

def iso(d):
    return d.isoformat() if d else None

VENDEDORES = ["Marcos Aurélio Pinheiro", "Juliana Ferraz", "Edson Lacerda", "Tatiane Moura"]
ROTAS = ["Rota Centro", "Rota Vila Aurora e Jardins", "Rota Distrito Industrial e BR 163"]
TIPOS = {
    "Sacolão": (["Bom Preço", "Hortifruti da Vila", "Verde Vida", "do Trevo", "Feira Livre", "Pomar", "Colheita", "Sabor do Campo", "da Cidade Alta", "Frutas & Cia"], 2.2),
    "Mercado": (["São Jorge", "Vila Aurora", "Dois Irmãos", "Esperança", "Santa Rita", "Popular", "Família Rocha", "Econômico", "Ponto Certo", "Jardim Atlântico", "Primavera", "Boa Compra", "Avenida", "Guanabara", "Rio Vermelho"], 2.6),
    "Supermercado": (["Rede Compre Bem", "Irmãos Tonetto", "Central", "Real Atacarejo", "Rondon"], 6.0),
    "Restaurante": (["Sabor Caseiro", "Tempero da Vó", "Fogão a Lenha", "Ponto do Peixe", "Estância Gaúcha", "Bom Gosto", "Recanto Mineiro", "Mesa Farta", "Chalana", "Panela de Barro"], 1.4),
    "Lanchonete e sucos": (["Esquina", "Rodoviária", "Ki Suco", "Point da Praça", "Big Fome", "Suco Natural da Vila", "Cantina Universitária"], 0.9),
    "Padaria": (["Trigo de Ouro", "Pão Quente", "Santa Luzia", "Nova Aurora", "Delícia", "Bela Vista"], 0.8),
    "Açaí e sorveteria": (["Açaí da Praça", "Gelato Rondon", "Polpa Pura"], 1.0),
    "Hotel": (["Pousada Beira Rio", "Hotel Rondon Palace", "Hotel Avenida"], 1.6),
    "Cozinha de escola": (["Escola Estadual Pedro II", "Colégio Santo Antônio", "Escola Municipal Vila Operária"], 1.5),
    "Hospital": (["Hospital Santa Clara", "Clínica São Lucas"], 2.0),
}
sufixos = ["Ltda", "ME", "Comércio de Frutas Ltda", "Eireli", "", ""]
clientes = []
pool = []
for tipo, (nomes, peso) in TIPOS.items():
    for n in nomes:
        pool.append((tipo, n, peso))
random.shuffle(pool)
filiais = ["Centro", "Jardim Atlântico", "Vila Aurora", "Parque Universitário", "Vila Operária", "Cidade Alta", "Sagrada Família", "Jardim Guanabara"]
cid = 1
while len(clientes) < 250:
    tipo, n, peso = pool[(cid - 1) % len(pool)]
    nome = f"{tipo} {n}"
    k = 0
    while any(c["nome"].startswith(nome) for c in clientes) and k < 9:
        nome = f"{tipo} {n} {random.choice(filiais)}"; k += 1
    suf = random.choice(sufixos)
    if suf:
        nome = f"{nome} {suf}"
    clientes.append({"id": f"C{cid:03d}", "nome": nome, "tipo": tipo, "rota": random.choice(ROTAS),
                     "vendedor": random.choice(VENDEDORES), "limite_centavos": 0, "_peso": peso * random.uniform(0.6, 1.5)})
    cid += 1
clientes[7]["nome"] = "Supermercado e Hortifruti Irmãos Bertoldi da Vila Aurora Ltda"
clientes[7]["tipo"] = "Supermercado"; clientes[7]["_peso"] = 5
pesos = [c["_peso"] for c in clientes]

FORNECEDORES = [
    ("Citros Fazenda Santa Helena", 1.8), ("Sítio Boa Esperança (melancia)", 1.0), ("Cooperativa dos Fruticultores do Leste", 1.5),
    ("Bananas Três Barras", 1.4), ("Mamão Formosa Sul da Bahia", 1.0), ("Uvas Finas Vale do São Francisco", 0.9),
    ("Maçãs Serra Catarinense", 1.1), ("Limão Taiti Itajobi", 0.9), ("Abacaxi Pérola Miranorte", 0.7),
    ("Manga Palmer Petrolina", 0.8), ("Melão Mossoró Agrícola", 0.7), ("Box 14 Ceasa Cuiabá", 1.2),
    ("Goiaba e Maracujá Chapada", 0.5), ("Pera e Kiwi Importados Paraná", 0.4), ("Morango Serra da Mantiqueira", 0.4),
]

receber, pagar, lanc = [], [], []
seq = {"R": 0, "P": 0, "L": 0, "PED": 18200}

def nid(k):
    seq[k] += 1
    return f"{k}{seq[k]:05d}"

def add_lanc(data, tipo, categoria, descricao, contraparte, conta, forma, valor, vendedor="", rota="", origem=""):
    if data < INI or data > HOJE:
        return
    lanc.append({"id": nid("L"), "data": iso(data), "tipo": tipo, "categoria": categoria, "descricao": descricao,
                 "contraparte": contraparte, "conta": conta, "forma": forma, "valor_centavos": valor,
                 "vendedor": vendedor, "rota": rota, "origem": origem})

def split(total, n):
    base = total // n
    parts = [base] * n
    parts[-1] += total - base * n
    return parts

vendas_dia = {}       # para fechamento: (data) -> dict forma -> centavos
vendas_total_dia = {}

PRE_FERIADO = {prox_util(f - dt.timedelta(days=1)) for f in FERIADOS}
for d in dias(WARM, HOJE):
    if not util(d):
        continue
    n = random.randint(26, 38) if d.weekday() < 5 else random.randint(14, 20)
    if (d + dt.timedelta(days=1)) in FERIADOS or d.day <= 5:
        n = int(n * 1.3)
    for _ in range(n):
        c = random.choices(clientes, weights=pesos)[0]
        valor = cents(280, 6800, 900) if c["_peso"] < 3 else cents(1800, 16500, 4800)
        ped = f"PED{seq['PED']}"; seq["PED"] += 1
        r = random.random()
        fv = vendas_dia.setdefault(d, {"dinheiro": 0, "pix": 0, "debito": 0, "credito": 0, "boleto": 0, "cheque": 0, "entrega": 0})
        if r < 0.13:   # dinheiro
            if random.random() < 0.5:
                fv["dinheiro"] += valor
                add_lanc(d, "entrada", "Venda à vista", f"Pedido {ped} no balcão", c["nome"], "Caixa da loja", "Dinheiro", valor, c["vendedor"], c["rota"], ped)
            else:
                fv["entrega"] += valor
                add_lanc(d, "entrada", "Venda à vista", f"Pedido {ped} recebido na entrega", c["nome"], "Caixa da loja", "Dinheiro", valor, c["vendedor"], c["rota"], ped)
        elif r < 0.31:  # pix
            fv["pix"] += valor
            add_lanc(d, "entrada", "Venda à vista", f"Pedido {ped} via Pix", c["nome"], "Sicredi", "Pix", valor, c["vendedor"], c["rota"], ped)
        else:
            if r < 0.37:
                forma, adq = "Cartão de débito", random.choice(["Cielo", "Stone"])
                liq = valor - int(round(valor * 0.0129))
                parcelas = [(prox_util(d + dt.timedelta(days=1)), liq)]
                fv["debito"] += valor
            elif r < 0.43:
                forma, adq = "Cartão de crédito", random.choice(["Cielo", "Stone", "Rede"])
                liq = valor - int(round(valor * 0.0289))
                parcelas = [(prox_util(d + dt.timedelta(days=30)), liq)]
                fv["credito"] += valor
            elif r < 0.48:
                forma, adq = "Cheque", ""
                prazos = random.choice([[30], [30], [30, 60]])
                parcelas = [(prox_util(d + dt.timedelta(days=p)), v) for p, v in zip(prazos, split(valor, len(prazos)))]
                fv["cheque"] += valor
            else:
                forma, adq = "Boleto", ""
                prazos = random.choice([[7], [7], [14], [14], [14], [21], [21], [28], [14, 28]])
                parcelas = [(prox_util(d + dt.timedelta(days=p)), v) for p, v in zip(prazos, split(valor, len(prazos)))]
                fv["boleto"] += valor
            for i, (venc, v) in enumerate(parcelas):
                pago = None
                if venc <= HOJE:
                    roll = random.random()
                    if forma.startswith("Cartão"):
                        pago = venc
                    elif roll < 0.962:
                        pago = venc + dt.timedelta(days=random.choice([0, 0, 0, 1, 2]))
                    elif roll < 0.994:
                        pago = venc + dt.timedelta(days=random.randint(4, 25))
                    if pago and pago > HOJE:
                        pago = None
                    if pago:
                        pago = prox_util(pago) if pago < HOJE else pago
                        if pago > HOJE:
                            pago = None
                tid = nid("R")
                if venc < INI and pago and pago < INI:
                    continue
                receber.append({"id": tid, "pedido": ped, "cliente_id": c["id"], "cliente": c["nome"], "forma": forma,
                                "adquirente": adq, "parcela": f"{i+1}/{len(parcelas)}", "emissao": iso(d), "vencimento": iso(venc),
                                "valor_centavos": v, "pago_em": iso(pago), "vendedor": c["vendedor"], "rota": c["rota"]})
                if pago:
                    if forma.startswith("Cartão"):
                        add_lanc(pago, "entrada", "Repasse de cartão", f"Repasse {adq} do pedido {ped}", adq, "Sicredi", forma, v, c["vendedor"], c["rota"], tid)
                    else:
                        conta = "Banco do Brasil" if forma == "Cheque" else "Sicredi"
                        add_lanc(pago, "entrada", "Recebimento de cliente", f"{forma} {i+1}/{len(parcelas)} do pedido {ped}", c["nome"], conta, forma, v, c["vendedor"], c["rota"], tid)
        vendas_total_dia[d] = vendas_total_dia.get(d, 0) + valor

# Compras de fornecedores: ~78% das vendas, com prazos de indústria
total_v = sum(v for d, v in vendas_total_dia.items())
fpesos = [p for _, p in FORNECEDORES]
for d in dias(WARM, HOJE):
    if not util(d):
        continue
    alvo = vendas_total_dia.get(d, 0) * 0.71
    gasto = 0
    while gasto < alvo:
        f, _ = random.choices(FORNECEDORES, weights=fpesos)[0]
        v = cents(3200, 28000, 8500)
        gasto += v
        prazos = random.choice([[7], [7], [10], [14], [14], [21], [7, 14]])
        nf = f"NF {random.randint(10000, 99999)}"
        for i, (p, parte) in enumerate(zip(prazos, split(v, len(prazos)))):
            venc = prox_util(d + dt.timedelta(days=p))
            ab, motivo = 0, ""
            rr = random.random()
            if rr < 0.03:
                ab, motivo = int(parte * random.uniform(0.02, 0.09)), random.choice(["Fruta fora do padrão", "Avaria no transporte", "Bonificação"])
            pago = None
            if venc <= HOJE:
                pago = venc if random.random() < 0.97 else min(HOJE, prox_util(venc + dt.timedelta(days=random.randint(1, 3))))
            if venc < INI and pago and pago < INI:
                continue
            pid = nid("P")
            pagar.append({"id": pid, "fornecedor": f, "categoria": "Compra de frutas", "documento": f"{nf} {i+1}/{len(prazos)}",
                          "emissao": iso(d), "vencimento": iso(venc), "valor_centavos": parte, "abatimento_centavos": ab,
                          "motivo_abatimento": motivo, "pago_em": iso(pago)})
            if pago:
                add_lanc(pago, "saida", "Compra de frutas", f"{nf} parcela {i+1}/{len(prazos)}", f, "Sicredi" if random.random() < 0.7 else "Banco do Brasil", "Boleto", parte - ab, origem=pid)

def nth_util(ano, mes, n):
    d, k = D(ano, mes, 1), 0
    while True:
        if util(d) and d.weekday() != 5:
            k += 1
            if k == n:
                return d
        d += dt.timedelta(days=1)

def fixo(venc, fornecedor, categoria, doc, valor, conta="Sicredi", forma="Débito automático"):
    pago = venc if venc <= HOJE else None
    if venc < INI:
        return
    pid = nid("P")
    pagar.append({"id": pid, "fornecedor": fornecedor, "categoria": categoria, "documento": doc, "emissao": iso(venc - dt.timedelta(days=12)),
                  "vencimento": iso(venc), "valor_centavos": valor, "abatimento_centavos": 0, "motivo_abatimento": "", "pago_em": iso(pago)})
    if pago:
        add_lanc(pago, "saida", categoria, doc, fornecedor, conta, forma, valor, origem=pid)

def vendas_mes(ano, mes):
    return sum(v for d, v in vendas_total_dia.items() if d.year == ano and d.month == mes)

meses = [(2026, 6), (2026, 7), (2026, 8), (2026, 9), (2026, 10), (2026, 11), (2026, 12)]
for i, (a, m) in enumerate(meses):
    pa, pm = meses[i - 1] if i else (2026, 5)
    base_v = vendas_mes(pa, pm) or 2300000_00
    fixo(nth_util(a, m, 5), "Folha de pagamento", "Folha e encargos", f"Salários de {pm:02d}/{pa}", 5218344 + random.randint(-70000, 70000), "Banco do Brasil", "Transferência")
    fixo(prox_util(D(a, m, 20)), "Receita Federal e Sefaz", "Impostos", f"DAS e ICMS ST de {pm:02d}/{pa}", int(base_v * 0.036) + random.randint(11, 97))
    fixo(prox_util(D(a, m, 10)), "Imobiliária Horizonte", "Aluguel", f"Aluguel do galpão {m:02d}/{a}", 1243000 + 63, "Sicredi", "Boleto")
    fixo(prox_util(D(a, m, 15)), "Energisa", "Energia da câmara fria", f"Energia {m:02d}/{a}", 1084000 + random.randint(-90000, 120000), "Sicredi", "Débito automático")
    for vend in VENDEDORES:
        fixo(prox_util(D(a, m, 10)), vend, "Comissão de vendedores", f"Comissão de {pm:02d}/{pa}", int(base_v * 0.015 / 4 * random.uniform(0.8, 1.2)) + random.randint(3, 97), "Banco do Brasil", "Transferência")
    fixo(prox_util(D(a, m, 25)), "Banco Sicredi", "Tarifas bancárias", f"Tarifas {m:02d}/{a}", 41290 + random.randint(0, 9000), "Sicredi", "Débito automático")
# 13º salário
fixo(D(2026, 11, 30), "Folha de pagamento", "Folha e encargos", "13º salário 1ª parcela", 2609172, "Banco do Brasil", "Transferência")
fixo(D(2026, 12, 18), "Folha de pagamento", "Folha e encargos", "13º salário 2ª parcela", 2611745, "Banco do Brasil", "Transferência")

# Frota e frete
for d in dias(INI, FIM):
    if d.weekday() == 0:
        v = cents(2900, 5600, 3900)
        if d <= HOJE:
            add_lanc(d, "saida", "Frete e combustível", "Combustível da frota na semana", "Posto Trevão BR 163", "Sicredi", "Cartão frota", v)
    if d.weekday() == 3 and (d.isocalendar()[1] % 2 == 0):
        fixo(d, "Cerrado Frio Transportes", "Frete refrigerado", f"Frete refrigerado semana {d.isocalendar()[1]}", cents(3900, 8200, 5100), "Sicredi", "Boleto")
    if util(d) and random.random() < 0.05:
        fixo(d, random.choice(["Oficina Diesel Forte", "Refrigeração Polar (baú)", "Pneus Rodabem"]), "Manutenção da frota", "Manutenção de caminhão", cents(480, 6900, 1500), "Sicredi", "Pix")

for d in dias(INI, FIM):
    if d.day in (3, 18) and util(d):
        fixo(d, "Embalagens Rondon", "Caixas e embalagens", f"Caixas plásticas e bandejas {d.day:02d}/{d.month:02d}", cents(3800, 7200, 4900), "Sicredi", "Boleto")

# Contas e saldos de hoje
contas = [
    {"conta": "Caixa da loja", "tipo": "Caixa físico", "saldo_centavos": 618440, "data_saldo": iso(HOJE)},
    {"conta": "Sicredi", "tipo": "Banco", "saldo_centavos": 13863129, "data_saldo": iso(HOJE)},
    {"conta": "Banco do Brasil", "tipo": "Banco", "saldo_centavos": 6917282, "data_saldo": iso(HOJE)},
    {"conta": "Aplicação de liquidez diária", "tipo": "Banco", "saldo_centavos": 4000000 + 3871, "data_saldo": iso(HOJE)},
]

# Fechamentos de caixa: últimos 30 dias úteis até ontem
fech = []
resp = ["Cleide Santana", "Rogério Batista"]
for d in dias(HOJE - dt.timedelta(days=42), HOJE - dt.timedelta(days=1)):
    if not util(d):
        continue
    fv = vendas_dia.get(d)
    if not fv:
        continue
    abertura = 50000
    sup = random.choice([0, 0, 0, 0, 20000])
    esperado_gaveta = abertura + sup + fv["dinheiro"] + fv["entrega"]
    sangria = max(0, esperado_gaveta - abertura - random.randint(0, 30000))
    sangria = sangria - sangria % 1000
    esperado = esperado_gaveta - sangria
    contado = esperado
    if d == HOJE - dt.timedelta(days=1):
        contado = esperado - 6450
    elif random.random() < 0.15:
        contado = esperado + random.choice([-50, -10, 5, 20, 100])
    fech.append({"data": iso(d), "responsavel": random.choice(resp), "abertura_centavos": abertura, "suprimentos_centavos": sup,
                 "sangrias_centavos": sangria, "dinheiro_balcao_centavos": fv["dinheiro"], "acerto_motoristas_centavos": fv["entrega"],
                 "pix_centavos": fv["pix"], "debito_centavos": fv["debito"], "credito_centavos": fv["credito"],
                 "boleto_centavos": fv["boleto"], "cheque_centavos": fv["cheque"], "contado_centavos": contado})
fech = fech[-30:]

from collections import defaultdict
expo = defaultdict(int)
for r in receber:
    if not r["pago_em"]:
        expo[r["cliente_id"]] += r["valor_centavos"]
for c in clientes:
    c.pop("_peso")
    e = expo.get(c["id"], 0)
    lim = max(e * random.uniform(1.35, 2.6), random.uniform(5000, 15000) * 100)
    lim = int(round(lim / 50000)) * 50000 + random.choice([0, 0, 25000])
    c["limite_centavos"] = lim
# dois clientes acima do limite
for idx, fator in [(23, 0.82), (61, 0.91), (140, 0.88)]:
    c = clientes[idx]
    c["limite_centavos"] = int(round(expo.get(c["id"], 0) * fator / 50000)) * 50000

receber.sort(key=lambda r: (r["vencimento"], r["id"]))
pagar.sort(key=lambda r: (r["vencimento"], r["id"]))
lanc.sort(key=lambda r: (r["data"], r["id"]))
os.makedirs("dados", exist_ok=True)
for nome, rows in [("contas", contas), ("clientes", clientes), ("receber", receber), ("pagar", pagar), ("lancamentos", lanc), ("fechamentos", fech)]:
    with open(f"dados/{nome}.json", "w") as fh:
        json.dump(rows, fh, ensure_ascii=False, separators=(",", ":"))
    print(nome, len(rows), os.path.getsize(f"dados/{nome}.json"))
