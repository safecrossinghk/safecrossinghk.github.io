"""
抓取 Open-Meteo ECMWF AIFS 模式的網格氣象資料
- 端點: https://api.open-meteo.com/v1/ecmwf
- 模型參數: models=ecmwf_aifs025 (ECMWF AIFS 0.25°, deterministic, 6 小時原生解析度)
- 變數: pressure_msl (海平面氣壓, hPa), wind_speed_10m (10米風速, km/h)
  注意: 正確變數名稱是 pressure_msl，不是 mean_sea_level_pressure，
  用錯會得到 "Cannot initialize ... from invalid String value" 的錯誤。
- 範圍: 可自訂經緯度範圍與網格解析度
- 時長: forecast_days 最多可到 15 天 (AIFS 原生預報長度)

兩個重要的資料特性:

1. Rate limit / 併發控制
   Open-Meteo 免費版沒有 API key，對高頻率 / 高併發連線敏感。
   當網格點數一多 (例如 0.25 度網格可能上百個批次)，若無控制地
   同時發送所有請求，容易觸發 429 Too Many Requests 甚至被暫時封鎖。
   這裡改用「併發數量受限的非同步請求」:
     - asyncio.Semaphore 限制同時在飛的請求數 (等同 JS 的
       Promise.all + concurrency limiter，而不是無限制的 Promise.all)
     - 每個請求之間加入固定的 dispatch 間隔 (debounce)
     - 遇到 429 / 網路錯誤時使用指數退避 (exponential backoff + jitter) 重試

2. 6 小時原生解析度
   ECMWF AIFS 在 ECMWF 內部的原生輸出時間步長是 6 小時
   (00 / 06 / 12 / 18 UTC)。Open-Meteo 的 API 為了讓所有模式的資料格式一致，
   會把它「正規化」成逐小時陣列回傳，但兩個 6 小時整點之間的每一個「小時」
   數值其實是 Open-Meteo 自己內插出來的，不是新的獨立觀測。
   如果直接對逐小時資料做「每小時找氣壓最低點」，等於在對內插雜訊做偵測，
   算出來的路徑會抖動、缺乏物理意義。
   因此這裡的策略是:
     - 先篩出真正的 6 小時原生節點 (filter_native_timesteps)
     - 在原生節點上計算低壓中心 (track_low_pressure_centers)
     - 如果視覺化需要更平滑的路徑，另外用線性內插產生中介點
       (interpolate_track)，並清楚標記哪些是「內插出來的」點
"""

import asyncio
import random
import time
from datetime import datetime

import aiohttp
import requests

API_URL = "https://api.open-meteo.com/v1/ecmwf"

# ECMWF AIFS 在 Open-Meteo 上的原生時間解析度 (小時)
AIFS_NATIVE_STEP_HOURS = 6

# 熱帶氣旋強度分級標準 (參考 WMO / 香港天文台的分級方式，10 分鐘平均風速，km/h)
# 用來決定「風速符合風暴標準」的門檻，可依需求選用不同等級
STORM_INTENSITY_THRESHOLDS_KMH = {
    "tropical_depression": 41,   # 熱帶低氣壓
    "tropical_storm": 63,        # 熱帶風暴
    "severe_tropical_storm": 88, # 強烈熱帶風暴
    "typhoon": 118,              # 颱風
}


def classify_storm_intensity(wind_speed_kmh: float) -> str:
    """依 10 分鐘平均風速 (km/h) 回傳熱帶氣旋強度等級文字。"""
    if wind_speed_kmh is None:
        return "unknown"
    if wind_speed_kmh >= STORM_INTENSITY_THRESHOLDS_KMH["typhoon"]:
        return "typhoon"
    if wind_speed_kmh >= STORM_INTENSITY_THRESHOLDS_KMH["severe_tropical_storm"]:
        return "severe_tropical_storm"
    if wind_speed_kmh >= STORM_INTENSITY_THRESHOLDS_KMH["tropical_storm"]:
        return "tropical_storm"
    if wind_speed_kmh >= STORM_INTENSITY_THRESHOLDS_KMH["tropical_depression"]:
        return "tropical_depression"
    return "below_depression"


# ============================================================
# 網格 & 批次工具
# ============================================================

def build_grid(lat_min: float, lat_max: float, lon_min: float, lon_max: float, step: float = 1.0):
    """建立網格點列表 (含邊界)。"""
    lats, lons = [], []
    lat = lat_min
    while lat <= lat_max + 1e-9:
        lon = lon_min
        while lon <= lon_max + 1e-9:
            lats.append(round(lat, 4))
            lons.append(round(lon, 4))
            lon += step
        lat += step
    return lats, lons


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def _build_params(lat_batch, lon_batch, hourly_vars, models, forecast_days):
    return {
        "latitude": ",".join(str(v) for v in lat_batch),
        "longitude": ",".join(str(v) for v in lon_batch),
        "hourly": ",".join(hourly_vars),
        "models": models,
        "forecast_days": forecast_days,
        "timezone": "auto",
    }


# ============================================================
# 非同步版本 (建議用這個): 併發數量受限 + 退避重試
# ============================================================

async def _fetch_one_batch_async(session, semaphore, params, batch_label,
                                  max_retries=5, timeout=30):
    """
    抓取單一批次，遇到 429 / 逾時 / 連線錯誤時做指數退避重試。
    semaphore 確保同時間最多只有 N 個請求在飛，避免瞬間灌爆 Open-Meteo。
    """
    async with semaphore:
        for attempt in range(max_retries):
            try:
                async with session.get(
                    API_URL, params=params,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as resp:
                    if resp.status == 429:
                        wait = min(30, (2 ** attempt)) + random.uniform(0, 1)
                        print(f"[{batch_label}] 429 Too Many Requests，"
                              f"{wait:.1f}s 後重試 (第 {attempt + 1} 次)")
                        await asyncio.sleep(wait)
                        continue

                    if resp.status >= 500:
                        wait = min(20, (2 ** attempt)) + random.uniform(0, 1)
                        print(f"[{batch_label}] 伺服器錯誤 HTTP {resp.status}，"
                              f"{wait:.1f}s 後重試")
                        await asyncio.sleep(wait)
                        continue

                    resp.raise_for_status()
                    data = await resp.json()
                    return data if isinstance(data, list) else [data]

            except (asyncio.TimeoutError, aiohttp.ClientError) as e:
                wait = min(20, (2 ** attempt)) + random.uniform(0, 1)
                print(f"[{batch_label}] 連線錯誤 ({e})，{wait:.1f}s 後重試")
                await asyncio.sleep(wait)

        raise RuntimeError(f"[{batch_label}] 已超過最大重試次數 ({max_retries})，放棄此批次")


async def fetch_ecmwf_grid_async(
    lat_min: float = 10,
    lat_max: float = 30,
    lon_min: float = 110,
    lon_max: float = 140,
    step: float = 1.0,
    forecast_days: int = 5,
    hourly_vars=("pressure_msl", "wind_speed_10m"),
    models: str = "ecmwf_aifs025",
    batch_size: int = 80,       # 每次請求打包的點數
    max_concurrent: int = 4,    # 同時間最多幾個請求在飛 (等同 concurrency limiter)
    dispatch_interval: float = 0.3,  # 每次「送出」下一個請求前的最小間隔 (debounce)
    timeout: int = 30,
):
    """
    非同步版本，建議用於網格點數較多的情境 (例如高解析度網格 / 定位風暴時
    需要密集掃描多個時間步長)。用 asyncio.Semaphore 限制同時併發數，
    並在每次派送新請求前加入固定間隔，整體效果等同於 JS 裡
    「Promise.all + concurrency limiter + debounce」的組合，
    而不是一次性把幾百個請求全部丟出去。

    回傳: list[dict]，同 fetch_ecmwf_grid()。
    """
    lats, lons = build_grid(lat_min, lat_max, lon_min, lon_max, step)
    lat_batches = list(chunked(lats, batch_size))
    lon_batches = list(chunked(lons, batch_size))
    total_batches = len(lat_batches)

    print(f"網格點總數: {len(lats)} -> 分成 {total_batches} 個批次 "
          f"(每批最多 {batch_size} 點, 最大併發數 {max_concurrent})")

    semaphore = asyncio.Semaphore(max_concurrent)
    results = []

    async with aiohttp.ClientSession() as session:
        tasks = []
        for i, (lat_batch, lon_batch) in enumerate(zip(lat_batches, lon_batches), start=1):
            params = _build_params(lat_batch, lon_batch, hourly_vars, models, forecast_days)
            label = f"批次 {i}/{total_batches}"
            tasks.append(asyncio.create_task(
                _fetch_one_batch_async(session, semaphore, params, label, timeout=timeout)
            ))
            # 派送節流: 就算 semaphore 還有名額，也不要瞬間把所有 task 一次建立送出
            if i < total_batches:
                await asyncio.sleep(dispatch_interval)

        completed = await asyncio.gather(*tasks, return_exceptions=True)

    for i, batch_result in enumerate(completed, start=1):
        if isinstance(batch_result, Exception):
            print(f"[批次 {i}] 最終失敗，已略過: {batch_result}")
            continue
        results.extend(batch_result)
        print(f"[批次 {i}/{total_batches}] 成功取得 {len(batch_result)} 個點")

    return results


# ============================================================
# 同步版本 (備用): 序列請求 + 429 退避，適合簡單腳本 / 除錯用
# ============================================================

def fetch_ecmwf_grid(
    lat_min: float = 10,
    lat_max: float = 30,
    lon_min: float = 110,
    lon_max: float = 140,
    step: float = 1.0,
    forecast_days: int = 5,
    hourly_vars=("pressure_msl", "wind_speed_10m"),
    models: str = "ecmwf_aifs025",
    batch_size: int = 80,
    timeout: int = 30,
    sleep_between_requests: float = 1.0,   # 批次間固定延遲 (debounce)
    max_retries: int = 5,
):
    """
    同步 (序列) 版本。適合網格點數不多、或想要最單純好除錯的情境。
    大量網格點建議改用 fetch_ecmwf_grid_async。
    """
    lats, lons = build_grid(lat_min, lat_max, lon_min, lon_max, step)
    lat_batches = list(chunked(lats, batch_size))
    lon_batches = list(chunked(lons, batch_size))
    total_batches = len(lat_batches)

    print(f"網格點總數: {len(lats)} -> 分成 {total_batches} 個批次 (序列請求，每批間隔 {sleep_between_requests}s)")

    results = []
    for i, (lat_batch, lon_batch) in enumerate(zip(lat_batches, lon_batches), start=1):
        params = _build_params(lat_batch, lon_batch, hourly_vars, models, forecast_days)

        data = None
        for attempt in range(max_retries):
            resp = requests.get(API_URL, params=params, timeout=timeout)

            if resp.status_code == 429:
                wait = min(30, (2 ** attempt)) + random.uniform(0, 1)
                print(f"[批次 {i}] 429 Too Many Requests，{wait:.1f}s 後重試")
                time.sleep(wait)
                continue

            if resp.status_code >= 500:
                wait = min(20, (2 ** attempt)) + random.uniform(0, 1)
                print(f"[批次 {i}] 伺服器錯誤 HTTP {resp.status_code}，{wait:.1f}s 後重試")
                time.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()
            break

        if data is None:
            print(f"[批次 {i}] 已超過最大重試次數，略過此批次")
            continue

        if isinstance(data, dict):
            data = [data]

        results.extend(data)
        print(f"[批次 {i}/{total_batches}] 成功取得 {len(data)} 個點")

        if sleep_between_requests and i < total_batches:
            time.sleep(sleep_between_requests)

    return results


# ============================================================
# 資料整理
# ============================================================

def to_flat_records(results):
    """把巢狀的 JSON 結果攤平成 (lat, lon, time, mslp, wind_speed) 的列表。"""
    records = []
    for point in results:
        lat = point.get("latitude")
        lon = point.get("longitude")
        hourly = point.get("hourly", {})
        times = hourly.get("time", [])
        mslp = hourly.get("pressure_msl", [])
        wind = hourly.get("wind_speed_10m", [])

        for t, p, w in zip(times, mslp, wind):
            records.append({
                "latitude": lat,
                "longitude": lon,
                "time": t,
                "pressure_msl": p,
                "wind_speed_10m": w,
            })
    return records


def filter_native_timesteps(records, step_hours: int = AIFS_NATIVE_STEP_HOURS):
    """
    只保留 AIFS 真正的原生時間節點 (預設每 6 小時一個: 00/06/12/18 UTC)，
    濾掉 Open-Meteo 為了統一格式而內插出來的中間小時，避免用內插雜訊
    誤判低壓中心位置。

    判斷方式: 取所有 time 中最早的時間點為基準，之後每個 time 只要
    距離基準的小時數是 step_hours 的整數倍，就視為原生節點。
    """
    if not records:
        return records

    times = sorted({r["time"] for r in records})
    base = datetime.fromisoformat(times[0])

    native_times = set()
    for t in times:
        dt = datetime.fromisoformat(t)
        delta_hours = (dt - base).total_seconds() / 3600
        if abs(delta_hours - round(delta_hours / step_hours) * step_hours) < 1e-6:
            native_times.add(t)

    filtered = [r for r in records if r["time"] in native_times]
    print(f"原生 {step_hours} 小時節點篩選: {len(times)} 個時間點 -> {len(native_times)} 個原生節點, "
          f"{len(records)} 筆資料 -> {len(filtered)} 筆")
    return filtered


def track_low_pressure_centers(
    records,
    wind_threshold_kmh: float = STORM_INTENSITY_THRESHOLDS_KMH["tropical_depression"],
    native_step_hours: int = AIFS_NATIVE_STEP_HOURS,
    use_native_steps_only: bool = True,
):
    """
    分析每個時間步長，在「風速符合風暴標準」的所有網格點中，
    找出「海平面氣壓最低」的點，組成一條時間序列 (風暴中心預測路徑)。

    參數:
        records: to_flat_records() 產生的攤平列表
        wind_threshold_kmh: 篩選門檻，預設採用熱帶低氣壓標準 41 km/h
            (可視需求改用 STORM_INTENSITY_THRESHOLDS_KMH 裡的其他等級，
            例如熱帶風暴 63 km/h、颱風 118 km/h)
        native_step_hours: AIFS 原生時間解析度，預設 6 小時
        use_native_steps_only: True (預設) 時，會先呼叫
            filter_native_timesteps() 只保留真正的 6 小時節點再計算,
            避免對 Open-Meteo 內插出來的中間小時做偵測。
            若想在逐小時資料上直接分析 (不建議，僅供比較)，可設為 False。

    回傳:
        list[dict]，依時間排序:
        [{"time", "lat", "lng", "min_pressure", "max_wind_speed", "intensity"}, ...]
    """
    if use_native_steps_only:
        records = filter_native_timesteps(records, step_hours=native_step_hours)

    groups = {}
    for r in records:
        if r["wind_speed_10m"] is None or r["pressure_msl"] is None:
            continue
        if r["wind_speed_10m"] <= wind_threshold_kmh:
            continue
        groups.setdefault(r["time"], []).append(r)

    track = []
    for t, points in groups.items():
        best = min(points, key=lambda r: r["pressure_msl"])
        track.append({
            "time": t,
            "lat": best["latitude"],
            "lng": best["longitude"],
            "min_pressure": best["pressure_msl"],
            "max_wind_speed": best["wind_speed_10m"],
            "intensity": classify_storm_intensity(best["wind_speed_10m"]),
        })

    track.sort(key=lambda x: x["time"])
    return track


def interpolate_track(track, interval_minutes: int = 60):
    """
    對「6 小時原生節點」算出來的低壓中心路徑做線性內插，
    產生更密集的中介點，方便地圖動畫更平滑地移動。

    注意: 這些內插點是為了視覺呈現而生成的，不代表模式真的輸出了
    這些時間點的資料，每筆內插點都會標記 "interpolated": True，
    真正的原生節點則標記 "interpolated": False，方便前端區分。

    參數:
        track: track_low_pressure_centers() 產生的路徑 (依時間排序)
        interval_minutes: 內插後的目標間隔 (分鐘)，預設 60 分鐘

    回傳:
        list[dict]: [{"time", "lat", "lng", "min_pressure", "interpolated"}, ...]
    """
    if len(track) < 2:
        return [{**p, "interpolated": False} for p in track]

    result = []
    for i in range(len(track) - 1):
        a, b = track[i], track[i + 1]
        t_a = datetime.fromisoformat(a["time"])
        t_b = datetime.fromisoformat(b["time"])
        total_minutes = (t_b - t_a).total_seconds() / 60

        steps = max(1, int(total_minutes // interval_minutes))
        result.append({**a, "interpolated": False})

        for s in range(1, steps):
            ratio = s / steps
            t_interp = t_a.timestamp() + (t_b.timestamp() - t_a.timestamp()) * ratio
            interp_wind = a["max_wind_speed"] + (b["max_wind_speed"] - a["max_wind_speed"]) * ratio
            result.append({
                "time": datetime.fromtimestamp(t_interp).isoformat(timespec="minutes"),
                "lat": a["lat"] + (b["lat"] - a["lat"]) * ratio,
                "lng": a["lng"] + (b["lng"] - a["lng"]) * ratio,
                "min_pressure": a["min_pressure"] + (b["min_pressure"] - a["min_pressure"]) * ratio,
                "max_wind_speed": interp_wind,
                "intensity": classify_storm_intensity(interp_wind),
                "interpolated": True,
            })

    result.append({**track[-1], "interpolated": False})
    return result


# ============================================================
# 主流程範例
# ============================================================

if __name__ == "__main__":
    # 建議做法: 非同步 + 併發限制 + 退避重試
    results = asyncio.run(fetch_ecmwf_grid_async(
        lat_min=10, lat_max=30,
        lon_min=110, lon_max=140,
        step=1.0,
        forecast_days=5,
        max_concurrent=4,        # 同時最多 4 個請求在飛
        dispatch_interval=0.3,   # 每個請求至少間隔 0.3 秒才送出下一個
    ))

    records = to_flat_records(results)
    print(f"共取得 {len(records)} 筆逐小時資料")

    try:
        import pandas as pd
        df = pd.DataFrame(records)
        df.to_csv("ecmwf_aifs_grid_forecast.csv", index=False)
        print("已存成 ecmwf_aifs_grid_forecast.csv")
    except ImportError:
        print("未安裝 pandas，略過存成 CSV 的步驟")

    # 只用 6 小時原生節點計算風暴路徑 (避免內插雜訊，預設用熱帶低氣壓風速標準)
    track = track_low_pressure_centers(records)
    print(f"共產生 {len(track)} 個 6 小時原生節點的風暴中心軌跡點")
    for point in track[:5]:
        print(point)

    # 視覺化用: 對路徑做內插，產生更平滑的動畫路徑 (每 60 分鐘一個點)
    smooth_track = interpolate_track(track, interval_minutes=60)
    print(f"內插後共 {len(smooth_track)} 個路徑點 (含原生 + 內插)")
