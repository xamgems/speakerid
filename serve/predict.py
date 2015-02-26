import pyaudio

from functools import reduce
from itertools import zip_longest

import wave
import numpy as np
from features import mfcc
from sklearn import mixture
import scipy.io.wavfile as wav

GMM_CLUSTERS = 6

def play(wav_filename):
    wav_info = wave.open(wav_filename, 'r')
    rate, data = wav.read(wav_filename, 'r')
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

def learn(wav_filename, old_data=None):
    rate, signal = wav.read(wav_filename, 'r')
    mfcc_feat = mfcc(signal, rate)
    if not old_data == None:
        mfcc_feat = np.concatenate((mfcc_feat, old_data))

    gmm = mixture.GMM(GMM_CLUSTERS)
    gmm.fit(mfcc_feat)
    return gmm, mfcc_feat
