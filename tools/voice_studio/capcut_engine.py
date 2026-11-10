"""CapCut SDK adapter, using the catalog and download rules from BBS FS."""
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import urlparse

from tts_engine import SynthesisCancelled, retry_after

SDK = Path(__file__).resolve().parent / 'vendor' / 'capcut-tts-api'
sys.path.insert(0, str(SDK))
from capcut_tts_api import CapCutClient
from capcut_tts_api.exceptions import CapCutAPIError
import requests


# shortcut: hủy chờ HTTP hiện tại kết thúc; dùng async transport nếu cần ngắt kết nối tức thì.
class BoundedSession(requests.Session):
    def request(self, method, url, **kwargs):
        kwargs['timeout'] = (8, 15)
        kwargs['allow_redirects'] = False
        response = super().request(method, url, **kwargs)
        self.last_retry_after = retry_after(response.headers.get('Retry-After'))
        return response


class CapCutHTTPError(RuntimeError):
    def __init__(self, status):
        self.status_code = status
        super().__init__(f'CapCut tải audio lỗi HTTP {status}.')


def list_voices():
    client = CapCutClient()
    try:
        voices = client.list_voices()
    finally:
        if client.session is not None:
            client.session.close()
    result = []
    for v in voices:
        # BBS routes these two catalog entries through Edge, never CapCut.
        if v.lang.split('-')[0].lower() not in ('en', 'vi') or v.voice_type in ('vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'):
            continue
        # Removed at the user's request after the short API audit failed.
        if v.voice_type in ('en-US-JennyMultilingualNeural', 'en'):
            continue
        if not v.voice_type or not v.resource_id or not v.display_name:
            raise ValueError('Catalog CapCut thiếu ID hoặc tên giọng.')
        result.append(dict(ShortName=v.voice_type, DisplayName=v.display_name.strip(),
                           Locale=v.lang, Gender='Unknown', ResourceId=v.resource_id))
    if not result:
        raise ValueError('Không có giọng CapCut Anh/Việt trong catalog.')
    return result


def urls(value):
    # Reused from BBS voice/generate.py; reject ambiguous results below.
    if isinstance(value, dict):
        return [u for v in value.values() for u in urls(v)]
    if isinstance(value, list):
        return [u for v in value for u in urls(v)]
    if isinstance(value, str) and value.startswith('https://'):
        return [value]
    if isinstance(value, str) and value.startswith(('{', '[')):
        try:
            return urls(json.loads(value))
        except ValueError:
            pass
    return []


def audio_url(task):
    candidates = urls(task)
    if len(candidates) != 1:
        raise RuntimeError('CapCut chưa trả một URL âm thanh xác định duy nhất.')
    url = candidates[0]
    try:
        parsed = urlparse(url)
        port = parsed.port
    except ValueError:
        raise RuntimeError('Địa chỉ tải audio CapCut không hợp lệ.') from None
    allowed = ('byteoversea.com', 'ibytedtos.com', 'capcut.com', 'capcutapi.com', 'ibyteimg.com', 'tiktokcdn.com')
    host = parsed.hostname or ''
    if parsed.scheme != 'https' or parsed.username or parsed.password or port not in (None, 443) or not any(host == h or host.endswith('.' + h) for h in allowed):
        raise RuntimeError('Địa chỉ tải audio CapCut không thuộc host được phép.')
    return url


def render_speech(text, voice, rate, audio, cancel, log, stage, timeout=120, *,
                  resource_id=None, on_throttle=lambda delay: None,
                  on_retry=lambda: None, verify_audio=True):
    import miniaudio
    if not isinstance(text, str) or not text.strip() or len(text) > 2000:
        raise ValueError('CapCut nhận 1–2000 ký tự mỗi lần; hãy chia kịch bản dài.')
    if not -50 <= rate <= 100:
        raise ValueError('Tốc độ CapCut từ -50 đến 100% (0.5–2 lần).')
    match = next((v for v in list_voices() if v['ShortName'] == voice), None)
    if match is None:
        raise ValueError('Không tìm thấy voice ID CapCut; không thay bằng giọng khác.')
    if resource_id is not None and resource_id != match['ResourceId']:
        raise ValueError('CapCut resource ID không khớp giọng đã chọn.')
    deadline = time.monotonic() + timeout
    def check():
        if cancel.is_set():
            raise SynthesisCancelled()
        if time.monotonic() >= deadline:
            raise TimeoutError('CapCut quá thời gian xử lý; hãy thử lại sau.')
    with BoundedSession() as session:
        def wait(seconds):
            end = time.monotonic() + seconds
            while time.monotonic() < end:
                check()
                if cancel.wait(min(.1, max(0, end-time.monotonic()))):
                    raise SynthesisCancelled()

        def notify_throttle(exc, fallback):
            status = getattr(exc, 'status_code', 0)
            delay = getattr(session, 'last_retry_after', None)
            delay = delay if isinstance(delay, (int, float)) else fallback
            if status == 429:
                on_throttle(delay)
            return delay if status == 429 else fallback

        def retry_existing(operation, label):
            for attempt in range(3):
                check()
                started = time.perf_counter()
                try:
                    result = operation()
                    log(f'{label}: {time.perf_counter()-started:.3f}s.')
                    return result
                except (requests.RequestException, CapCutAPIError, CapCutHTTPError) as exc:
                    status = getattr(exc, 'status_code', 0)
                    delay = notify_throttle(exc, 2**attempt)
                    if status and status not in (408, 429, 500, 502, 503, 504):
                        raise RuntimeError(f'CapCut {label} lỗi HTTP {status}; không đổi nguồn hoặc giọng.') from None
                    if attempt == 2:
                        raise RuntimeError(f'CapCut {label} lỗi {type(exc).__name__} sau 3 lần; không tạo lại task.') from None
                    on_retry()
                    log(f'{label}: retry {attempt+1}/2 sau {delay:.1f}s, giữ nguyên task.')
                    wait(delay)
        try:
            client = CapCutClient(device=os.environ.get('TTS_CAPCUT_DEVICE_CONFIG') or None, session=session)
            check()
            stage('Đang tạo tác vụ CapCut')
            started = time.perf_counter()
            # A timed-out create request may already exist remotely; never resubmit it automatically.
            result = client.create_tts_task(texts=text, voice=voice, resource_id=match['ResourceId'], rate=str(1 + rate / 100))
            log(f'Tạo task: {time.perf_counter()-started:.3f}s.')
            tasks = (result.get('data') or {}).get('tasks') or []
            if len(tasks) != 1 or not tasks[0].get('id') or not tasks[0].get('token'):
                raise RuntimeError('CapCut không trả tác vụ hợp lệ.')
            task_id, token = tasks[0]['id'], tasks[0]['token']
            stage('Đang chờ âm thanh CapCut')
            started = time.perf_counter()
            while True:
                check()
                result = retry_existing(lambda: client.query_tts_task(task_id, token), 'Poll')
                check()
                tasks = (result.get('data') or {}).get('tasks') or []
                if len(tasks) != 1:
                    raise RuntimeError('CapCut trả trạng thái tác vụ không hợp lệ.')
                task = tasks[0]
                if task.get('status') == 'failed':
                    log(f"CapCut | voice={voice} | resource={match['ResourceId']} | status=failed; không log payload/token.")
                    raise RuntimeError('CapCut báo tác vụ thất bại; không đổi nguồn hoặc giọng.')
                if task.get('status') in ('success', 'succeed'):
                    break
                if cancel.wait(1):
                    raise SynthesisCancelled()
            log(f'Chờ task hoàn tất: {time.perf_counter()-started:.3f}s.')
            stage('Đang tải và kiểm tra MP3 CapCut')
            url = audio_url(task)
            def download():
                total = 0
                with session.get(url, stream=True) as response:
                    if response.status_code != 200:
                        raise CapCutHTTPError(response.status_code)
                    try:
                        length = int(response.headers.get('Content-Length', '0'))
                    except (ValueError, TypeError):
                        raise RuntimeError('CapCut Content-Length không hợp lệ.') from None
                    if length < 0:
                        raise RuntimeError('CapCut Content-Length không hợp lệ.')
                    if length > 20_000_000:
                        raise RuntimeError('Audio CapCut vượt giới hạn 20 MB.')
                    with Path(audio).open('wb') as target:
                        for chunk in response.iter_content(64 * 1024):
                            check()
                            total += len(chunk)
                            if total > 20_000_000:
                                raise RuntimeError('Audio CapCut vượt giới hạn 20 MB.')
                            target.write(chunk)
                return total
            total = retry_existing(download, 'Tải audio')
            check()
            if not total:
                raise RuntimeError('CapCut trả file âm thanh rỗng.')
            info = miniaudio.mp3_get_file_info(str(audio))
            if not 0 < info.duration <= 600:
                raise RuntimeError("MP3 CapCut phải có thời lượng từ 0 đến 600 giây.")
            started = time.perf_counter()
            if verify_audio:
                decoded = miniaudio.decode_file(str(audio), nchannels=1, sample_rate=16000)
                duration = decoded.num_frames / decoded.sample_rate
            else:
                duration = info.duration
            if duration <= 0:
                raise RuntimeError('MP3 CapCut không có thời lượng hợp lệ.')
            check()
            log(f'CapCut | {voice} | kiểm tra {time.perf_counter()-started:.3f}s | {duration:.2f}s | {total:,} byte.')
            return duration
        except requests.RequestException as exc:
            raise RuntimeError(f'CapCut lỗi mạng {type(exc).__name__}; không đổi nguồn hoặc giọng.') from None
        except CapCutAPIError as exc:
            notify_throttle(exc, 1)
            raise RuntimeError(f'CapCut tạo task lỗi HTTP {exc.status_code}; không tự gửi lại vì chưa rõ server đã nhận hay chưa.') from None
        except (SynthesisCancelled, TimeoutError, ValueError, RuntimeError):
            raise
        except Exception as exc:
            # SDK exceptions may contain task tokens, signed URLs or submitted text.
            raise RuntimeError(f'CapCut lỗi {type(exc).__name__}; kiểm tra dịch vụ/cấu hình, không đổi nguồn.') from None
