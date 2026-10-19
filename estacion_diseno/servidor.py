# -*- coding: utf-8 -*-
"""
ESTACIÓN DE DISEÑO — Tactical Marketing ERP
============================================
Programa pequeño que corre en el PC de diseño (Windows) y le sirve a las herramientas del ERP
(que siguen en internet) para trabajar con archivos pesados SIN subirlos a ninguna parte:

  * Crea la carpeta de cada trabajo (OT - Cliente) con originales / montaje / salida.
  * Entrega los archivos del disco a las herramientas por partes (soporta Range), así un PDF
    de 500 MB se lee sin cargarlo entero en la memoria del navegador.
  * Guarda en el disco lo que generan las herramientas (montajes, JPG del plotter) y calcula el
    nombre consecutivo del día ("17 octubre", "B 17 octubre", ...).

Solo usa la biblioteca estándar de Python (no hay que instalar nada para esta fase).
Solo escucha en 127.0.0.1 (este mismo computador) y solo atiende a las páginas del ERP.
"""
import json, os, re, shutil, sys, time, threading, traceback

try:   # la consola de Windows puede no soportar todos los caracteres: nunca debe fallar una acción por un mensaje
    sys.stdout.reconfigure(errors="replace"); sys.stderr.reconfigure(errors="replace")
except Exception:
    pass
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

VERSION = "1.0"
CARPETA_PROGRAMA = os.path.dirname(os.path.abspath(__file__))
ARCHIVO_CONFIG = os.path.join(CARPETA_PROGRAMA, "config.json")
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]
SUBCARPETAS = ["originales", "montaje", "salida"]

CONFIG_DEFECTO = {
    "puerto": 8793,
    "raiz": os.path.join(os.path.expanduser("~"), "Documents", "Trabajos Tactical"),
    "plotter": "",   # vacio = D:\Plotter Impresion (si no hay disco D:, <raiz>\_Plotter)
    "origenes": [
        "https://tacticalerp.github.io",
        "http://localhost:8791",
        "http://127.0.0.1:8791",
    ],
}


def cargar_config():
    cfg = dict(CONFIG_DEFECTO)
    if os.path.exists(ARCHIVO_CONFIG):
        try:
            with open(ARCHIVO_CONFIG, encoding="utf-8") as f:
                cfg.update(json.load(f))
        except Exception as e:
            print("[!] No pude leer config.json, uso los valores por defecto:", e)
    return cfg


def guardar_config(cfg):
    with open(ARCHIVO_CONFIG, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


CFG = cargar_config()


def raiz():
    return os.path.abspath(CFG["raiz"])


PLOTTER_DEFECTO = r"D:\Plotter Impresion"


def carpeta_plotter():
    r"""Carpeta de los JPG del plotter: D:\Plotter Impresion. Una ruta vacia, o la antigua por defecto
    (<raiz>\_Plotter, que quedo guardada en config.json de versiones anteriores), se cambia a esa.
    Si el PC no tiene disco D:, se usa <raiz>\_Plotter."""
    ruta = (CFG.get("plotter") or "").strip()
    antigua = os.path.abspath(os.path.join(raiz(), "_Plotter"))
    if not ruta or os.path.abspath(ruta).lower() == antigua.lower():
        ruta = PLOTTER_DEFECTO
    unidad = os.path.splitdrive(ruta)[0]
    if unidad and not os.path.exists(unidad + os.sep):
        ruta = antigua      # el disco configurado no existe en este PC: carpeta de respaldo
    return os.path.abspath(ruta)


def limpiar_nombre(t, largo=80):
    t = re.sub(r'[\\/:*?"<>|\r\n\t]+', " ", str(t or "")).strip(" .")
    t = re.sub(r"\s+", " ", t)
    return t[:largo].strip(" .")


def dentro_de(ruta, base):
    ruta = os.path.abspath(ruta)
    base = os.path.abspath(base)
    return ruta == base or ruta.startswith(base + os.sep)


def ruta_segura(relativa):
    """Convierte una ruta relativa a la raíz (o a la carpeta del plotter con prefijo '_Plotter/')
    en una ruta absoluta, y verifica que no se salga de las carpetas permitidas."""
    rel = unquote(relativa or "").replace("/", os.sep).lstrip(os.sep)
    if not rel:
        raise ValueError("ruta vacía")
    absoluta = os.path.abspath(os.path.join(raiz(), rel))
    if dentro_de(absoluta, raiz()) or dentro_de(absoluta, carpeta_plotter()):
        return absoluta
    raise PermissionError("ruta fuera de las carpetas de trabajo")


def espacio_libre_gb(ruta):
    try:
        carpeta = ruta
        while carpeta and not os.path.exists(carpeta):
            nueva = os.path.dirname(carpeta)
            if nueva == carpeta:
                break
            carpeta = nueva
        return round(shutil.disk_usage(carpeta).free / (1024 ** 3), 1)
    except Exception:
        return None


def hay_libreria(nombre):
    try:
        __import__(nombre)
        return True
    except Exception:
        return False


def carpeta_de_trabajo(ot, cliente):
    partes = [limpiar_nombre(ot, 30), limpiar_nombre(cliente, 50)]
    nombre = " - ".join(p for p in partes if p) or "Sin OT"
    return os.path.join(raiz(), nombre)


def nombre_plotter(fecha=None):
    """'17 octubre' y, si ya hay archivos de hoy, 'B 17 octubre', 'C 17 octubre'..."""
    t = fecha or time.localtime()
    base = "%d %s" % (t.tm_mday, MESES[t.tm_mon - 1])
    carpeta = carpeta_plotter()
    existentes = set()
    if os.path.isdir(carpeta):
        for n in os.listdir(carpeta):
            nombre = os.path.splitext(n)[0]
            nombre = re.sub(r"\s*\(parte \d+ de \d+\)\s*$", "", nombre)   # las partes cuentan como el mismo montaje
            existentes.add(nombre.lower())
    n = 0
    while True:
        candidato = base if n == 0 else "%s %s" % (chr(65 + n), base)
        if candidato.lower() not in existentes:
            return candidato, n
        n += 1
        if n > 25:
            return base + " (otro)", n


class Manejador(BaseHTTPRequestHandler):
    server_version = "EstacionDiseno/" + VERSION
    protocol_version = "HTTP/1.1"

    # ---------- utilidades ----------
    def log_message(self, formato, *args):
        pass  # silencioso: solo se imprimen los eventos importantes

    def origen_permitido(self):
        origen = self.headers.get("Origin")
        if not origen:
            return True, None            # llamadas directas (curl, el propio navegador abriendo /estado)
        return (origen in CFG["origenes"]), origen

    def cabeceras_cors(self):
        ok, origen = self.origen_permitido()
        if origen and ok:
            self.send_header("Access-Control-Allow-Origin", origen)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Tactical, Range")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")
            self.send_header("Access-Control-Max-Age", "600")

    def responder_json(self, datos, codigo=200):
        cuerpo = json.dumps(datos, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.cabeceras_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def error(self, codigo, mensaje):
        self.responder_json({"ok": False, "error": mensaje}, codigo)

    def leer_json(self):
        largo = int(self.headers.get("Content-Length") or 0)
        if largo > 5 * 1024 * 1024:
            raise ValueError("cuerpo demasiado grande")
        bruto = self.rfile.read(largo) if largo else b"{}"
        return json.loads(bruto.decode("utf-8") or "{}")

    def recibir_a_archivo(self, destino):
        """Escribe el cuerpo de la petición en disco por trozos (sirve para archivos de cientos de MB)."""
        largo = int(self.headers.get("Content-Length") or 0)
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        temporal = destino + ".parte"
        restante = largo
        with open(temporal, "wb") as f:
            while restante > 0:
                trozo = self.rfile.read(min(1024 * 1024, restante))
                if not trozo:
                    break
                f.write(trozo)
                restante -= len(trozo)
        if restante > 0:
            os.remove(temporal)
            raise IOError("la subida se cortó antes de terminar")
        os.replace(temporal, destino)
        return largo

    # ---------- métodos ----------
    def do_OPTIONS(self):
        ok, origen = self.origen_permitido()
        if not ok:
            self.send_response(403)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_response(204)
        self.cabeceras_cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self.atender("GET")

    def do_POST(self):
        self.atender("POST")

    def atender(self, metodo):
        ok, _ = self.origen_permitido()
        if not ok:
            self.error(403, "Esta página no está autorizada para usar la estación de diseño.")
            return
        try:
            url = urlparse(self.path)
            ruta = url.path.rstrip("/") or "/"
            q = {k: v[0] for k, v in parse_qs(url.query).items()}
            if metodo == "GET" and ruta == "/estado":
                return self.estado()
            if metodo == "GET" and ruta == "/config":
                return self.responder_json({"ok": True, "raiz": raiz(), "plotter": carpeta_plotter()})
            if metodo == "POST" and ruta == "/config":
                return self.cambiar_config()
            if metodo == "POST" and ruta == "/trabajo":
                return self.crear_trabajo()
            if metodo == "GET" and ruta == "/trabajo/archivos":
                return self.listar_archivos(q)
            if metodo == "GET" and ruta == "/archivo":
                return self.servir_archivo(q)
            if metodo == "POST" and ruta == "/guardar":
                return self.guardar_archivo(q)
            if metodo == "GET" and ruta == "/plotter/siguiente":
                nombre, n = nombre_plotter()
                return self.responder_json({"ok": True, "nombre": nombre, "consecutivo": n})
            if metodo == "POST" and ruta == "/plotter/guardar":
                return self.guardar_plotter(q)
            if metodo == "POST" and ruta == "/abrir":
                return self.abrir_carpeta()
            self.error(404, "No existe esa opción.")
        except PermissionError as e:
            self.error(403, str(e))
        except ValueError as e:
            self.error(400, str(e))
        except Exception as e:
            traceback.print_exc()
            self.error(500, "Error en la estación de diseño: %s" % e)

    # ---------- opciones ----------
    def estado(self):
        self.responder_json({
            "ok": True, "programa": "Estación de diseño", "version": VERSION,
            "raiz": raiz(), "plotter": carpeta_plotter(),
            "espacioLibreGb": espacio_libre_gb(raiz()),
            "sistema": sys.platform, "python": sys.version.split()[0],
            "librerias": {"pymupdf": hay_libreria("fitz"), "pillow": hay_libreria("PIL")},
        })

    def cambiar_config(self):
        d = self.leer_json()
        nueva_raiz = (d.get("raiz") or "").strip()
        nuevo_plotter = (d.get("plotter") or "").strip()
        if nueva_raiz:
            os.makedirs(nueva_raiz, exist_ok=True)
            CFG["raiz"] = os.path.abspath(nueva_raiz)
        if "plotter" in d:
            if nuevo_plotter:
                os.makedirs(nuevo_plotter, exist_ok=True)
            CFG["plotter"] = os.path.abspath(nuevo_plotter) if nuevo_plotter else ""
        guardar_config(CFG)
        print("[OK] Carpetas actualizadas: trabajos =", raiz(), "| plotter =", carpeta_plotter())
        self.responder_json({"ok": True, "raiz": raiz(), "plotter": carpeta_plotter()})

    def crear_trabajo(self):
        d = self.leer_json()
        carpeta = carpeta_de_trabajo(d.get("ot"), d.get("cliente"))
        creada = not os.path.isdir(carpeta)
        for sub in SUBCARPETAS:
            os.makedirs(os.path.join(carpeta, sub), exist_ok=True)
        ficha = os.path.join(carpeta, "trabajo.json")
        previo = {}
        if os.path.exists(ficha):
            try:
                with open(ficha, encoding="utf-8") as f:
                    previo = json.load(f)
            except Exception:
                previo = {}
        previo.update({"ot": d.get("ot"), "cliente": d.get("cliente"), "datos": d.get("datos") or {},
                       "actualizado": time.strftime("%Y-%m-%d %H:%M:%S")})
        previo.setdefault("creado", previo["actualizado"])
        with open(ficha, "w", encoding="utf-8") as f:
            json.dump(previo, f, ensure_ascii=False, indent=2)
        if creada:
            print("[OK] Carpeta creada:", carpeta)
        rel = os.path.relpath(carpeta, raiz()).replace(os.sep, "/")
        self.responder_json({"ok": True, "ruta": carpeta, "relativa": rel, "creada": creada, "subcarpetas": SUBCARPETAS})

    def listar_archivos(self, q):
        carpeta = ruta_segura(q.get("carpeta", "")) if q.get("carpeta") else carpeta_de_trabajo(q.get("ot"), q.get("cliente"))
        sub = limpiar_nombre(q.get("sub") or "originales")
        base = os.path.join(carpeta, sub)
        if not dentro_de(base, raiz()):
            raise PermissionError("carpeta no permitida")
        archivos = []
        if os.path.isdir(base):
            for n in sorted(os.listdir(base), key=str.lower):
                p = os.path.join(base, n)
                if os.path.isfile(p) and not n.endswith(".parte"):
                    st = os.stat(p)
                    archivos.append({"nombre": n, "bytes": st.st_size, "modificado": int(st.st_mtime),
                                     "ruta": os.path.relpath(p, raiz()).replace(os.sep, "/")})
        self.responder_json({"ok": True, "carpeta": base, "existe": os.path.isdir(base), "archivos": archivos})

    def servir_archivo(self, q):
        absoluta = ruta_segura(q.get("ruta"))
        if not os.path.isfile(absoluta):
            return self.error(404, "No encuentro ese archivo.")
        tamano = os.path.getsize(absoluta)
        inicio, fin, codigo = 0, tamano - 1, 200
        rango = self.headers.get("Range")
        if rango:
            m = re.match(r"bytes=(\d*)-(\d*)", rango)
            if m:
                if m.group(1) != "":
                    inicio = int(m.group(1))
                    fin = int(m.group(2)) if m.group(2) != "" else tamano - 1
                else:                                   # bytes=-N (los últimos N)
                    inicio = max(0, tamano - int(m.group(2)))
                fin = min(fin, tamano - 1)
                if inicio > fin or inicio >= tamano:
                    self.send_response(416)
                    self.send_header("Content-Range", "bytes */%d" % tamano)
                    self.cabeceras_cors()
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                codigo = 206
        largo = fin - inicio + 1
        tipos = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".ai": "application/pdf", ".webp": "image/webp"}
        self.send_response(codigo)
        self.cabeceras_cors()
        self.send_header("Content-Type", tipos.get(os.path.splitext(absoluta)[1].lower(), "application/octet-stream"))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(largo))
        if codigo == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (inicio, fin, tamano))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            with open(absoluta, "rb") as f:
                f.seek(inicio)
                restante = largo
                while restante > 0:
                    trozo = f.read(min(1024 * 1024, restante))
                    if not trozo:
                        break
                    self.wfile.write(trozo)
                    restante -= len(trozo)
        except (BrokenPipeError, ConnectionResetError):
            pass    # el navegador cortó la lectura (normal al leer por partes)

    def guardar_archivo(self, q):
        rel = q.get("ruta") or ""
        destino = ruta_segura(rel)
        if os.path.exists(destino) and q.get("sobrescribir") != "1":
            base, ext = os.path.splitext(destino)
            n = 2
            while os.path.exists("%s (%d)%s" % (base, n, ext)):
                n += 1
            destino = "%s (%d)%s" % (base, n, ext)
        largo = self.recibir_a_archivo(destino)
        print("[OK] Guardado: %s (%.1f MB)" % (destino, largo / 1048576))
        self.responder_json({"ok": True, "ruta": destino, "bytes": largo})

    def guardar_plotter(self, q):
        nombre = limpiar_nombre(q.get("nombre"), 120)
        ext = re.sub(r"[^a-z0-9]", "", (q.get("ext") or "jpg").lower()) or "jpg"
        if not nombre:
            raise ValueError("falta el nombre")
        destino = os.path.join(carpeta_plotter(), "%s.%s" % (nombre, ext))
        if os.path.exists(destino) and q.get("sobrescribir") != "1":
            n = 2
            while os.path.exists(os.path.join(carpeta_plotter(), "%s (%d).%s" % (nombre, n, ext))):
                n += 1
            destino = os.path.join(carpeta_plotter(), "%s (%d).%s" % (nombre, n, ext))
        largo = self.recibir_a_archivo(destino)
        print("[OK] Plotter: %s (%.1f MB)" % (destino, largo / 1048576))
        self.responder_json({"ok": True, "ruta": destino, "bytes": largo})

    def abrir_carpeta(self):
        d = self.leer_json()
        destino = ruta_segura(d["ruta"]) if d.get("relativa") else os.path.abspath(d.get("ruta") or raiz())
        if not (dentro_de(destino, raiz()) or dentro_de(destino, carpeta_plotter())):
            raise PermissionError("carpeta no permitida")
        os.makedirs(destino, exist_ok=True) if not os.path.exists(destino) else None
        if sys.platform.startswith("win"):
            os.startfile(destino)
        elif sys.platform == "darwin":
            os.system('open "%s"' % destino)
        else:
            os.system('xdg-open "%s" >/dev/null 2>&1 &' % destino)
        self.responder_json({"ok": True})


class Servidor(ThreadingHTTPServer):
    """En Windows, 'reuse address' deja abrir dos copias en el mismo puerto; se pide uso exclusivo
    para que la segunda copia avise que ya hay una estación abierta."""
    allow_reuse_address = False

    def server_bind(self):
        if sys.platform.startswith("win"):
            import socket
            try:
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            except Exception:
                pass
        super().server_bind()


def main():
    puerto = int(CFG.get("puerto") or 8793)
    os.makedirs(raiz(), exist_ok=True)
    os.makedirs(carpeta_plotter(), exist_ok=True)
    try:
        servidor = Servidor(("127.0.0.1", puerto), Manejador)
    except OSError:
        print("[X] El puerto %d ya está en uso. ¿Ya tienes abierta la estación de diseño?" % puerto)
        input("Presiona Enter para cerrar…")
        return
    servidor.daemon_threads = True
    print("=" * 60)
    print(" ESTACIÓN DE DISEÑO — Tactical Marketing  (v%s)" % VERSION)
    print("=" * 60)
    print(" Trabajos : ", raiz())
    print(" Plotter  : ", carpeta_plotter())
    print(" Escucha  :  http://127.0.0.1:%d  (solo este computador)" % puerto)
    print(" Espacio libre en disco:", espacio_libre_gb(raiz()), "GB")
    print()
    print(" Deja esta ventana abierta mientras trabajas con las herramientas del ERP.")
    print(" Para cerrar la estación: cierra esta ventana o presiona Ctrl+C.")
    print("=" * 60)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEstación cerrada.")


if __name__ == "__main__":
    main()
