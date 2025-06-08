#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
批量抓取 cclcat 对话：
- 模式 1：全量重爬（qid/title/text/audio1/audio2/type/date）
- 模式 2：仅补 type/date（基于已有 result.xlsx）
- 保留：日志输出、Ctrl-C 容错、SAVE_EVERY_PAGE 增量落盘
"""

import os, re, time, sys, traceback, requests, pandas as pd
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from tqdm import tqdm

# ============ 基本配置 ============ #
BASE_LIST_URL = "https://cclcat.com/dialogs?page={}"  # page=1..15
PAGES = range(1, 16)
COOKIE_STR = (
    "__Host-authjs.csrf-token=4aa46f7b20e87571898e527f534738ccc1516a5038c9d5922ef0d918ba93942c%7Cfd4a1367ffc6636624010509e8654b7e10d4681487bdb9c4238bee0f2917f336; __Secure-authjs.callback-url=https%3A%2F%2Fcclcat.com%2Fdialogs; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiVmp5T3gzY2Ryb0VBSkJkRkY5d3k0eDVtQXRBZzFkeUZMQ01MWWFvZzF0eGlldzNSUmNfLUJaLVBQb19DMHotTWN5bGFtWVNncThCS0h3bWowV0JrZmcifQ..p63woJDKyRA97cR8Yy54dw.u3IEjDwTM13SNe3E5xAwKUF8rkKZvubU5Fb-vOUai8Z_KFD_LfEEkwMAr1bdN03QJhDKAxa84FxP2aVdwHA-3uW6h7VPS_6JAagGXa7cc9KR5wDki-1ayPlplRaZZQcg3RJ6TNa3NN_DiKin3xoa8oDcR43oyUzHFCGYvRMfIYmWmqZeKVmz8jO3De-Sk2Ufqal9K9rxEc6rDg9It5GXbo1Auk86weHgBeGbPqYoR5bwmjeQpxzIG6N8dXd_l8PvazZ-Iq6WYEL6eHxvxsBGHYAFHn0GVFpCA1trf1DBqVrVDq4iNhiTVRq5uCYDYHzCdUdxOuz2daWR6KuyMiKlv71RovzwH9VVsUEn6A0VcSvw0-Iil-cgO8WW9-fs_vsF.e2TkR8ZDauLBS0mtZVXcqd6EvJJIm0tDRaUQ1d0bWvk"
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/126.0 Safari/537.36",
    "Cookie": COOKIE_STR,
}
TIMEOUT = 20
RETRY = 3
SAVE_EVERY_PAGE = False  # True → 每爬完一页立即写 Excel
# ---------- 选择器 ---------- #
SEL_TEXT = ("span.ml-2.select-none.whitespace-pre-wrap.text-wrap."
            "text-left.text-sm.text-gray-800")
SEL_TITLE = "span.line-clamp-2.font-bold"
SEL_QID = "span.shrink-0.text-sm"
SEL_TYPE = "span.bg-lime-100.text-lime-600"  # 类别
SEL_DATE = "span.bg-amber-100.text-amber-600"  # 日期
EXTRA_MENTION = "div.bg-yellow-200 p.text-sm" # 额外提示

A_FILTER = ("peer", "absolute")  # 列表页 <a> 必须含的类
# -------------------------------- #

DL_ROOT = "downloads"
EXCEL = "result.xlsx"
os.makedirs(DL_ROOT, exist_ok=True)


def slugify(txt, maxlen=40):
    return re.sub(r"[^\w\-]+", "_", txt).strip("_")[:maxlen] or "audio"


# ---------- 列表页 ---------- #
def list_dialog_urls(page_url: str) -> list[str]:
    html = requests.get(page_url, headers=HEADERS, timeout=TIMEOUT).text
    soup = BeautifulSoup(html, "html.parser")

    def cls_ok(c): return c and all(k in c.split() for k in A_FILTER)

    return [urljoin(page_url, a["href"]) for a in soup.find_all("a", class_=cls_ok) if a.get("href")]


# ---------- 下载工具 ---------- #
def download_file(url: str, path: str) -> bool:
    for attempt in range(1, RETRY + 1):
        try:
            with requests.get(url, headers=HEADERS, stream=True, timeout=TIMEOUT) as r:
                r.raise_for_status()
                total = int(r.headers.get("content-length", 0))
                with open(path, "wb") as f, tqdm(total=total, unit="B", unit_scale=True,
                                                 desc=os.path.basename(path), leave=False) as bar:
                    for chunk in r.iter_content(8192):
                        f.write(chunk);
                        bar.update(len(chunk))
            return True
        except Exception as e:
            print(f"  ⚠️  第{attempt}次下载失败：{e}")
            time.sleep(2)
    return False


# ---------- 对话页 ---------- #
def crawl_dialog(url: str, need_audio=True) -> list[dict]:
    """返回该页所有行。need_audio=False 时只抓 type/date，不下载音频"""
    print(f"\n↻ 对话页 {url}")
    html = requests.get(url, headers=HEADERS, timeout=TIMEOUT).text
    soup = BeautifulSoup(html, "html.parser")
    t_spans = soup.select(SEL_TEXT)

    # 同一页 type/date 相同，提前取
    type_txt = soup.select_one(SEL_TYPE)
    date_txt = soup.select_one(SEL_DATE)
    extra_mention_txt = soup.select_one(EXTRA_MENTION)

    type_txt = type_txt.get_text(strip=True) if type_txt else ""
    date_txt = date_txt.get_text(strip=True) if date_txt else ""
    extra_mention_txt = extra_mention_txt.get_text(strip=True) if extra_mention_txt else ""

    rows = []
    for idx, t in enumerate(t_spans, 1):
        text = t.get_text(strip=True)
        title = t.find_previous("span", class_=lambda c: c and "line-clamp-2" in c.split())
        qid = t.find_previous("span", class_=lambda c: c and "shrink-0" in c.split())
        qid = (qid.get_text(strip=True) if qid else "").rstrip(".")

        aud1 = aud2 = ""
        if need_audio:
            # 找两段音频
            audios, node = [], t
            while len(audios) < 2 and node:
                node = node.find_next(["source", "span", "div"])
                if node and node.name == "source" and node.get("src"):
                    audios.append(urljoin(url, node["src"]))

            qdir = os.path.join(DL_ROOT, qid);
            os.makedirs(qdir, exist_ok=True)
            rels = []
            for i, src in enumerate(audios, 1):
                ext = os.path.splitext(urlparse(src).path)[-1] or ".m4a"
                fname = f"{idx:03d}_{i}_{slugify(text)}{ext}"
                fpath = os.path.join(qdir, fname)
                rels.append(f"/{qid}/{fname}" if download_file(src, fpath) else "")
            aud1, aud2 = (rels + ["", ""])[:2]

        print(f"[{idx:03d}] {qid} | {title.get_text(strip=True)[:20] if title else ''} | {text[:20]}")
        rows.append(dict(
            qid=qid, title=title.get_text(strip=True) if title else "",
            text=text, audio1=aud1, audio2=aud2,
            type=type_txt, date=date_txt,
            extraMention=extra_mention_txt,
        ))
    return rows


# ---------- Excel ---------- #
def save_rows(rows):
    df = pd.DataFrame(rows)
    cols = ["qid", "title", "text", "audio1", "audio2", "type", "date", "extraMention"]
    df = df.reindex(columns=cols)
    df.to_excel(EXCEL, index=False)
    print(f"💾 已保存 {len(df)} 条 → {EXCEL}")


# ================= 主流程 ================= #
if __name__ == "__main__":
    mode = input("选择模式 (1=全量重爬, 2=仅补 type/date): ").strip()
    if mode not in ("1", "2"):
        sys.exit("❌ 必须输入 1 或 2")

    dialog_urls = []
    for p in PAGES:
        urls = list_dialog_urls(BASE_LIST_URL.format(p))
        print(f"📄 page {p:02d} → {len(urls)} 条")
        dialog_urls.extend(urls)

    all_rows = []

    try:
        if mode == "1":
            # —— 全量重爬 —— #
            for idx, url in enumerate(dialog_urls, 1):
                all_rows.extend(crawl_dialog(url, need_audio=True))
                if SAVE_EVERY_PAGE:
                    save_rows(all_rows)

        else:
            # —— 仅补 type/date —— #
            if not os.path.exists(EXCEL):
                sys.exit("❌ 未找到 result.xlsx，无法补充")

            # 1) 把 qid 强制读成字符串；顺便把空串处理成 NaN 方便判断
            # 强制将qid列读取为str，避免数据类型问题
            df = pd.read_excel(EXCEL, dtype={"qid": str}).fillna("")

            # 2) 只挑出 type 或 date 或 extraMention 缺失的行
            mask_need = (df["type"] == "") | (df["date"] == "") | (df["extraMention"] == "")

            q_need = set(df.loc[mask_need, "qid"])
            print(f"👉 共有 {len(df)} 条记录，其中 {mask_need.sum()} 条缺少 type/date，开始补爬…")

            fetched = {}  # qid → (type, date)
            hit_total = 0

            for url in dialog_urls:
                page_hit = 0
                print(f"\n🌐 扫描页面：{url}")
                for row in crawl_dialog(url, need_audio=False):

                    qid = row["qid"]

                    print("aaaàaaaaaaaaaaaaaaaaaa")
                    print(qid)

                    if qid in q_need:
                        fetched[qid] = (row["type"], row["date"], row["extraMention"])
                        page_hit += 1
                        hit_total += 1
                        print(f"  ✔ 命中 qid={qid:<10} "
                              f"type='{row['type']}'  date='{row['date']}' extraMention='{row['extraMention']}'")
                print(f"  — 页面命中 {page_hit} 条")

            print(f"\n✅ 抓取完毕，累计补到 {hit_total} 条（dict 大小={len(fetched)}）")


            # 3) 把抓到的内容写回——只覆盖原本缺失的位置
            def fill(col_idx):  # 0 -> type, 1 -> date
                return df.loc[mask_need, "qid"].map(lambda q: fetched.get(q, ("", "", ""))[col_idx])


            df.loc[mask_need, "type"] = fill(0)
            df.loc[mask_need, "date"] = fill(1)
            df.loc[mask_need, "extraMention"] = fill(2)

            # 4) 统计收尾
            left_type = df["type"].isna().sum()
            left_date = df["date"].isna().sum()
            left_extra = df["extraMention"].isna().sum()
            print(f"🔍 补完后仍剩 type 缺失 {left_type} 条、date 缺失 {left_date} 条, extraMention 缺失 {left_extra}条")

            # 5) 保存（用临时文件保证安全）
            tmp = "result_tmp.xlsx"
            df.to_excel(tmp, index=False)
            os.replace(tmp, EXCEL)
            print(f"💾 已保存到 {EXCEL}")
            all_rows = df.to_dict("records")

    except KeyboardInterrupt:
        print("\n⏹️  手动终止，保存已抓内容…")
    except Exception as e:
        print("\n💥  异常：", e)
        traceback.print_exc()
    finally:
        save_rows(all_rows)
        print("🏁 结束，音频文件位于 downloads/{qid}/")
