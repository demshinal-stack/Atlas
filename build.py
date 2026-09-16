#!/usr/bin/env python3
"""
Сборка «Атласа».

Справочники (города, отели, достопримечательности) лежат в data/ и
на сервер уезжают отдельными файлами: приложение забирает их по
надобности, а пользователь может оставить их на телефоне.

    python3 build.py           # проверить данные и показать сводку
    python3 build.py --check   # только проверка
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).parent
DATA = ROOT / "data"
FILES = {
    "cities.txt": ("Города", "страна|город;город"),
    "hotels.txt": ("Отели", "город|отель*звёзды;отель*звёзды"),
    "sights.txt": ("Места", "страна|место@город;место@город"),
}


def check():
    ok = True
    total = 0
    for name, (title, fmt) in FILES.items():
        p = DATA / name
        if not p.exists():
            print(f"  ✗ {name}: файла нет")
            ok = False
            continue
        body = p.read_text(encoding="utf-8").strip("\n")
        bad = [
            i + 1
            for i, line in enumerate(body.split("\n"))
            if line.strip() and "|" not in line
        ]
        if bad:
            print(f"  ✗ {name}: строки без разделителя: {bad[:5]}")
            ok = False
            continue
        rows = len([l for l in body.split("\n") if l.strip()])
        items = sum(
            len(l.split("|", 1)[1].split(";")) for l in body.split("\n") if "|" in l
        )
        size = len(body.encode("utf-8")) / 1024
        total += size
        print(f"  ✓ {title}: {items} записей в {rows} строках, {size:.1f} КБ")
    print(f"\n  всего справочников: {total:.0f} КБ")
    print(f"  по сети со сжатием: примерно {total / 4:.0f} КБ")
    return ok


if __name__ == "__main__":
    print("Справочники в data/:")
    ok = check()
    print("\nФормат строк:")
    for name, (title, fmt) in FILES.items():
        print(f"  {name}: {fmt}")
    sys.exit(0 if ok else 1)
