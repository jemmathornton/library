"""Safe saving for the scripts (review, 9 Nov): everything is written to a temporary file beside the real one, then
swapped in, so a crash or a full disk never leaves half a file (half a JSON file stops every build; half a picture
did too). Windows refuses the swap while something is reading the file, so it tries again for a moment."""
import json, os, threading, time


def _swap(tmp, path):
    for n in range(10):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            time.sleep(.2)
    os.replace(tmp, path)


def write_json(path, obj, indent=1):
    tmp = f'{path}.{os.getpid()}-{threading.get_ident()}.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=indent)
        fh.write('\n')
        fh.flush(); os.fsync(fh.fileno())   # on the disk before the swap: a power cut can't leave an empty file (15 Nov)
    _swap(tmp, path)


def save_jpeg(img, path, **kw):
    tmp = f'{path}.{os.getpid()}-{threading.get_ident()}.tmp'
    img.save(tmp, 'JPEG', **kw)
    _swap(tmp, path)
