"""Bounded Edge/CapCut jobs with verified segments; no provider fallback."""
import asyncio
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
import time
import wave
from xml.sax.saxutils import escape

import aiohttp
import edge_tts
import miniaudio
from tts_engine import render_speech, SynthesisCancelled, retry_after

VERSION = 2


def digest(path):
    with Path(path).open('rb') as f:
        hash_value = hashlib.sha256()
        for block in iter(lambda: f.read(65536), b''):
            hash_value.update(block)
        return hash_value.hexdigest()


def legacy_split_text(text, limit=3200):
    """Keep text exactly; bound bytes after XML escaping, prefer sentence ends."""
    if limit < 12:
        raise ValueError('Segment limit too small')
    parts, start = [], 0
    while start < len(text):
        end, size = start, 0
        while end < len(text):
            cost = len(escape(text[end]).encode('utf-8'))
            if size + cost > limit:
                break
            size += cost
            end += 1
        if end < len(text):
            window = text[start:end]
            boundaries = list(re.finditer(r'[.!?。！？][\"\u201d\u2019\)]*(?:\s+|$)', window))
            if boundaries:
                natural = start + boundaries[-1].end()
            else:
                spaces = list(re.finditer(r'\s+', window))
                natural = start + spaces[-1].end() if spaces else end
            if natural > start + (end - start) // 2:
                end = natural
        if end <= start:
            raise ValueError('Cannot segment text')
        parts.append(text[start:end])
        start = end
    return parts


def split_text(text, limit=3200, *, characters=False, target=None):
    """Preserve text; prefer paragraphs/sentences within the service's budget."""
    target = target or limit
    if not 12 <= target <= limit:
        raise ValueError('Segment limit too small')
    abbreviations = {'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'st', 'vs', 'etc',
                     'e.g', 'i.e', 'tp', 'ts', 'ths', 'pgs', 'gs', 'bs', 'q', 'p'}
    parts, start = [], 0
    while start < len(text):
        end, size, preferred = start, 0, start
        while end < len(text):
            cost = 1 if characters else len(escape(text[end]).encode('utf-8'))
            if size + cost > limit:
                break
            size += cost
            end += 1
            if size <= target:
                preferred = end
        if end == len(text) and size <= target:
            cut = end
        else:
            window = text[start:end]
            ceiling = preferred - start
            floor = ceiling // 2
            paragraphs = [m.end() for m in re.finditer(r'\r?\n[ \t]*\r?\n\s*', window)]
            sentences = []
            for match in re.finditer(r'[.!?。！？][\"\u201d\u2019\)]*(?:\s+|$)', window):
                punctuation = match.start()
                if window[punctuation] == '.':
                    token = re.search(r'([\w.]+)$', window[:punctuation])
                    if token and (token[1].lower() in abbreviations or
                                  len(token[1]) == 1 and token[1].isalpha()):
                        continue
                    # A window ending inside a decimal/version is not a sentence end.
                    absolute = start + punctuation
                    if absolute and absolute+1 < len(text) and text[absolute-1].isdigit() and text[absolute+1].isdigit():
                        continue
                sentences.append(match.end())
            cut = None
            for boundaries in (paragraphs, sentences):
                candidates = [b for b in boundaries if floor < b <= ceiling]
                if candidates:
                    cut = start + candidates[-1]
                    break
            if cut is None and characters:
                candidates = [b for b in paragraphs + sentences if b > ceiling]
                if candidates:
                    cut = start + min(candidates)
            if cut is None:
                clauses = [m.end() for m in re.finditer(r'[,;:，；：](?:\s+|$)', window[:ceiling])]
                spaces = [m.end() for m in re.finditer(r'\s+', window[:ceiling])]
                candidates = [b for b in clauses if b > floor] or spaces
                while candidates:
                    token = re.search(r'([\w.]+)\s*$', window[:candidates[-1]])
                    word = token[1].rstrip('.') if token else ''
                    if not token or not token[1].endswith('.') or not (
                            word.lower() in abbreviations or len(word) == 1 and word.isalpha()):
                        break
                    candidates.pop()
                cut = start + candidates[-1] if candidates else preferred
        if cut <= start:
            raise ValueError('Cannot segment text')
        parts.append(text[start:cut])
        start = cut
    return parts


def check_cancel(cancel):
    if cancel.is_set():
        raise SynthesisCancelled()


def atomic_json(path, data):
    temporary = path.with_suffix('.json.partial')
    temporary.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    temporary.replace(path)


def decode_segment(audio, pcm, audio_format=(1, 24000)):
    # One bounded segment in memory; never decode the full book into RAM.
    decoded = miniaudio.decode_file(str(audio), output_format=miniaudio.SampleFormat.SIGNED16,
                                   nchannels=audio_format[0], sample_rate=audio_format[1])
    if not decoded.samples:
        raise ValueError('Audio segment is empty')
    with wave.open(str(pcm), 'wb') as target:
        target.setparams((audio_format[0], 2, audio_format[1], 0, 'NONE', 'not compressed'))
        target.writeframes(decoded.samples.tobytes())
    return len(decoded.samples) / audio_format[0] / audio_format[1]


def cues_from_srt(path, duration):
    if not path.exists():
        return []
    result = []
    for block in re.split(r'\n\s*\n', path.read_text(encoding='utf-8').strip()):
        lines = block.splitlines()
        if len(lines) < 3:
            raise ValueError('Invalid subtitle cue')
        match = re.fullmatch(r'(\d+):(\d{2}):(\d{2}),(\d{3}) --> (\d+):(\d{2}):(\d{2}),(\d{3})', lines[1])
        if not match:
            raise ValueError('Invalid subtitle time')
        values = list(map(int, match.groups()))
        def seconds(v):
            if v[1] > 59 or v[2] > 59:
                raise ValueError('Invalid subtitle time')
            return v[0]*3600 + v[1]*60 + v[2] + v[3]/1000
        start, end = seconds(values[:4]), seconds(values[4:])
        if not 0 <= start < end <= duration + .3 or (result and start < result[-1][0]):
            raise ValueError('Subtitle outside decoded audio timeline')
        result.append([start, end, '\n'.join(lines[2:])])
    return result


def valid_record(folder, index, part, required, audio_format=(1, 24000)):
    try:
        record = json.loads((folder / f'{index}.json').read_text(encoding='utf-8'))
        if record['text_sha256'] != hashlib.sha256(part.encode()).hexdigest():
            return None
        for suffix in ('mp3', 'wav'):
            if digest(folder / f'{index}.{suffix}') != record[suffix + '_sha256']:
                return None
        with wave.open(str(folder / f'{index}.wav'), 'rb') as pcm:
            duration = pcm.getnframes()/pcm.getframerate()
            if pcm.getparams()[:3] != (audio_format[0], 2, audio_format[1]) or duration <= 0:
                return None
        if abs(duration - record['duration']) > .001:
            return None
        if not math.isfinite(record['duration']):
            return None
        cues = record['cues']
        if required and not cues:
            return None
        last = -1
        for start, end, content in cues:
            if not (isinstance(start, (int, float)) and isinstance(end, (int, float)) and math.isfinite(start) and math.isfinite(end)):
                return None
            if not isinstance(content, str) or not content.strip() or not 0 <= start < end <= duration + .3 or start < last:
                return None
            last = start
        return record
    except (OSError, ValueError, KeyError, TypeError, OverflowError, wave.Error):
        return None


def find_ffmpeg(configured=''):
    value = configured.strip().strip('"') or os.environ.get('EDGE_TTS_FFMPEG', '') or shutil.which('ffmpeg')
    if not value or not Path(value).is_file():
        raise RuntimeError('Bài dài cần FFmpeg để ghép. Chọn ffmpeg.exe trong tab Xuất file.')
    return str(Path(value).resolve())


def merge_audio(folder, records, output, cancel, ffmpeg, audio_format=(1, 24000), bitrate='48k'):
    if len(records) == 1:
        shutil.copyfile(folder / '0.mp3', output)
        return
    merged = folder / 'merged.wav.partial'
    with wave.open(str(merged), 'wb') as target:
        target.setparams((audio_format[0], 2, audio_format[1], 0, 'NONE', 'not compressed'))
        for index in range(len(records)):
            with wave.open(str(folder / f'{index}.wav'), 'rb') as source:
                while True:
                    check_cancel(cancel)
                    frames = source.readframes(65536)
                    if not frames:
                        break
                    target.writeframesraw(frames)
    try:
        with tempfile.TemporaryFile() as errors:
            process = subprocess.Popen([ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin',
                '-y', '-i', str(merged), '-c:a', 'libmp3lame', '-b:a', bitrate, '-ar', str(audio_format[1]),
                '-ac', str(audio_format[0]), str(output)], stdout=subprocess.DEVNULL, stderr=errors,
                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            try:
                import time
                started = time.monotonic()
                # shortcut: fixed 30 minute merge ceiling; calibrate if measured long-book encoding needs more.
                while process.poll() is None:
                    check_cancel(cancel)
                    if time.monotonic() - started > 1800:
                        raise TimeoutError('FFmpeg ghép quá 30 phút; các đoạn đã tạo vẫn được giữ.')
                    cancel.wait(.1)
                if process.returncode:
                    raise RuntimeError('FFmpeg không ghép được MP3; kiểm tra encoder libmp3lame và ổ đĩa.')
            finally:
                if process.poll() is None:
                    process.kill()
                process.wait()
    finally:
        merged.unlink(missing_ok=True)


def stamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, rest = divmod(milliseconds, 3600000)
    minutes, rest = divmod(rest, 60000)
    secs, ms = divmod(rest, 1000)
    return f'{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}'


def merge_subtitles(records, output):
    offset, number, previous = 0.0, 0, -1.0
    with Path(output).open('w', encoding='utf-8') as target:
        for record in records:
            for start, end, content in record['cues']:
                start, end = offset + start, min(offset + end, offset + record['duration'])
                if start < previous or end <= start:
                    raise ValueError('Invalid merged subtitle timeline')
                previous = start
                number += 1
                target.write(f'{number}\n{stamp(start)} --> {stamp(end)}\n{content}\n\n')
            offset += record['duration']


async def run_sync(function, *args, on_cancel=None):
    # A cancelled coroutine must not delete files still owned by its thread.
    task = asyncio.create_task(asyncio.to_thread(function, *args))
    try:
        return await asyncio.shield(task)
    except asyncio.CancelledError:
        if on_cancel:
            on_cancel()
        while not task.done():
            try:
                await asyncio.shield(task)
            except asyncio.CancelledError:
                continue
            except Exception:
                break
        if not task.cancelled():
            task.exception()
        raise


class SegmentCancel:
    def __init__(self, parent):
        self.parent, self.local = parent, threading.Event()

    def is_set(self):
        return self.parent.is_set() or self.local.is_set()

    def wait(self, seconds):
        end = time.monotonic() + seconds
        while not self.is_set() and time.monotonic() < end:
            self.local.wait(min(.05, max(0, end-time.monotonic())))
        return self.is_set()


async def render_job(text, voice, rate, pitch, volume, audio, subtitle, cancel, log, stage,
                     checkpoint_root, progress, require_subtitles=True, ffmpeg='', workers=1,
                     source='edge', resource_id='', metrics=None):
    if source not in ('edge', 'capcut') or workers not in ((1, 2) if source == 'capcut' else (1, 2, 3)):
        raise ValueError('Invalid source or worker count')
    if not text.strip():
        raise ValueError('Empty script')
    if source == 'capcut':
        import capcut_engine
        match = next((v for v in capcut_engine.list_voices() if v['ShortName'] == voice), None)
        if not match or resource_id != match['ResourceId']:
            raise ValueError('CapCut voice/resource ID không khớp catalog; không đổi giọng.')
        if require_subtitles or pitch or volume or not -50 <= rate <= 100:
            raise ValueError('CapCut chưa hỗ trợ SRT/cao độ/âm lượng; tốc độ -50 đến 100%.')
        parts = split_text(text, 2000, characters=True, target=1800)
        engine_version = digest(capcut_engine.SDK / 'PROVENANCE.json')
    else:
        parts = split_text(text)
        engine_version = edge_tts.__version__
    config = [VERSION, source, engine_version, text, voice, resource_id, rate, pitch, volume]
    key = hashlib.sha256(json.dumps(config, ensure_ascii=False).encode()).hexdigest()
    folder = Path(checkpoint_root) / key
    if source == 'edge' and not folder.exists():
        old_config = [1, edge_tts.__version__, text, voice, rate, pitch, volume]
        old_key = hashlib.sha256(json.dumps(old_config, ensure_ascii=False).encode()).hexdigest()
        old_folder = Path(checkpoint_root) / old_key
        if old_folder.is_dir():
            folder, parts = old_folder, legacy_split_text(text)
            log('Tiếp tục checkpoint Edge phiên bản 1 với ranh giới đoạn cũ.')
    binary = find_ffmpeg(ffmpeg) if len(parts) > 1 else None
    folder.mkdir(parents=True, exist_ok=True)
    lock = (folder / 'active.lock').open('a+b')
    try:
        lock.seek(0)
        if os.name == 'nt':
            import msvcrt
            lock.write(b'0'); lock.flush(); lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        lock.close()
        raise RuntimeError('Job này đang chạy trong một cửa sổ khác.') from None
    records = [None] * len(parts)
    completed, active, actual_limit, cooldown = 0, 0, workers, 0.0
    audio_format = (1, 24000)
    loop = asyncio.get_running_loop()
    statistics = metrics if metrics is not None else {}
    statistics.update(source=source, workers_requested=workers, workers_final=workers,
                      segments=len(parts), reused=0, retries=0, throttles=0, segment_seconds=[])

    def throttled(delay):
        nonlocal actual_limit, cooldown
        actual_limit = 1
        cooldown = max(cooldown, time.monotonic() + delay)
        statistics['workers_final'] = 1
        statistics['throttles'] += 1
        log(f'{source}: HTTP 429; giảm còn 1 luồng; chờ {delay:.1f}s, không hủy các request đang chạy.')
        stage(f'Giới hạn dịch vụ — {active} request đang chạy; còn 1 luồng cho các đoạn tiếp theo')

    def capcut_throttle(delay):
        loop.call_soon_threadsafe(throttled, delay)

    def capcut_retry():
        loop.call_soon_threadsafe(count_retry)

    def count_retry():
        statistics['retries'] += 1

    async def wait_delay(delay):
        until = time.monotonic() + delay
        while time.monotonic() < until:
            check_cancel(cancel)
            await asyncio.sleep(min(.1, max(0, until-time.monotonic())))

    async def segment(index, part):
        nonlocal completed, active, audio_format
        while active >= actual_limit or time.monotonic() < cooldown:
            check_cancel(cancel)
            await asyncio.sleep(.05)
        check_cancel(cancel)
        active += 1
        owned = True
        started = time.perf_counter()
        def segment_stage(message):
            stage(f'{source} — đoạn {index+1}/{len(parts)} — {active}/{actual_limit} luồng: {message}')
        def segment_log(message):
            log(f'{source} — đoạn {index+1}/{len(parts)}: {message}')
        audio_part = folder / f'{index}.partial.mp3'
        subtitle_part = folder / f'{index}.partial.srt'
        pcm_part = folder / f'{index}.partial.wav'
        try:
            if source == 'capcut' and index == 0 and (folder/'0.mp3').exists():
                try:
                    info = await run_sync(miniaudio.mp3_get_file_info, str(folder/'0.mp3'))
                    if info.nchannels not in (1, 2) or not 8000 <= info.sample_rate <= 48000:
                        raise ValueError('Unsupported CapCut audio format')
                    audio_format = (info.nchannels, info.sample_rate)
                except (ValueError, miniaudio.DecodeError):
                    pass
            record = await run_sync(valid_record, folder, index, part, require_subtitles, audio_format)
            if record is None:
                # CapCut retries only polling/download inside its adapter, never task submission.
                for attempt in range(1 if source == 'capcut' else 3):
                    check_cancel(cancel)
                    for path in (audio_part, subtitle_part, pcm_part):
                        path.unlink(missing_ok=True)
                    segment_stage(f'Tạo âm thanh, lần {attempt+1}')
                    try:
                        if source == 'capcut':
                            segment_cancel = SegmentCancel(cancel)
                            def render_capcut():
                                return capcut_engine.render_speech(part, voice, rate, audio_part,
                                    segment_cancel, segment_log, segment_stage, resource_id=resource_id,
                                    on_throttle=capcut_throttle, on_retry=capcut_retry, verify_audio=False)
                            await run_sync(render_capcut, on_cancel=segment_cancel.local.set)
                            if index == 0:
                                info = await run_sync(miniaudio.mp3_get_file_info, str(audio_part))
                                if info.nchannels not in (1, 2) or not 8000 <= info.sample_rate <= 48000:
                                    raise ValueError('Unsupported CapCut audio format')
                                audio_format = (info.nchannels, info.sample_rate)
                        else:
                            await render_speech(part, voice, rate, pitch, volume, audio_part,
                                subtitle_part, cancel, segment_log, segment_stage,
                                require_subtitles=require_subtitles)
                        check_cancel(cancel)
                        segment_stage('Đang giải mã / kiểm tra đoạn')
                        def checkpoint():
                            duration = decode_segment(audio_part, pcm_part, audio_format)
                            cues = cues_from_srt(subtitle_part, duration) if require_subtitles else []
                            if require_subtitles and not cues:
                                raise ValueError('Missing subtitles')
                            result = dict(text_sha256=hashlib.sha256(part.encode()).hexdigest(),
                                duration=duration, cues=cues, mp3_sha256=digest(audio_part),
                                wav_sha256=digest(pcm_part))
                            check_cancel(cancel)
                            audio_part.replace(folder / f'{index}.mp3')
                            pcm_part.replace(folder / f'{index}.wav')
                            atomic_json(folder / f'{index}.json', result)
                            return result
                        checked = time.perf_counter()
                        record = await run_sync(checkpoint)
                        segment_log(f'Giải mã/checksum/lưu đoạn: {time.perf_counter()-checked:.3f}s.')
                        break
                    except (TimeoutError, aiohttp.ClientError, edge_tts.exceptions.NoAudioReceived) as exc:
                        if source == 'capcut':
                            raise
                        if isinstance(exc, aiohttp.ClientResponseError) and exc.status not in (408, 429, 500, 502, 503, 504):
                            raise RuntimeError(f'Edge HTTP {exc.status}; đoạn {index+1}, không đổi giọng.') from None
                        delay = 2**attempt
                        if isinstance(exc, aiohttp.ClientResponseError) and exc.status == 429:
                            delay = retry_after((exc.headers or {}).get('Retry-After'))
                            delay = delay if delay is not None else 2**attempt
                            throttled(delay)
                        if attempt == 2:
                            raise RuntimeError(f'Đoạn {index+1}/{len(parts)} lỗi {type(exc).__name__}; bấm Xuất MP3 lại để tiếp tục.') from None
                        count_retry()
                        segment_log(f'{type(exc).__name__}, thử lại sau {delay:.1f}s.')
                        active -= 1
                        owned = False
                        await wait_delay(delay)
                        # A retry also obeys a cooldown set by another running segment.
                        while active >= actual_limit or time.monotonic() < cooldown:
                            check_cancel(cancel)
                            await asyncio.sleep(.05)
                        active += 1
                        owned = True
            else:
                statistics['reused'] += 1
                segment_log('Dùng đoạn đã xác minh từ checkpoint.')
            records[index] = record
            completed += len(part)
            progress(completed / len(text) * 100, sum(r is not None for r in records), len(parts))
            statistics['segment_seconds'].append(round(time.perf_counter()-started, 3))
        except Exception as exc:
            if isinstance(exc, SynthesisCancelled):
                raise
            error = RuntimeError(f'{source} — đoạn {index+1}/{len(parts)}, voice={voice}: {exc}')
            error.segment_index = index + 1
            error.total_segments = len(parts)
            raise error from None
        finally:
            if owned:
                active -= 1
            for path in (audio_part, subtitle_part, pcm_part):
                path.unlink(missing_ok=True)

    tasks = []
    try:
        log(f'{source}: {len(parts)} đoạn; tối đa {workers} luồng; xuất lại để tiếp tục checkpoint.')
        progress(0, 0, len(parts))
        remaining = range(len(parts))
        if source == 'capcut':
            # The first segment fixes the PCM format even when later requests finish first.
            await segment(0, parts[0])
            remaining = range(1, len(parts))
        tasks = [asyncio.create_task(segment(i, parts[i])) for i in remaining]
        await asyncio.gather(*tasks)
        check_cancel(cancel)
        stage('Đang ghép audio; nội dung đã tổng hợp xong')
        started = time.perf_counter()
        await run_sync(merge_audio, folder, records, audio, cancel, binary, audio_format,
                       '128k' if source == 'capcut' else '48k', on_cancel=cancel.set)
        statistics['merge_seconds'] = round(time.perf_counter()-started, 3)
        log(f'Ghép/encode: {statistics["merge_seconds"]:.3f}s.')
        check_cancel(cancel)
        info = await run_sync(miniaudio.mp3_get_file_info, str(audio))
        expected = sum(r['duration'] for r in records)
        if info.duration <= 0 or abs(info.duration - expected) > .3:
            raise RuntimeError('Thời lượng MP3 ghép không khớp các đoạn đã giải mã.')
        if require_subtitles:
            await run_sync(merge_subtitles, records, subtitle)
        statistics['duration_seconds'] = info.duration
        log(f'Đã kiểm tra MP3: {info.duration:.3f}s; chờ lưu đầu ra.')
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        lock.close()


def publish_files(pairs):
    """Journal the pair so interrupted publication can recover on the next export."""
    pairs = [(Path(src), Path(dst).resolve()) for src, dst in pairs]
    targets = [str(dst) for _, dst in pairs]
    key = hashlib.sha256(json.dumps(targets).encode()).hexdigest()
    backup = pairs[0][1].parent / ('.tts-publish-' + key)
    backup.mkdir(exist_ok=True)
    journal = backup / 'journal.json'

    def restore(state):
        if state['targets'] != targets:
            raise RuntimeError('Publication journal does not match requested files')
        for index, (_, dst) in enumerate(pairs):
            if state['existed'][index]:
                saved = backup / str(index)
                if not saved.is_file() or digest(saved) != state['checksums'][index]:
                    raise RuntimeError(f'Backup không hợp lệ; giữ dữ liệu phục hồi tại {backup}')
                shutil.copyfile(saved, dst)
            else:
                dst.unlink(missing_ok=True)

    if journal.exists():
        state = json.loads(journal.read_text(encoding='utf-8'))
        if state.get('committed') is not True:
            restore(state)
    existed, checksums = [], []
    for index, (_, dst) in enumerate(pairs):
        saved = backup / str(index)
        exists = dst.exists()
        existed.append(exists)
        if exists:
            shutil.copyfile(dst, saved)
            checksums.append(digest(saved))
        else:
            checksums.append(None)
    state = dict(targets=targets, existed=existed, checksums=checksums, committed=False)
    atomic_json(journal, state)
    published = False
    try:
        for src, dst in pairs:
            src.replace(dst)
        state['committed'] = True
        atomic_json(journal, state)
        published = True
    except OSError:
        try:
            restore(state)
        except (OSError, RuntimeError):
            raise RuntimeError(f'Không khôi phục được đầu ra; giữ bản cũ tại {backup}') from None
        raise
    finally:
        # Keep the journal on failure, including abrupt process exit, for next export recovery.
        if published:
            shutil.rmtree(backup)
    # shortcut: recovery is on next export of the same MP3/SRT pair; no claim of instant crash atomicity or fsync power-loss durability.
