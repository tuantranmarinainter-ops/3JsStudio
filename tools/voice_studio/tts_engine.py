"""Stream Microsoft audio directly, with responsive cancellation and bounded waits."""
import asyncio
import time
import math
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


class SynthesisCancelled(Exception):
    pass


def retry_after(value):
    """Read seconds or an HTTP date without exposing service headers."""
    if not isinstance(value, str):
        return None
    try:
        delay = float(value)
    except ValueError:
        try:
            date = parsedate_to_datetime(value)
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            delay = max(0, (date - datetime.now(timezone.utc)).total_seconds())
        except (ValueError, TypeError, OverflowError):
            return None
    return delay if math.isfinite(delay) and 0 <= delay <= 86400 else None


async def render_speech(text, voice, rate, pitch, volume, audio, subtitle, cancel,
                        log, stage, first_audio_timeout=25, idle_timeout=20,
                        require_subtitles=True):
    import edge_tts

    started = time.perf_counter()
    state = {"first_audio": None, "last_audio": started, "bytes": 0}
    total_timeout = max(120, len(text) / 8 / max(.2, 1 + rate / 100) + 30)

    async def stream():
        communicate = edge_tts.Communicate(
            text, voice, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz", volume=f"{volume:+d}%",
            connect_timeout=8, receive_timeout=idle_timeout)
        subtitles = edge_tts.SubMaker()
        stage("Đang kết nối / chờ âm thanh từ Microsoft")
        log(f"Bắt đầu kết nối; giới hạn kết nối 8s, âm thanh đầu tiên {first_audio_timeout}s, chờ dữ liệu {idle_timeout}s.")
        with Path(audio).open("wb") as target:
            async for chunk in communicate.stream():
                if cancel.is_set():
                    raise SynthesisCancelled()
                if chunk["type"] == "audio":
                    now = time.perf_counter()
                    if state["first_audio"] is None:
                        state["first_audio"] = now
                        log(f"Nhận âm thanh đầu tiên sau {now - started:.3f}s.")
                        stage("Đang nhận âm thanh")
                    state["last_audio"] = now
                    state["bytes"] += len(chunk["data"])
                    target.write(chunk["data"])
                elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                    subtitles.feed(chunk)
        if not state["bytes"]:
            raise RuntimeError("Microsoft không trả về âm thanh.")
        srt = subtitles.get_srt()
        if require_subtitles and not srt.strip():
            raise RuntimeError("Microsoft không trả về phụ đề. Hãy thử lại.")
        if srt.strip():
            Path(subtitle).write_text(srt, encoding="utf-8")
        log(f"Nhận xong {state['bytes']:,} byte và {len(subtitles.cues)} mục phụ đề trong {time.perf_counter() - started:.3f}s.")
        return state["bytes"]

    task = asyncio.create_task(stream())
    try:
        while True:
            if cancel.is_set():
                raise SynthesisCancelled()
            done, _ = await asyncio.wait({task}, timeout=0.05)
            if done:
                if cancel.is_set():
                    raise SynthesisCancelled()
                return await task
            now = time.perf_counter()
            if state["first_audio"] is None and now - started > first_audio_timeout:
                raise TimeoutError(f"Microsoft chưa gửi âm thanh sau {first_audio_timeout}s. Kiểm tra Internet hoặc thử lại.")
            if state["first_audio"] is not None and now - state["last_audio"] > idle_timeout:
                raise TimeoutError(f"Không nhận thêm âm thanh trong {idle_timeout}s. Kết nối có thể bị gián đoạn.")
            if now - started > total_timeout:
                raise TimeoutError(f"Quá thời gian xử lý tối đa {total_timeout:.0f}s.")
    finally:
        if not task.done():
            task.cancel()
        await asyncio.gather(task, return_exceptions=True)
