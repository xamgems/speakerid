import pyaudio

from functools import reduce
from itertools import zip_longest

import numpy as np
from features import mfcc
from sklearn import mixture
import scipy.io.wavfile as wav

GMM_CLUSTERS = 6

def play(wav_info, rate, data):
    p = pyaudio.PyAudio()
    astream = p.open(format=p.get_format_from_width(wav_info.getsampwidth()),
        channels=wav_info.getnchannels(),
        rate=rate,
        output=True)

    wav_info.close()
    wav_chunks = grouper(data, 1024, np.uint8(0))

    for frames in wav_chunks:
        wav_bytes = reduce(lambda x, y: x + y, [f.tostring() for f in frames])
        astream.write(wav_bytes)

    astream.stop_stream()
    astream.close()

def grouper(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return zip_longest(fillvalue=fillvalue, *args)

def learn(wav_filename):
    signal, rate = wav.read(wav_filename, 'r')
    mfcc_feat = mfcc(rate, signal)
    gmm = mixture.GMM(GMM_CLUSTERS)
    gmm.fit(mfcc_feat)
    return gmm
